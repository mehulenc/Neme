import datetime
import os
import random
import sys
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to sys.path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models import (
    Account,
    ImportBatch,
    ReconciliationLink,
    SplitwiseExpense,
    Transaction,
)

# Configuration
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test.db"))
DB_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def generate_uuid():
    return str(uuid.uuid4())


def seed():
    # Remove existing test.db if it exists
    if os.path.exists("./test.db"):
        os.remove("./test.db")

    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Create Accounts
        hsbc_acc = Account(
            id=generate_uuid(),
            name="HSBC Premier Checking",
            institution="HSBC Bank",
            currency_code="INR",
        )
        db.add(hsbc_acc)

        # 2. Create Import Batch
        batch = ImportBatch(
            id=generate_uuid(),
            account_id=hsbc_acc.id,
            source_type="HSBC",
            filename="statement_may_2024.csv",
            parser_version="1.0.0",
        )
        db.add(batch)
        db.commit()

        # 3. Create Transactions (Bank)
        bank_txns = [
            Transaction(
                id=generate_uuid(),
                account_id=hsbc_acc.id,
                import_batch_id=batch.id,
                transaction_date=datetime.date(2024, 5, 1),
                amount_minor_units=-125000,  # -1250.00
                currency_code="INR",
                counterparty="Swiggy",
                raw_description="SWIGGY*ORDER_12345",
                raw_row_data={"raw": "data"},
                status="UNMATCHED",
            ),
            Transaction(
                id=generate_uuid(),
                account_id=hsbc_acc.id,
                import_batch_id=batch.id,
                transaction_date=datetime.date(2024, 5, 2),
                amount_minor_units=-45000,  # -450.00
                currency_code="INR",
                counterparty="Uber India",
                raw_description="UBER*TRIP_XYZ",
                raw_row_data={"raw": "data"},
                status="UNMATCHED",
            ),
            Transaction(
                id=generate_uuid(),
                account_id=hsbc_acc.id,
                import_batch_id=batch.id,
                transaction_date=datetime.date(2024, 5, 3),
                amount_minor_units=-89900,  # -899.00
                currency_code="INR",
                counterparty="Netflix",
                raw_description="NETFLIX.COM",
                raw_row_data={"raw": "data"},
                status="UNMATCHED",
            ),
            Transaction(
                id=generate_uuid(),
                account_id=hsbc_acc.id,
                import_batch_id=batch.id,
                transaction_date=datetime.date(2024, 5, 4),
                amount_minor_units=-150000,  # -1500.00
                currency_code="INR",
                counterparty="Zomato",
                raw_description="ZOMATO*DINING",
                raw_row_data={"raw": "data"},
                status="UNMATCHED",
            ),
            Transaction(
                id=generate_uuid(),
                account_id=hsbc_acc.id,
                import_batch_id=batch.id,
                transaction_date=datetime.date(2024, 5, 5),
                amount_minor_units=-250000,  # -2500.00
                currency_code="INR",
                counterparty="Amazon India",
                raw_description="AMAZON PAY*MARKETPLACE",
                raw_row_data={"raw": "data"},
                status="UNMATCHED",
            ),
        ]

        for txn in bank_txns:
            db.add(txn)

        # 4. Create Splitwise Expenses
        splitwise_expenses = [
            SplitwiseExpense(
                id="10001",
                expense_date=datetime.date(2024, 5, 1),
                total_amount_minor_units=125000,
                currency_code="INR",
                description="Dinner at Social",
                updated_at=datetime.datetime.utcnow(),
                status="UNMATCHED",
                users_data=[
                    {
                        "user": {
                            "first_name": "John",
                            "last_name": "Doe",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/men/1.jpg"
                            },
                        },
                        "paid_share": "1250.00",
                        "owed_share": "625.00",
                    },
                    {
                        "user": {
                            "first_name": "Jane",
                            "last_name": "Smith",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/women/1.jpg"
                            },
                        },
                        "paid_share": "0.00",
                        "owed_share": "625.00",
                    },
                ],
            ),
            SplitwiseExpense(
                id="10002",
                expense_date=datetime.date(2024, 5, 2),
                total_amount_minor_units=45000,
                currency_code="INR",
                description="Uber to Airport",
                updated_at=datetime.datetime.utcnow(),
                status="UNMATCHED",
                users_data=[
                    {
                        "user": {
                            "first_name": "John",
                            "last_name": "Doe",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/men/1.jpg"
                            },
                        },
                        "paid_share": "450.00",
                        "owed_share": "225.00",
                    },
                    {
                        "user": {
                            "first_name": "Jane",
                            "last_name": "Smith",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/women/1.jpg"
                            },
                        },
                        "paid_share": "0.00",
                        "owed_share": "225.00",
                    },
                ],
            ),
            SplitwiseExpense(
                id="10003",
                expense_date=datetime.date(2024, 5, 3),
                total_amount_minor_units=89900,
                currency_code="INR",
                description="Netflix Subscription",
                updated_at=datetime.datetime.utcnow(),
                status="UNMATCHED",
                users_data=[
                    {
                        "user": {
                            "first_name": "John",
                            "last_name": "Doe",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/men/1.jpg"
                            },
                        },
                        "paid_share": "899.00",
                        "owed_share": "449.50",
                    },
                    {
                        "user": {
                            "first_name": "Jane",
                            "last_name": "Smith",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/women/1.jpg"
                            },
                        },
                        "paid_share": "0.00",
                        "owed_share": "449.50",
                    },
                ],
            ),
            SplitwiseExpense(
                id="10004",
                expense_date=datetime.date(2024, 5, 10),  # No match in bank
                total_amount_minor_units=300000,
                currency_code="INR",
                description="Groceries",
                updated_at=datetime.datetime.utcnow(),
                status="UNMATCHED",
                users_data=[
                    {
                        "user": {
                            "first_name": "John",
                            "last_name": "Doe",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/men/1.jpg"
                            },
                        },
                        "paid_share": "3000.00",
                        "owed_share": "1500.00",
                    },
                    {
                        "user": {
                            "first_name": "Jane",
                            "last_name": "Smith",
                            "picture": {
                                "medium": "https://randomuser.me/api/portraits/med/women/1.jpg"
                            },
                        },
                        "paid_share": "0.00",
                        "owed_share": "1500.00",
                    },
                ],
            ),
        ]

        for exp in splitwise_expenses:
            db.add(exp)

        # 5. Create a Matched Transaction pair
        matched_bank_txn = Transaction(
            id=generate_uuid(),
            account_id=hsbc_acc.id,
            import_batch_id=batch.id,
            transaction_date=datetime.date(2024, 4, 25),
            amount_minor_units=-50000,
            currency_code="INR",
            counterparty="Starbucks",
            raw_description="STARBUCKS*COFFEE",
            raw_row_data={"raw": "data"},
            status="MATCHED",
        )
        db.add(matched_bank_txn)

        matched_sw_exp = SplitwiseExpense(
            id="20001",
            expense_date=datetime.date(2024, 4, 25),
            total_amount_minor_units=50000,
            currency_code="INR",
            description="Coffee with Jane",
            updated_at=datetime.datetime.now(datetime.UTC),
            status="MATCHED",
            users_data=[
                {
                    "user": {
                        "first_name": "John",
                        "last_name": "Doe",
                        "picture": {
                            "medium": "https://randomuser.me/api/portraits/med/men/1.jpg"
                        },
                    },
                    "paid_share": "500.00",
                    "owed_share": "250.00",
                },
                {
                    "user": {
                        "first_name": "Jane",
                        "last_name": "Smith",
                        "picture": {
                            "medium": "https://randomuser.me/api/portraits/med/women/1.jpg"
                        },
                    },
                    "paid_share": "0.00",
                    "owed_share": "250.00",
                },
            ],
        )
        db.add(matched_sw_exp)
        db.commit()

        link = ReconciliationLink(
            id=generate_uuid(),
            transaction_id=matched_bank_txn.id,
            splitwise_expense_id=matched_sw_exp.id,
            mapped_amount_minor_units=50000,
            link_type="manual",
            status="ACTIVE",
        )
        db.add(link)

        # 6. Create a Conflict (Stale Link)
        conflict_bank_txn = Transaction(
            id=generate_uuid(),
            account_id=hsbc_acc.id,
            import_batch_id=batch.id,
            transaction_date=datetime.date(2024, 4, 20),
            amount_minor_units=-200000,
            currency_code="INR",
            counterparty="Rent Payment",
            raw_description="RENT*MAY",
            raw_row_data={"raw": "data"},
            status="MATCHED",
        )
        db.add(conflict_bank_txn)

        conflict_sw_exp = SplitwiseExpense(
            id="30001",
            expense_date=datetime.date(2024, 4, 20),
            total_amount_minor_units=210000,  # Changed from 2000.00 to 2100.00
            currency_code="INR",
            description="Monthly Rent (Updated)",
            updated_at=datetime.datetime.now(datetime.UTC),
            status="MATCHED",
            users_data=[
                {
                    "user": {
                        "first_name": "John",
                        "last_name": "Doe",
                        "picture": {
                            "medium": "https://randomuser.me/api/portraits/med/men/1.jpg"
                        },
                    },
                    "paid_share": "2100.00",
                    "owed_share": "1050.00",
                },
                {
                    "user": {
                        "first_name": "Jane",
                        "last_name": "Smith",
                        "picture": {
                            "medium": "https://randomuser.me/api/portraits/med/women/1.jpg"
                        },
                    },
                    "paid_share": "0.00",
                    "owed_share": "1050.00",
                },
            ],
        )
        db.add(conflict_sw_exp)
        db.commit()

        stale_link = ReconciliationLink(
            id=generate_uuid(),
            transaction_id=conflict_bank_txn.id,
            splitwise_expense_id=conflict_sw_exp.id,
            mapped_amount_minor_units=200000,  # Original amount
            link_type="manual",
            status="STALE_REVIEW_REQUIRED",
        )
        db.add(stale_link)

        db.commit()
        print(f"Successfully seeded {DB_URL} with fake data and conflicts.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
