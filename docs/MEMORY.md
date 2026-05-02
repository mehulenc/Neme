# Project Memory

This document tracks the evolving logic, key technical learnings, and milestone decisions made during the development of Neme.

## Key Learnings

### Technical Gotchas
- **Splitwise API Updates**: Unlike creation, updating an expense in Splitwise requires a `POST` request to `/update_expense/{id}` rather than a `PATCH` or `PUT`.
- **TypeScript & Vite**: With `allowImportingTsExtensions: true` in `tsconfig`, imports must be very explicit. If module resolution fails, adding the `.tsx` extension manually often resolves the issue.
- **Rounding in Heuristics**: Financial data across different systems (Bank vs. Splitwise) often has minor rounding discrepancies. We implemented a ±500 minor unit (5.00 currency units) tolerance for heuristic matching to account for this.

### UI/UX Insights
- **The "Baton" Selection**: Selecting a transaction should ideally suggest the best Splitwise match automatically to reduce clicks.
- **Modal Fatigue**: Instead of opening new pages, using overlays (Modals) for Quick-Create, Edit, and Conflict Resolution keeps the user in the context of the dual-column reconciliation view.
- **Interactive Bar**: The floating action bar serves as a "Bridge" between columns, allowing users to jump from a selected transaction to its linked expense and vice versa.

## Decisions

### Architecture
- **Stale Link Detection**: Instead of automatically updating local links when Splitwise data changes, we mark them as `STALE_REVIEW_REQUIRED`. This preserves data integrity by forcing a human to "Approve" or "Break" the link when a discrepancy is detected.
- **Local-First Sync**: We treat the local SQLite database as the primary source of truth for the dashboard, syncing with Splitwise periodically rather than fetching on every render.

### Data Model
- **Manual Editability**: Added `is_edited` flag to Transactions. This allows users to fix bank OCR errors or counterparty names without losing the connection to the original raw data.
- **Currency Mapping**: Decided to store all amounts in minor units (integers) but implemented a dynamic frontend mapping for symbols (₹, $, £, €) to support multi-currency households.
- **CRUD Endpoints**: Implemented `PATCH` endpoints for both Transactions and Expenses to allow direct correction of mismatched data before linking.

## Milestone Memories

### 2026-05-02: The Conflict Resolution Release
- **Feature**: Implemented the end-to-end Conflict Resolution workflow.
- **UI**: Added the high-visibility "Stale Matches" banner and the side-by-side Diff Modal.
- **Backend**: Added the `resolve` endpoint to bulk-process conflict decisions.

### 2026-05-02: V1.5 UI Overhaul
- **Feature**: Manual editing for both transactions and expenses.
- **UX**: Added keyboard shortcuts (Escape to deselect) and click-outside behavior for cleaner state management.
- **Visuals**: Integrated Splitwise profile pictures and expanded "Split Details" view for expenses.
