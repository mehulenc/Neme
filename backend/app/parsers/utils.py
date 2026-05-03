import re


def clean_counterparty(name: str) -> str:
    """
    Standardized counterparty name cleaning across all banks.
    - Handles specialized formats (UPI, NEFT, IMPS, Sweep, FD)
    - Strips payment gateway prefixes (PYU*, RZP*, etc.)
    - Removes common corporate noise (INDIA PRIVATE, etc.)
    - Trims whitespace and redundant words
    """
    if not name:
        return ""

    name = name.strip()

    # 1. Specialized Banking Formats

    # UPI: UPI/Name/ID/Description -> Name
    if name.startswith("UPI/"):
        parts = name.split("/")
        if len(parts) > 1:
            name = parts[1]

    # NEFT: NEFT <IFSC> <Reference> <Name> or similar
    elif "NEFT" in name:
        # Pattern: NEFT <IFSC> <Ref> <Actual Name>
        # Example: NEFT HDFCH00953049838 GOLDMAN SACHS SERVICES PRIV
        name = re.sub(r"^.*NEFT\s+[A-Z0-9]+\s+\d*\s*", "", name).strip()
        # Fallback if the above was too specific
        if not name or len(name) < 3:
            name = re.sub(r"^.*NEFT\s+[A-Z0-9]+\s+", "", name).strip()

    # IMPS: SentIMPS...Ref...Name or similar
    elif "IMPS" in name:
        name = re.sub(r"^.*IMPS.*?\d+\s+", "", name)
        name = re.sub(r"\/.*$", "", name)

    # Internal Transfers
    if "Sweep Trf" in name or "SWEEP TRANSFER" in name:
        return "Sweep Transfer"
    if "FD PREMAT PROCEEDS" in name or "FD PREMAT" in name:
        return "FD Proceeds"

    # 2. Strip payment gateway prefixes
    name = re.sub(r"^[a-zA-Z]{2,}\*", "", name).strip()

    # 3. Payment App Noise
    name = re.sub(
        r"\s+(Sent using|Pay to|Payment for|Payment from|Pay money to).*$",
        "",
        name,
        flags=re.IGNORECASE,
    )
    name = re.sub(
        r"^(Pay money to|Sent using|Pay to)\s+", "", name, flags=re.IGNORECASE
    )

    # 4. Clean up common merchant noise and legal suffixes
    name = re.sub(r"\s+INDIA\s+(PRIVATE|PVT|PRIVA).*$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+(LIMITED|LTD)$", "", name, flags=re.IGNORECASE)
    name = re.sub(
        r"\s+(SERVICES|SERVICE)\s+(PRIV|PVT).*$", "", name, flags=re.IGNORECASE
    )

    # 5. Final cleanup
    # Remove any stray IDs or long numbers at the end
    name = re.sub(r"\s+\d{10,}$", "", name)

    return name.strip()
