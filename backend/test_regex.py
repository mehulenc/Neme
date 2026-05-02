import re

import pandas as pd

df = pd.read_csv(
    "/Users/mehulenc/Neme/TransactionHistory.csv",
    header=None,
    names=["Date", "Description", "Amount"],
)

for desc in df["Description"].dropna()[:10]:
    desc = str(desc).strip()
    # Find the date
    match = re.search(r"\s+(\d{2}/\d{2}/\d{4})\s+", desc)
    if match:
        prefix = desc[: match.start()].strip()
        # Remove trailing 3 letter country code if it looks like one (e.g. IND, NLD, HAR, UTT, KAR)
        # Some are just city names or states.
        # It's better to just use the prefix as counterparty, maybe remove the last word if it's 3 uppercase letters
        counterparty = re.sub(r"\s+[A-Z]{3}$", "", prefix).strip()
        print(f"RAW: '{desc}' -> COUNTERPARTY: '{counterparty}'")
    else:
        print(f"NO MATCH: '{desc}'")
