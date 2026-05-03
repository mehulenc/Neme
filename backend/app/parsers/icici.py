import datetime
import io
import re
from typing import Any, Dict, List

import pandas as pd

from .base import BankParser
from .utils import clean_counterparty


class ICICIParser(BankParser):
    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        # ICICI Bank CC statements in legacy Excel format (.xls)
        # We expect headers at row 14 (0-indexed)
        # Columns: [1] Date, [5] Details, [9] Amount

        df = pd.read_excel(io.BytesIO(file_content), header=14)

        # Filter out rows where Column 1 (Date) is not a date
        transactions = []
        for index, row in df.iterrows():
            date_val = str(row.iloc[1]).strip()
            # Expected format: "DD-MM-YYYY"
            if not re.match(r"\d{2}-\d{2}-\d{4}", date_val):
                continue

            try:
                date_obj = datetime.datetime.strptime(date_val, "%d-%m-%Y").date()
            except ValueError:
                continue

            # Amount parsing (Column 9)
            # Format: "130 Dr." or "130.50 Cr."
            amount_str = str(row.iloc[9]).strip()
            amount_match = re.match(
                r"([\d,.]+)\s+(Dr|Cr)\.?", amount_str, re.IGNORECASE
            )

            if not amount_match:
                continue

            abs_amount_str = amount_match.group(1).replace(",", "")
            abs_amount = float(abs_amount_str)

            type_str = amount_match.group(2).lower()
            if type_str == "dr":
                amount_minor_units = -int(round(abs_amount * 100))
            else:
                amount_minor_units = int(round(abs_amount * 100))

            raw_desc = str(row.iloc[5]).strip()

            # Use standardized counterparty cleaning
            # ICICI descriptions often end with ", City, IND"
            merchant_full = raw_desc.split(",")[0].strip()
            counterparty = clean_counterparty(merchant_full)

            raw_row = {"Date": date_val, "Details": raw_desc, "Amount": amount_str}

            transactions.append(
                {
                    "transaction_date": date_obj,
                    "amount_minor_units": amount_minor_units,
                    "currency_code": "INR",
                    "counterparty": counterparty,
                    "raw_description": raw_desc,
                    "raw_row_data": raw_row,
                }
            )

        return transactions
