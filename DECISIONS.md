# Decisions

This file records durable decisions that should not be casually changed during implementation.

## Current decisions

- Use integer minor units for all money.
- Keep a local mirror of Splitwise expenses.
- Treat reconciliation as the core product workflow.
- Store import provenance and raw row data.
- Separate exact deduplication from semantic similarity.
- Keep V1 narrowly focused on reconciliation.
- Defer investments, forecasting, and AI insights until the core workflow is stable.

## Open decisions

- Exact CSV formats to support first
- Whether the frontend should be SPA-only or a simpler browser app for V1
- Whether AI-assisted categorization belongs in V1 or V2
- Exact status transition rules for reconciliation
