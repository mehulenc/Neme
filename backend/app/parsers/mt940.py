import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import mt940

from .base import BankParser
from .utils import clean_counterparty


def _parse_balance_tag(content_str: str, tag: str) -> Optional[Dict[str, Any]]:
    """
    Extract balance info from MT940 tags like :60F: and :62F:.
    Format: C/D YYMMDD CURRENCY AMOUNT (e.g. C260503INR50328,46)
    """
    pattern = rf":{re.escape(tag)}:([CD])(\d{{6}})([A-Z]{{3}})([\d,]+)"
    match = re.search(pattern, content_str)
    if not match:
        return None
    sign, date_str, currency, amount_str = match.groups()
    try:
        balance_date = datetime.strptime(date_str, "%y%m%d").date()
        amount = float(amount_str.replace(",", "."))
        # Negative for debit (D) balance (overdraft)
        if sign == "D":
            amount = -amount
        return {
            "amount_minor_units": int(amount * 100),
            "currency_code": currency,
            "balance_date": balance_date.isoformat(),
        }
    except (ValueError, TypeError):
        return None


class MT940Parser(BankParser):
    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:  # type: ignore[override]
        result, _ = self.parse_with_metadata(file_content)
        return result

    def parse_with_metadata(
        self, file_content: bytes
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        import os
        import tempfile

        # MT940 library expects a string
        content_str = file_content.decode("utf-8", errors="ignore")

        # Use a temporary file because the library expects a filename, not a string
        # We use the full content_str because the file may contain multiple statements
        with tempfile.NamedTemporaryFile(mode="w", suffix=".sta", delete=False) as tmp:
            tmp.write(content_str)
            tmp_path = tmp.name

        try:
            mt = mt940.MT940(tmp_path)
            statements = mt.statements
        except Exception as e:
            print(f"MT940 Library Error: {e}")
            return [], {}
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        # Extract opening/closing balances from the library's parsed statements
        # We want the FIRST opening balance and the LAST closing balance in the file
        opening_balance = None
        closing_balance = None

        if statements:
            # Opening balance from the first statement (tag :60F: or :60M:)
            first_stmt = statements[0]
            ob = first_stmt.data.get("final_opening_balance") or first_stmt.data.get(
                "intermediate_opening_balance"
            )
            if ob:
                opening_balance = {
                    "amount_minor_units": int(float(ob.amount) * 100),
                    "currency_code": ob.currency,
                    "balance_date": (
                        ob.date.isoformat()
                        if hasattr(ob.date, "isoformat")
                        else str(ob.date)
                    ),
                }

            # Closing balance from the last statement (tag :62F: or :62M:)
            last_stmt = statements[-1]
            cb = last_stmt.data.get("final_closing_balance") or last_stmt.data.get(
                "intermediate_closing_balance"
            )
            if cb:
                closing_balance = {
                    "amount_minor_units": int(float(cb.amount) * 100),
                    "currency_code": cb.currency,
                    "balance_date": (
                        cb.date.isoformat()
                        if hasattr(cb.date, "isoformat")
                        else str(cb.date)
                    ),
                }

        parsed_transactions = []

        for statement in statements:
            for transaction in statement.transactions:
                # Some versions of mt940 library use direct attributes, some use .data
                # We'll try to be robust
                raw_description = getattr(transaction, "description", "") or ""
                if not raw_description and hasattr(transaction, "__str__"):
                    raw_description = str(transaction)

                counterparty = clean_counterparty(raw_description)

                # Amount conversion
                amount_val = getattr(transaction, "amount", 0)
                amount_float = float(amount_val)
                amount_minor = int(amount_float * 100)

                # Date conversion
                dt = getattr(transaction, "date", None)
                if not dt:
                    continue

                # Ensure it's a date object (some versions of mt940 return strings)
                if isinstance(dt, str):
                    try:
                        dt = datetime.strptime(dt, "%y%m%d").date()
                    except ValueError:
                        try:
                            dt = datetime.fromisoformat(dt).date()
                        except ValueError:
                            continue

                # Use closing balance currency if available, else opening, else default to INR
                currency = "INR"
                if closing_balance:
                    currency = closing_balance["currency_code"]
                elif opening_balance:
                    currency = opening_balance["currency_code"]

                # Robust raw data extraction
                raw_row = {}
                if hasattr(transaction, "data"):
                    raw_row = transaction.data
                elif hasattr(transaction, "__dict__"):
                    # Filter out non-serializable objects if necessary
                    raw_row = {
                        k: str(v)
                        for k, v in transaction.__dict__.items()
                        if not k.startswith("_")
                    }

                tx_data = {
                    "transaction_date": dt,
                    "amount_minor_units": amount_minor,
                    "currency_code": currency,
                    "raw_description": raw_description,
                    "counterparty": counterparty,
                    "raw_row_data": raw_row,
                    "category": "Uncategorized",
                }

                parsed_transactions.append(tx_data)

        metadata = {
            "closing_balance": closing_balance,
            "opening_balance": opening_balance,
        }
        return parsed_transactions, metadata
