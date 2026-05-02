"""
Heuristic matching engine for auto-suggesting reconciliation links
between bank transactions and Splitwise expenses.
"""

import datetime
from typing import Optional

from sqlalchemy.orm import Session

from .models import SplitwiseExpense, SystemSetting, Transaction

AMOUNT_TOLERANCE_MINOR_UNITS = 500  # ±₹5.00 / $5.00
DATE_TOLERANCE_DAYS = 2


def _get_splitwise_user_id(db: Session) -> Optional[str]:
    """Retrieve the authenticated Splitwise user's ID from system settings."""
    setting = (
        db.query(SystemSetting).filter(SystemSetting.key == "splitwise_user_id").first()
    )
    return setting.value if setting else None


def _extract_paid_share(users_data: list, user_id: str) -> Optional[int]:
    """Extract the current user's paid_share from the expense's users_data JSON."""
    if not users_data or not user_id:
        return None
    for user in users_data:
        if str(user.get("user", {}).get("id", "")) == user_id:
            try:
                return int(float(user.get("paid_share", "0")) * 100)
            except (ValueError, TypeError):
                return None
    return None


def _amounts_match(txn_amount: int, reference_amount: int) -> tuple[bool, str]:
    """
    Check if a transaction amount matches a reference amount within tolerance.
    Returns (is_match, confidence) where confidence is 'high' or 'medium'.
    """
    diff = abs(txn_amount - reference_amount)
    if diff == 0:
        return True, "high"
    elif diff <= AMOUNT_TOLERANCE_MINOR_UNITS:
        return True, "medium"
    return False, ""


def _format_amount(minor_units: int) -> str:
    """Format minor units as a human-readable decimal string."""
    return f"{minor_units / 100:.2f}"


def compute_suggestions(db: Session) -> list[dict]:
    """
    Compute suggested matches between unmatched transactions and expenses.

    For each unmatched debit transaction, scan unmatched expenses and check:
      1. Does the user's paid_share match abs(txn amount) within ±500 minor units?
      2. Does the total_amount match abs(txn amount) within ±500 minor units?
      3. Are the dates within ±2 days?

    If either amount check passes AND the date check passes, it's a suggestion.
    Each expense can only appear in one suggestion (greedy, first match wins).

    Returns a list of dicts:
      {transaction_id, expense_id, confidence, reason}
    """
    user_id = _get_splitwise_user_id(db)

    unmatched_txns = (
        db.query(Transaction)
        .filter(Transaction.status == "UNMATCHED")
        .order_by(Transaction.transaction_date.desc())
        .all()
    )

    unmatched_exps = (
        db.query(SplitwiseExpense)
        .filter(SplitwiseExpense.status == "UNMATCHED")
        .order_by(SplitwiseExpense.expense_date.desc())
        .all()
    )

    # Track which expenses have already been claimed by a suggestion
    claimed_expense_ids: set[str] = set()
    suggestions: list[dict] = []

    for txn in unmatched_txns:
        txn_abs = abs(txn.amount_minor_units)

        for exp in unmatched_exps:
            if exp.id in claimed_expense_ids:
                continue

            # --- Date check ---
            txn_date = txn.transaction_date
            exp_date = exp.expense_date

            # Handle if either is a datetime instead of a date
            if isinstance(txn_date, datetime.datetime):
                txn_date = txn_date.date()
            if isinstance(exp_date, datetime.datetime):
                exp_date = exp_date.date()

            day_diff = abs((txn_date - exp_date).days)
            if day_diff > DATE_TOLERANCE_DAYS:
                continue

            # --- Amount checks ---
            best_confidence = ""
            match_reason_parts = []

            # Check 1: paid_share
            paid_share = _extract_paid_share(exp.users_data, user_id)
            if paid_share is not None:
                is_match, confidence = _amounts_match(txn_abs, paid_share)
                if is_match:
                    match_reason_parts.append(
                        f"paid_share {_format_amount(paid_share)}"
                    )
                    if confidence == "high" or best_confidence != "high":
                        best_confidence = confidence

            # Check 2: total_amount
            is_match, confidence = _amounts_match(txn_abs, exp.total_amount_minor_units)
            if is_match:
                match_reason_parts.append(
                    f"total {_format_amount(exp.total_amount_minor_units)}"
                )
                if confidence == "high" or best_confidence != "high":
                    best_confidence = confidence

            if not match_reason_parts:
                continue

            # Build human-readable reason
            amount_str = _format_amount(txn_abs)
            matches_str = " and ".join(match_reason_parts)
            day_label = "same day" if day_diff == 0 else f"{day_diff}d apart"
            reason = f"Txn {amount_str} matches {matches_str}, {day_label}"

            suggestions.append(
                {
                    "transaction_id": txn.id,
                    "expense_id": exp.id,
                    "confidence": best_confidence,
                    "reason": reason,
                }
            )
            claimed_expense_ids.add(exp.id)
            break  # Move on to the next transaction

    return suggestions
