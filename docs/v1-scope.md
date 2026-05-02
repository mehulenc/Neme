# V1 Scope

This document defines the strict boundary for the first useful version of the app.

The goal of V1 is not to build the full financial operating system.
The goal is to make Splitwise reconciliation fast, trustworthy, and low-friction.

## V1 goal

Build a private financial app that can:

- Import card/bank transactions
- Mirror Splitwise expenses locally
- Let you reconcile the two quickly
- Preserve provenance and history
- Support basic tagging and categorization

## In scope for V1

### Data ingestion

- CSV import for a small set of specific statement formats (HSBC supported)
- Import batch tracking
- Source file preservation
- Parser version tracking
- Duplicate detection with review
- Transaction storage
- Splitwise expense mirroring via OAuth

### Reconciliation

- Side-by-side reconciliation UI
- Unmatched transaction queue
- Unmatched Splitwise expense queue
- Manual one-to-one linking
- One-to-many linking
- Many-to-one linking
- Partial mapping via mapped amounts
- Mark transaction as personal
- Mark transaction as ignored
- Suggested matches based on heuristics (amount + date proximity)
- Stale-link visibility
- Quick-create Splitwise expense from a transaction
- **V1.5 Improvements**:
    - Manual editability for transactions and Splitwise expenses
    - Expandable expense cards with full participant breakdowns
    - Dynamic currency support and symbol mapping
    - Personalized profile pictures from Splitwise data
    - Optimized selection logic (Escape to deselect, click-outside, recommendation auto-selection)

### Basic metadata

- Tags
- Categories
- Notes
- Account support for multiple cards/accounts

### Reliability

- Unit tests for parsers
- Unit tests for reconciliation heuristics
- Fixture-based import tests
- Audit-friendly raw data storage
- Structured logging for import and sync failures

## Out of scope for V1

- Investment tracking
- Portfolio analytics
- Retirement planning
- AI financial coaching
- Automated spending advice
- Predictive forecasting
- Notification systems
- Bank account aggregation through third-party connectors
- SMS parsing
- Real-time card alerts
- Mobile-native app
- Background sync complexity
- PWA complexity unless it directly helps V1 usability
- Public multi-user support
- Cloud-hosted SaaS architecture

## UI priority for V1

The interface must be optimized for:

- Rapid review
- Low cognitive load
- Obvious reconciliation status
- Keyboard-friendly workflows
- Clear trust signals

The first screen should help you understand:

- What is unmatched
- What is already reconciled
- What is personal
- What needs attention now

## Non-negotiable rule

If a feature does not directly improve import reliability or reconciliation speed, it is not a V1 feature unless explicitly required to support those workflows.
