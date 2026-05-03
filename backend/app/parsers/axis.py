import datetime
import io
from typing import Any, Dict, List

import pandas as pd

from .base import BankParser
from .utils import clean_counterparty


class AxisParser(BankParser):
    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        # Axis Bank CC statements in Excel format
        # We expect headers at row 5 (0-indexed)
        # Columns: Date, Transaction Details, NaN, Amount (INR), Debit/Credit

        df = pd.read_excel(io.BytesIO(file_content), header=5)

        # Filter out the header-like first row if it contains 'Date' or 'Amount'
        if not df.empty and (df.iloc[0, 0] == "Date" or "Amount" in str(df.iloc[0, 3])):
            df = df.iloc[1:]

        transactions = []
        for index, row in df.iterrows():
            # Skip rows where Date is NaN or empty (could be footer or summary rows)
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == "":
                continue

            date_str = str(row.iloc[0]).strip()
            # Expected format: "12 Jan '26"
            try:
                date_obj = datetime.datetime.strptime(date_str, "%d %b '%y").date()
            except ValueError:
                # If it doesn't match the transaction date format, it might be a sub-header or footer
                continue

            # Amount parsing (Column 3)
            amount_str = str(row.iloc[3]).replace("₹", "").replace(",", "").strip()
            try:
                abs_amount = float(amount_str)
            except ValueError:
                continue

            # Debit/Credit handling (Column 4)
            type_str = str(row.iloc[4]).strip().lower()
            if "debit" in type_str:
                amount_minor_units = -int(round(abs_amount * 100))
            else:
                amount_minor_units = int(round(abs_amount * 100))

            raw_desc = str(row.iloc[1]).strip()

            # Counterparty heuristic
            # Often Axis descriptions are like "PYU*Swiggy Food,Bangalore" or "AMAZON PAY INDIA PRIVA,BANGALORE"
            # 1. Take the first part before the comma (usually City)
            merchant_full = raw_desc.split(",")[0].strip()

            # 2. Use standardized cleaning utility
            counterparty = clean_counterparty(merchant_full)

            raw_row = {
                "Date": date_str,
                "Details": raw_desc,
                "Amount": amount_str,
                "Type": type_str,
            }

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
