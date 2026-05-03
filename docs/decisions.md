# Decisions

This file records durable decisions that should not be casually changed during implementation.

## Settled decisions

- Use integer minor units for all money.
- Keep a local mirror of Splitwise expenses.
- Treat reconciliation as the core product workflow.
- Store import provenance and raw row data.
- Separate exact deduplication from semantic similarity.
- Keep V1 narrowly focused on reconciliation.
- Defer investments, forecasting, and AI insights until the core workflow is stable.
- Frontend is a React SPA using Vite and Tailwind CSS v4.
- Use a semantic design system (CSS variables) for theming instead of hardcoded utility classes.
- Primary color: Teal. Typography: Space Grotesk (UI) and Space Mono (data).
- Dark mode support via `.dark` class toggle, persisted in localStorage, defaults to light.
- Pre-commit hooks enforce formatting: black + isort (Python), prettier + eslint (TypeScript).
- HSBC CSV is the first supported bank statement format.
- Splitwise OAuth 2.0 with token storage in the database (`system_settings` table).
- Heuristic matching checks both `paid_share` and `total_amount` with ±500 minor units tolerance and ±2 day date window.
- Stale link detection: when a Splitwise expense changes remotely, active links are flagged `STALE_REVIEW_REQUIRED`.
- Conflict resolution: User must explicitly Approve or Dismiss stale links in a dedicated review UI.
- Manual editability: Local edits are allowed for counterparty/amount/date, but tracked via `is_edited` to preserve audit trail.
- UI transparency: Linked items remain visible/navigable even after reconciliation (no "black hole" UI).
- Dynamic currencies: All UIs must support dynamic currency symbols based on the data's `currency_code`.

## Open decisions

- Whether AI-assisted categorization belongs in V1 or V2.
- Exact status transition rules for reconciliation (state machine formalization).
- How to handle multi-currency reconciliation (e.g. INR transaction matching a USD Splitwise expense) — currently, UI supports dynamic symbols, but cross-currency amount matching requires a conversion engine.
- Whether to support one-to-many linking in the UI (backend supports it, frontend currently does one-to-one).

---

## ADR 007: MT940 Support for Bank Statements

**Date**: 2026-05-03
**Status**: Accepted

**Context**:
Many banks (like Kotak) provide MT940 exports. While CSV is human-readable, it is brittle. MT940 is a standardized SWIFT format used globally for bank statements.

**Decision**:
We will support MT940 as the professional standard for bank statement imports in Neme. We will use the `mt940` Python library for robust parsing.

**Consequences**:
- More reliable automated reconciliation.
- Standardized parser can be reused for multiple banks.
- Users can import professional-grade statements directly.

---

## ADR 008: Sanitized Test Environment

**Date**: 2026-05-03
**Status**: Accepted

**Context**:
When demonstrating the application or conducting development tests, using real financial data is a security risk. We need a way to verify UI and logic with realistic but anonymous data.

**Decision**:
We will support a dedicated "Test Environment" mode. By setting `DATABASE_URL` to `test.db`, the system will point to a sanitized database. We will maintain a script (`scripts/generate_test_data.py`) to populate this database with anonymized "John Doe" style records that mimic real financial patterns.

**Consequences**:
- Safe demonstration of the product without leaking personal data.
- Faster development iteration with controlled data sets.
- Consistent fixture data for automated UI testing.
