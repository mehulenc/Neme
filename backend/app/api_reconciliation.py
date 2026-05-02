import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import database, models

router = APIRouter(prefix="/api/reconciliation", tags=["Reconciliation"])


@router.get("/data")
def get_dashboard_data(db: Session = Depends(database.get_db)):
    # Fetch recent transactions and expenses regardless of status
    transactions = (
        db.query(models.Transaction)
        .order_by(models.Transaction.transaction_date.desc())
        .limit(300)
        .all()
    )
    expenses = (
        db.query(models.SplitwiseExpense)
        .order_by(models.SplitwiseExpense.expense_date.desc())
        .limit(300)
        .all()
    )

    return {"transactions": transactions, "expenses": expenses}


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
