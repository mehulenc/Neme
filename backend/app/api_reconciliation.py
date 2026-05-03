import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from . import database, models
from .heuristics import compute_suggestions

router = APIRouter(prefix="/api/reconciliation", tags=["Reconciliation"])


@router.get("/data")
def get_dashboard_data(db: Session = Depends(database.get_db)):
    # Fetch recent transactions and expenses regardless of status
    transactions = (
        db.query(models.Transaction)
        .options(joinedload(models.Transaction.account))
        .order_by(models.Transaction.transaction_date.asc())
        .limit(300)
        .all()
    )

    # Transform transactions to include account info in the response
    transaction_list = []
    for t in transactions:
        t_dict = {c.name: getattr(t, c.name) for c in t.__table__.columns}
        t_dict["institution"] = t.account.institution if t.account else "Unknown"
        transaction_list.append(t_dict)

    expenses = (
        db.query(models.SplitwiseExpense)
        .order_by(models.SplitwiseExpense.expense_date.asc())
        .limit(300)
        .all()
    )

    # Compute heuristic suggestions for unmatched items
    suggested_matches = compute_suggestions(db)

    # Get the current user's Splitwise ID for frontend context
    user_id_setting = (
        db.query(models.SystemSetting)
        .filter(models.SystemSetting.key == "splitwise_user_id")
        .first()
    )
    splitwise_user_id = user_id_setting.value if user_id_setting else None

    # Fetch active reconciliation links
    links = (
        db.query(models.ReconciliationLink)
        .filter(models.ReconciliationLink.status == "ACTIVE")
        .all()
    )

    return {
        "transactions": transaction_list,
        "expenses": expenses,
        "suggested_matches": suggested_matches,
        "splitwise_user_id": splitwise_user_id,
        "links": links,
    }


class LinkRequest(BaseModel):
    transaction_ids: List[str]
    splitwise_expense_id: str


