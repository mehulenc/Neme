"""
Smoke tests — ensure core modules import and basic logic works.
These run in CI and serve as a safety net against import errors or
dependency drift breaking the app on fresh installs.
"""


def test_models_import():
    """Core SQLAlchemy models must be importable."""
    from app.models import (  # noqa: F401
        Account,
        ImportBatch,
        ReconciliationLink,
        SplitwiseExpense,
        SystemSetting,
        Transaction,
    )


def test_hsbc_parser_counterparty_extraction():
    """HSBC parser must correctly extract counterparty from raw description."""
    from app.parsers.hsbc import HSBCParser

    # Simulate a minimal CSV with a typical HSBC description format
    csv_bytes = b"01/01/2025,AMAZON INDIA IND 01/01/2025 1234,-500.00\n"
    parser = HSBCParser()
    results = parser.parse(csv_bytes)

    assert len(results) == 1
    txn = results[0]
    assert txn["counterparty"] == "AMAZON INDIA"
    assert txn["amount_minor_units"] == -50000
    assert txn["currency_code"] == "INR"
