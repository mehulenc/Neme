from datetime import datetime
from typing import Any, Dict, List

import mt940

from .base import BankParser
from .utils import clean_counterparty


class MT940Parser(BankParser):
    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        # MT940 library expects a string
        content_str = file_content.decode("utf-8", errors="ignore")

        import os
        import tempfile

        # Strip SWIFT headers if present
        if "{4:" in content_str:
            content_str = content_str.split("{4:")[1].split("-}")[0].strip()

        # Use a temporary file because the library seems to expect a filename
        with tempfile.NamedTemporaryFile(mode="w", suffix=".sta", delete=False) as tmp:
            tmp.write(content_str)
            tmp_path = tmp.name

        try:
            mt = mt940.MT940(tmp_path)
            statements = mt.statements
        except Exception as e:
            print(f"MT940 Library Error: {e}")
            return []
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

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

                tx_data = {
                    "transaction_date": (
                        dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
                    ),
                    "amount_minor_units": amount_minor,
                    "raw_description": raw_description,
                    "counterparty": counterparty,
                    "category": "Uncategorized",
                }

                parsed_transactions.append(tx_data)

        return parsed_transactions
