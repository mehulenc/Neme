import datetime

from dateutil import parser
from sqlalchemy.orm import Session

from .models import ReconciliationLink, SplitwiseExpense, SystemSetting, Transaction
from .splitwise import SplitwiseClient


async def sync_splitwise_expenses(db: Session, since_date: Optional[str] = None):
    # 1. Determine sync parameters
    sync_params = {}
    if since_date:
        # If a specific date is requested, we fetch based on expense date
        sync_params["dated_after"] = since_date
    # NOTE: User requested to "fetch all always" by default,
    # so we no longer strictly rely on 'updated_after' incremental sync
    # unless specifically requested by logic (omitted here to satisfy request).

    client = SplitwiseClient()
    try:
        expenses = await client.get_expenses(**sync_params)

        for exp in expenses:
            expense_id = str(exp["id"])
            is_deleted = exp.get("deleted_at") is not None

            # Find existing expense locally
            local_exp = (
                db.query(SplitwiseExpense)
                .filter(SplitwiseExpense.id == expense_id)
                .first()
            )

            if is_deleted:
                if local_exp:
                    # Remote deletion: cascade to reconciliation links
                    links = (
                        db.query(ReconciliationLink)
                        .filter(ReconciliationLink.splitwise_expense_id == expense_id)
                        .all()
                    )
                    for link in links:
                        # Revert transaction status
                        transaction = (
                            db.query(Transaction)
                            .filter(Transaction.id == link.transaction_id)
                            .first()
                        )
                        if transaction:
                            transaction.status = "UNMATCHED"
                        db.delete(link)

                    db.delete(local_exp)
                continue

            # It's an upsert
            expense_date = parser.parse(exp["date"]).date()
            cost_amount = int(float(exp["cost"]) * 100)  # Convert to minor units
            currency_code = exp["currency_code"]
            description = exp["description"]
            updated_at = parser.parse(exp["updated_at"]).replace(tzinfo=None)
            users_data = exp.get("users", [])

            if local_exp:
                # Check for core field changes that trigger conflict resolution
                if (
                    local_exp.total_amount_minor_units != cost_amount
                    or local_exp.expense_date != expense_date
                ):

                    # Flag active links as stale
                    links = (
                        db.query(ReconciliationLink)
                        .filter(
                            ReconciliationLink.splitwise_expense_id == expense_id,
                            ReconciliationLink.status == "ACTIVE",
                        )
                        .all()
                    )

                    for link in links:
                        link.status = "STALE_REVIEW_REQUIRED"

                # Update the local mirror
                local_exp.expense_date = expense_date
                local_exp.total_amount_minor_units = cost_amount
                local_exp.currency_code = currency_code
                local_exp.description = description
                local_exp.updated_at = updated_at
                local_exp.users_data = users_data
            else:
                # Insert new expense
                new_exp = SplitwiseExpense(
                    id=expense_id,
                    expense_date=expense_date,
                    total_amount_minor_units=cost_amount,
                    currency_code=currency_code,
                    description=description,
                    updated_at=updated_at,
                    status="UNMATCHED",
                    users_data=users_data,
                )
                db.add(new_exp)

        # Update last sync timestamp
        now_str = datetime.datetime.utcnow().isoformat() + "Z"
        if not last_sync_setting:
            last_sync_setting = SystemSetting(key="last_splitwise_sync", value=now_str)
            db.add(last_sync_setting)
        else:
            last_sync_setting.value = now_str

        db.commit()
        return len(expenses)
    except Exception as e:
        db.rollback()
        raise e
    finally:
        await client.close()
