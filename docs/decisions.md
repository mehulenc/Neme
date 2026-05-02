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
