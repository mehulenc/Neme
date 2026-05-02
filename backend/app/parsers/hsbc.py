import datetime
import io
import re
from typing import Any, Dict, List

import pandas as pd

from .base import BankParser


class HSBCParser(BankParser):
    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        # HSBC CSVs usually don't have a header row and have 3 columns: Date, Description, Amount
        df = pd.read_csv(
            io.BytesIO(file_content),
            header=None,
            names=["Date", "Description", "Amount"],
        )

        transactions = []
        for index, row in df.iterrows():
            if pd.isna(row["Date"]) or pd.isna(row["Amount"]):
                continue

            # Parse Date (DD/MM/YYYY)
            date_obj = datetime.datetime.strptime(
                str(row["Date"]).strip(), "%d/%m/%Y"
            ).date()

            # Parse Amount
            amount_str = str(row["Amount"]).replace(",", "").strip()
            amount_minor_units = int(round(float(amount_str) * 100))

            raw_desc = str(row["Description"]).strip()

            # Improved counterparty heuristic based on HSBC format:
            # <Counterparty> <City or Website> <Country code 3 digit> <Date> <Car Number>
            match = re.search(r"\s+(\d{2}/\d{2}/\d{4})\s+", raw_desc)
            if match:
                prefix = raw_desc[: match.start()].strip()
                # Remove trailing 3 letter country/state code if present (e.g., IND, NLD, HAR)
                counterparty = re.sub(r"\s+[A-Z]{3}$", "", prefix).strip()
            else:
                counterparty = raw_desc[:50]

            raw_row = {
                "Date": str(row["Date"]),
                "Description": str(row["Description"]),
                "Amount": str(row["Amount"]),
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
