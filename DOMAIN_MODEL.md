# Domain Model

This document defines the stable core entities and relationships for the system.

The purpose of this model is to support a trustworthy financial ledger, reconciliation with Splitwise, and future expansion without redesigning the fundamentals later.

## Core principles

- Money must never be stored as floating point.
- Use integer minor units for all monetary values.
- Preserve import provenance.
- Treat imported data as source material, not as mutable truth.
- Keep reconciliation state explicit.
- Prefer normalized entities over string blobs when a thing needs to be queried, filtered, or related.

## Currency and money

### Money

All monetary amounts are stored as:

- `amount_minor_units` (integer)
- `currency_code` (string, ISO 4217)

Examples:

- INR 1250.50 -> `125050` minor units
- USD 42.99 -> `4299` minor units

## Entities

### Account

Represents a financial source or destination.

Examples:

- credit card
- bank account
- brokerage account
- cash wallet

Fields:

- `id`
- `name`
- `institution`
- `account_type`
- `masked_identifier`
- `currency_code`
- `created_at`
- `archived_at` (optional)

### ImportBatch

Represents one ingestion session from one source file or one source payload.

Fields:

- `id`
- `account_id`
- `source_type` (CSV, XLSX, PDF, manual, API)
- `filename`
- `parser_version`
- `imported_at`
- `checksum` or similar source fingerprint
- `status` (success, partial, failed)

### Transaction

Represents an imported bank/card transaction.

Fields:

- `id`
- `account_id`
- `import_batch_id`
- `transaction_date`
- `posted_at` (optional)
- `amount_minor_units`
- `currency_code`
- `counterparty`
- `raw_description`
- `raw_row_data`
- `status`
- `personal_flag`
- `notes`
- `created_at`
- `updated_at`

Notes:

- `raw_row_data` should preserve the original source row for debugging.
- `status` should support at least:
  - `UNMATCHED`
  - `PARTIAL`
  - `MATCHED`
  - `PERSONAL`
  - `IGNORED`

### SplitwiseExpense

Represents a local mirror of a Splitwise expense.

Fields:

- `id` (local UUID or Splitwise ID as a separate external key)
- `splitwise_expense_id`
- `group_id` (if available)
- `expense_date`
- `description`
- `total_amount_minor_units`
- `currency_code`
- `updated_at`
- `synced_at`
- `deleted_at` (if Splitwise marks deletions or removals)
- `status`

Notes:

- This is a local mirror, not just a remote pointer.
- The app should be able to search and reconcile against it quickly.

### ReconciliationLink

Represents a link between one transaction and one Splitwise expense, or part of a transaction linked to one or more Splitwise expenses.

Fields:

- `id`
- `transaction_id`
- `splitwise_expense_id`
- `mapped_amount_minor_units`
- `created_at`
- `updated_at`
- `link_type` (manual, suggested, auto, partial)
- `status` (active, reversed, stale)

Notes:

- One transaction may link to many Splitwise expenses.
- One Splitwise expense may link to many transactions.
- `mapped_amount_minor_units` captures partial matching and rollups.

### Category

Represents a spending category used for analysis.

Fields:

- `id`
- `name`
- `parent_id` (optional)
- `created_at`

### Tag

Represents a user-defined label.

Fields:

- `id`
- `name`
- `created_at`

### TransactionTag

Join table for transaction-to-tag relationships.

Fields:

- `transaction_id`
- `tag_id`

### Optional future entities

These are intentionally not required for V1, but the model should not block them later:

- InvestmentAccount
- Holding
- Trade
- AssetPriceSnapshot
- BudgetRule
- Insight
- Recommendation

## Important invariants

- A transaction must belong to exactly one account.
- An import batch must belong to exactly one account.
- Imported data should be reproducible from the original source row and parser version.
- Reconciliation links must not silently overwrite prior link history.
- Sum of mapped amounts for one transaction should not exceed the transaction amount, unless a clearly defined exception exists.
- Splitwise mirror data should be refreshable without destroying local reconciliation state.

## Deduplication model

Separate these concepts:

### Exact import duplicate

A row that has already been imported from the same source context.

Use:

- source file identity
- account identity
- raw row fingerprint
- parser version if needed

### Semantic duplicate

A transaction that is suspiciously similar to another transaction.

This is a weaker, human-review concept and should not be treated as the same as exact deduplication.

## Reconciliation status model

Suggested reconciliation states:

- `UNMATCHED`
- `PARTIAL`
- `MATCHED`
- `PERSONAL`
- `IGNORED`

These should be derived from explicit link state and user action, not from fragile inference alone.
