# V1 Scope

This document defines the strict boundary for the first useful version of the app.

The goal of V1 is not to build the full financial operating system.
The goal is to make Splitwise reconciliation fast, trustworthy, and low-friction.

## V1 goal

Build a private financial app that can:

- import card/bank transactions
- mirror Splitwise expenses locally
- let me reconcile the two quickly
- preserve provenance and history
- support basic tagging and categorization

## IN SCOPE for V1

### Data ingestion

- CSV import for a small set of specific statement formats
- import batch tracking
- source file preservation
- parser version tracking
- duplicate detection with review
- transaction storage
- Splitwise expense mirroring

### Reconciliation

- side-by-side reconciliation UI
- unmatched transaction queue
- unmatched Splitwise expense queue
- manual one-to-one linking
- one-to-many linking
- many-to-one linking
- partial mapping via mapped amounts
- mark transaction as personal
- mark transaction as ignored
- suggested matches based on heuristics
- stale-link visibility
- reconciliation history

### Basic metadata

- tags
- categories
- notes
- account support for multiple cards/accounts

### Reliability

- unit tests for parsers
- unit tests for reconciliation heuristics
- fixture-based import tests
- audit-friendly raw data storage
- structured logging for import and sync failures

## OUT OF SCOPE for V1

### Not in V1

- investment tracking
- portfolio analytics
- retirement planning
- AI financial coaching
- automated spending advice
- predictive forecasting
- notification systems
- bank account aggregation through third-party connectors
- SMS parsing
- real-time card alerts
- mobile-native app
- background sync complexity
- PWA complexity unless it directly helps V1 usability
- public multi-user support
- cloud-hosted SaaS architecture

## UI priority for V1

The interface must be optimized for:

- rapid review
- low cognitive load
- obvious reconciliation status
- keyboard-friendly workflows
- clear trust signals

The first screen should help me understand:

- what is unmatched
- what is already reconciled
- what is personal
- what needs attention now

## What V1 is allowed to defer

V1 may defer:

- advanced dashboards
- deep analytics
- AI insights
- investment modeling
- automation
- aggressive styling polish
- broad bank support

## Non-negotiable rule

If a feature does not directly improve import reliability or reconciliation speed, it is not a V1 feature unless explicitly required to support those workflows.
