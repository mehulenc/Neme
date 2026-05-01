import datetime
import uuid

from sqlalchemy import JSON, Column, Date, DateTime, Float, ForeignKey, Integer, String

from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    institution = Column(String, nullable=False)
    currency_code = Column(String, nullable=False, default="USD")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(String, primary_key=True, default=generate_uuid)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    source_type = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    parser_version = Column(String, nullable=False)
    imported_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    import_batch_id = Column(String, ForeignKey("import_batches.id"), nullable=False)
    transaction_date = Column(Date, nullable=False)
    amount_minor_units = Column(Integer, nullable=False)
    currency_code = Column(String, nullable=False, default="USD")
    counterparty = Column(String, nullable=False)
    raw_description = Column(String, nullable=False)
    raw_row_data = Column(JSON, nullable=False)
    status = Column(
        String, nullable=False, default="UNMATCHED"
    )  # UNMATCHED, MATCHED, PERSONAL, IGNORED
    notes = Column(String, nullable=True)


class SplitwiseExpense(Base):
    __tablename__ = "splitwise_expenses"

    id = Column(String, primary_key=True)  # Splitwise ID
    expense_date = Column(Date, nullable=False)
    total_amount_minor_units = Column(Integer, nullable=False)
    currency_code = Column(String, nullable=False, default="USD")
    description = Column(String, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    status = Column(
        String, nullable=False, default="UNMATCHED"
    )  # UNMATCHED, MATCHED, IGNORED


class ReconciliationLink(Base):
    __tablename__ = "reconciliation_links"

    id = Column(String, primary_key=True, default=generate_uuid)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False)
    splitwise_expense_id = Column(
        String, ForeignKey("splitwise_expenses.id"), nullable=False
    )
    mapped_amount_minor_units = Column(Integer, nullable=False)
    link_type = Column(String, nullable=False)  # manual, suggested
    status = Column(
        String, nullable=False, default="ACTIVE"
    )  # ACTIVE, STALE_REVIEW_REQUIRED
