# Domain Model

This document defines the stable core entities and relationships for the system.

The purpose of this model is to support a trustworthy financial ledger, reconciliation with Splitwise, and future expansion without redesigning the fundamentals later.

## Core principles

- Money must never be stored as floating point. Use integer minor units for all monetary values.
- Preserve import provenance. Treat imported data as source material, not as mutable truth.
- Keep reconciliation state explicit.
- Prefer normalized entities over string blobs when a thing needs to be queried, filtered, or related.

## Currency and money

All monetary amounts are stored as:

- `amount_minor_units` (integer)
- `currency_code` (string, ISO 4217)

Examples:

- INR 1250.50 -> `125050` minor units
- USD 42.99 -> `4299` minor units

## Entities

### Account

Represents a financial source or destination (credit card, bank account, brokerage account, cash wallet).

Fields: `id`, `name`, `institution`, `currency_code`

### ImportBatch

Represents one ingestion session from one source file.

Fields: `id`, `account_id`, `source_type`, `filename`, `parser_version`, `imported_at`

### Transaction

Represents an imported bank/card transaction.

Fields: `id`, `account_id`, `import_batch_id`, `transaction_date`, `amount_minor_units`, `currency_code`, `counterparty`, `raw_description`, `raw_row_data`, `status`, `notes`, `is_edited`

Status values: `UNMATCHED`, `MATCHED`, `PERSONAL`, `IGNORED`

Notes:

- `raw_row_data` preserves the original source row for debugging.
- Negative `amount_minor_units` indicates a debit.

### SplitwiseExpense

Represents a local mirror of a Splitwise expense.

Fields: `id` (Splitwise ID), `expense_date`, `total_amount_minor_units`, `currency_code`, `description`, `updated_at`, `status`, `users_data` (JSON)

Status values: `UNMATCHED`, `MATCHED`, `IGNORED`

Notes:

- This is a local mirror, not just a remote pointer.
- `users_data` stores the full payers/payees array from Splitwise, used by the heuristic engine to extract the current user's `paid_share`.

### ReconciliationLink

Represents a link between one transaction and one Splitwise expense.

Fields: `id`, `transaction_id`, `splitwise_expense_id`, `mapped_amount_minor_units`, `link_type`, `status`

Link types: `manual`, `suggested`, `quick_create`
Status values: `ACTIVE`, `STALE_REVIEW_REQUIRED`

Notes:

- One transaction may link to many Splitwise expenses.
- One Splitwise expense may link to many transactions.
- `mapped_amount_minor_units` captures partial matching.

### SystemSetting

Key-value store for runtime configuration.

Currently stores: `splitwise_access_token`, `splitwise_user_id`, `last_splitwise_sync`

## Important invariants

- A transaction must belong to exactly one account.
- An import batch must belong to exactly one account.
- Imported data should be reproducible from the original source row and parser version.
- Reconciliation links must not silently overwrite prior link history.
- Sum of mapped amounts for one transaction should not exceed the transaction amount.
- Splitwise mirror data should be refreshable without destroying local reconciliation state.
- When a remote Splitwise expense changes its amount or date, active links are flagged as `STALE_REVIEW_REQUIRED`.

## Deduplication model

### Exact import duplicate

A row that has already been imported from the same source context. Detected using source file identity, account identity, and raw row fingerprint.

### Semantic duplicate

A transaction that is suspiciously similar to another transaction. This is a weaker, human-review concept and should not be treated as the same as exact deduplication.

## Reconciliation status model

- `UNMATCHED` — No link exists.
- `MATCHED` — One or more active reconciliation links exist.
- `PERSONAL` — User explicitly marked this as personal spending.
- `IGNORED` — User explicitly chose to ignore this item.

These are derived from explicit link state and user action, not from fragile inference alone.
