from typing import Any, Dict, List, Tuple

from sqlalchemy.orm import Session

from .models import ImportBatch, Transaction


def process_import(
    db: Session,
    account_id: str,
    source_type: str,
    filename: str,
    parser_version: str,
    parsed_transactions: List[Dict[str, Any]],
) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Processes imported transactions, applying exact deduplication rules.
    Returns (inserted_count, collisions)
    """
    batch = ImportBatch(
        account_id=account_id,
        source_type=source_type,
        filename=filename,
        parser_version=parser_version,
    )
    db.add(batch)
    db.flush()  # Get batch.id

    inserted_count = 0
    collisions = []

    for pt in parsed_transactions:
        # Exact Deduplication Check (date, amount, description)
        exists = (
            db.query(Transaction)
            .filter(
                Transaction.account_id == account_id,
                Transaction.transaction_date == pt["transaction_date"],
                Transaction.amount_minor_units == pt["amount_minor_units"],
                Transaction.raw_description == pt["raw_description"],
            )
            .first()
        )

        if exists:
            collisions.append(
                {
                    "existing_id": exists.id,
                    "transaction": {
                        "date": pt["transaction_date"].isoformat(),
                        "amount": pt["amount_minor_units"],
                        "description": pt["raw_description"],
                    },
                }
            )
            continue

        txn = Transaction(
            account_id=account_id,
            import_batch_id=batch.id,
            transaction_date=pt["transaction_date"],
            amount_minor_units=pt["amount_minor_units"],
            currency_code=pt.get("currency_code", "USD"),
            counterparty=pt.get("counterparty", "Unknown"),
            raw_description=pt.get("raw_description", ""),
            raw_row_data=pt.get("raw_row_data", {}),
        )
        db.add(txn)
        inserted_count += 1

    db.commit()
    return inserted_count, collisions