@router.post("/link")
def link_records(req: LinkRequest, db: Session = Depends(database.get_db)):
    expense = (
        db.query(models.SplitwiseExpense)
        .filter(models.SplitwiseExpense.id == req.splitwise_expense_id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Splitwise expense not found")

    transactions = (
        db.query(models.Transaction)
        .filter(models.Transaction.id.in_(req.transaction_ids))
        .all()
    )
    if not transactions or len(transactions) != len(req.transaction_ids):
        raise HTTPException(
            status_code=404, detail="One or more transactions not found"
        )

    for txn in transactions:
        link = models.ReconciliationLink(
            transaction_id=txn.id,
            splitwise_expense_id=expense.id,
            mapped_amount_minor_units=abs(txn.amount_minor_units),
            link_type="manual",
        )
        db.add(link)
        txn.status = "MATCHED"

    expense.status = "MATCHED"
    db.commit()
    return {"status": "success"}


class StatusUpdateRequest(BaseModel):
    status: str


@router.post("/transactions/{id}/status")
def update_transaction_status(
    id: str, req: StatusUpdateRequest, db: Session = Depends(database.get_db)
):
    valid_statuses = ["UNMATCHED", "PERSONAL", "IGNORED"]
    if req.status not in valid_statuses:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}"
        )

    txn = db.query(models.Transaction).filter(models.Transaction.id == id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    txn.status = req.status
    db.commit()
    return {"status": "success"}


class TransactionUpdateRequest(BaseModel):
    counterparty: str
    transaction_date: str
    amount_minor_units: int


@router.patch("/transactions/{id}")
def update_transaction(
    id: str, req: TransactionUpdateRequest, db: Session = Depends(database.get_db)
):
    txn = db.query(models.Transaction).filter(models.Transaction.id == id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    txn.counterparty = req.counterparty
    txn.transaction_date = datetime.datetime.strptime(
        req.transaction_date, "%Y-%m-%d"
    ).date()
    txn.amount_minor_units = req.amount_minor_units
    txn.is_edited = True
    db.commit()
    return {"status": "success"}


class SplitwiseUserShare(BaseModel):
    user_id: int
    paid_share: str
    owed_share: str


class QuickCreateRequest(BaseModel):
    transaction_id: str
    cost: str
    description: str
    date: str
    group_id: int = 0
    users: List[SplitwiseUserShare]


@router.post("/quick-create")
async def quick_create_expense(
    req: QuickCreateRequest, db: Session = Depends(database.get_db)
):
    from .splitwise import SplitwiseClient
    from .sync import sync_splitwise_expenses

    txn = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == req.transaction_id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    payload = {
        "cost": req.cost,
        "description": req.description,
        "date": req.date,
        "group_id": req.group_id,
    }

    for i, user in enumerate(req.users):
        payload[f"users__{i}__user_id"] = user.user_id
        payload[f"users__{i}__paid_share"] = user.paid_share
        payload[f"users__{i}__owed_share"] = user.owed_share

    client = SplitwiseClient()
    try:
        created_expenses = await client.create_expense(payload)
        if not created_expenses:
            raise HTTPException(
                status_code=500, detail="Failed to create expense in Splitwise"
            )

        new_expense_id = str(created_expenses[0]["id"])

        # Trigger local sync
        await sync_splitwise_expenses(db)

        local_exp = (
            db.query(models.SplitwiseExpense)
            .filter(models.SplitwiseExpense.id == new_expense_id)
            .first()
        )
        if not local_exp:
            raise HTTPException(
                status_code=500, detail="Expense created but failed to sync locally"
            )

        # Create auto-link
        link = models.ReconciliationLink(
            transaction_id=txn.id,
            splitwise_expense_id=local_exp.id,
            mapped_amount_minor_units=abs(txn.amount_minor_units),
            link_type="quick_create",
        )
        db.add(link)

        txn.status = "MATCHED"
        local_exp.status = "MATCHED"
        db.commit()

        return {"status": "success", "expense_id": local_exp.id}
    finally:
        await client.close()


@router.get("/conflicts")
def get_conflicts(db: Session = Depends(database.get_db)):
    # Fetch links that require review
    links = (
        db.query(models.ReconciliationLink)
        .filter(models.ReconciliationLink.status == "STALE_REVIEW_REQUIRED")
        .all()
    )

    results = []
    for link in links:
        txn = (
            db.query(models.Transaction)
            .filter(models.Transaction.id == link.transaction_id)
            .first()
        )
        exp = (
            db.query(models.SplitwiseExpense)
            .filter(models.SplitwiseExpense.id == link.splitwise_expense_id)
            .first()
        )
        if txn and exp:
            results.append(
                {
                    "link_id": link.id,
                    "transaction": txn,
                    "expense": exp,
                    "mapped_amount_minor_units": link.mapped_amount_minor_units,
                }
            )

    return {"conflicts": results}


class ResolveConflictRequest(BaseModel):
    action: str  # "APPROVE" or "DISMISS"


@router.post("/links/{link_id}/resolve")
def resolve_conflict(
    link_id: str, req: ResolveConflictRequest, db: Session = Depends(database.get_db)
):
    link = (
        db.query(models.ReconciliationLink)
        .filter(models.ReconciliationLink.id == link_id)
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    if req.action == "APPROVE":
        # Simply set status back to ACTIVE.
        # Optionally we could update mapped_amount if it was a partial match that changed,
        # but for now we assume the user just wants to re-validate the link.
        link.status = "ACTIVE"
    elif req.action == "DISMISS":
        # Delete the link and reset status of txn/exp if they have no other active links
        txn_id = link.transaction_id
        exp_id = link.splitwise_expense_id

        db.delete(link)
        db.commit()  # Commit deletion first so count check is accurate

        # Check if transaction still has other active links
        other_txn_links = (
            db.query(models.ReconciliationLink)
            .filter(
                models.ReconciliationLink.transaction_id == txn_id,
                models.ReconciliationLink.status == "ACTIVE",
            )
            .count()
        )
        if other_txn_links == 0:
            txn = (
                db.query(models.Transaction)
                .filter(models.Transaction.id == txn_id)
                .first()
            )
            if txn:
                txn.status = "UNMATCHED"

        # Check if expense still has other active links
        other_exp_links = (
            db.query(models.ReconciliationLink)
            .filter(
                models.ReconciliationLink.splitwise_expense_id == exp_id,
                models.ReconciliationLink.status == "ACTIVE",
            )
            .count()
        )
        if other_exp_links == 0:
            exp = (
                db.query(models.SplitwiseExpense)
                .filter(models.SplitwiseExpense.id == exp_id)
                .first()
            )
            if exp:
                exp.status = "UNMATCHED"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()
    return {"status": "success"}


class ExpenseUpdateRequest(BaseModel):
    description: str
    cost: str
    date: str
    group_id: int = 0
    users: List[SplitwiseUserShare]


@router.patch("/expenses/{id}")
async def update_expense(
    id: str, req: ExpenseUpdateRequest, db: Session = Depends(database.get_db)
):
    from .splitwise import SplitwiseClient
    from .sync import sync_splitwise_expenses

    exp = (
        db.query(models.SplitwiseExpense)
        .filter(models.SplitwiseExpense.id == id)
        .first()
    )
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    payload = {
        "description": req.description,
        "cost": req.cost,
        "date": req.date,
        "group_id": req.group_id,
    }

    for i, user in enumerate(req.users):
        payload[f"users__{i}__user_id"] = user.user_id
        payload[f"users__{i}__paid_share"] = user.paid_share
        payload[f"users__{i}__owed_share"] = user.owed_share

    client = SplitwiseClient()
    try:
        await client.update_expense(id, payload)
        # Trigger local sync
        await sync_splitwise_expenses(db)
        return {"status": "success"}
    finally:
        await client.close()
