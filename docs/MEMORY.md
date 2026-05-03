# Neme Project Memory & Learnings

This document tracks the evolving logic, key technical learnings, and milestone decisions made during the development of Neme.

## Technical Learnings

### Backend & Database
- **SQLite Migrations**: When adding columns to SQLite via Alembic, always use `server_default` for non-nullable columns to ensure existing rows are populated correctly during the migration.
- **Splitwise API Nuances**:
    - The `users` array in an expense object contains nested `user` objects which hold the `picture` data.
    - Profile pictures come in `small`, `medium`, and `large` variants. `medium` is preferred for standard UI components to balance quality and performance.
    - Unlike creation, updating an expense in Splitwise requires a `POST` request to `/update_expense/{id}` rather than a `PATCH` or `PUT`.
- **Audit Trails**: Manual edits should be tracked explicitly (e.g., `is_edited` flag) to distinguish between raw imported data and user-modified records.
- **Stale Link Detection**: Reconciliation links must track a `STALE_REVIEW_REQUIRED` status to handle remote Splitwise updates without breaking local data integrity.
- **TypeScript & Vite**: With `allowImportingTsExtensions: true` in `tsconfig`, imports must be very explicit. If module resolution fails, adding the `.tsx` extension manually often resolves the issue.

### Frontend & UX
- **Global Event Listeners**: Implementing "Escape to deselect" requires global keyboard listeners. It's important to clean these up on component unmount to prevent memory leaks or unexpected behavior.
- **Context Selection**: When building pickers (like a friend/group picker), using `useRef` and a global "click outside" listener is the most reliable way to handle closing the picker.
- **Currency Handling**: Never hardcode currency symbols. Always use a dynamic mapping based on `currency_code` (ISO 4217) and provide fallbacks for unknown codes.
- **Recursive State**: For complex UIs like reconciliation, maintaining a clean selection state (`Set` for multiple, single ID for focus) is critical for consistent behavior.
- **The "Baton" Selection**: Selecting a transaction should ideally suggest the best Splitwise match automatically to reduce clicks.
- **Modal Fatigue**: Instead of opening new pages, using overlays (Modals) for Quick-Create, Edit, and Conflict Resolution keeps the user in the context of the dual-column reconciliation view.
- **Interactive Bar**: The floating action bar serves as a "Bridge" between columns, allowing users to jump from a selected transaction to its linked expense and vice versa.

### Data Processing & Parsers
- **SWIFT MT940**: When parsing MT940 files, isolate the Tag 4 block to separate the core transaction data from the bank's transmission headers. This ensures the parser isn't confused by metadata.
- **Counterparty Normalization**: Suffixes like "INDIA PRIVATE LIMITED" or "PVT LTD" add noise to matching heuristics. Stripping these legal suffixes during import significantly improves the "human-readability" of the dashboard.
- **Anonymization Logic**: For demo environments, use a systematic anonymization approach (e.g., mapping all names to "John Doe", "Jane Smith") rather than just deleting data. This preserves the "feel" and density of the UI while ensuring privacy.

## Implementation Patterns
- **Sync Pattern**: For Splitwise, the pattern is: Remote Edit -> Remote API Call -> Local Sync Trigger -> UI Refresh. This ensures the local database remains a faithful mirror of the source of truth.
- **Recommendation UI**: Suggested matches should be "one-click actionable". Selecting one side of a recommendation should automatically select its counterpart.
- **Heuristic Engine**: Use a ±2 day date window and ±5.00 units tolerance for amount matching to account for bank processing delays and minor currency rounding.
- **Conflict Review**: Stale links are handled by freezing the current link and requiring a manual "Approve" or "Dismiss" action. This prevents remote updates from silently changing local reconciliation history.
- **Manual Edits**: When a user edits a transaction (e.g., fixes a merchant name), we flag it as `is_edited`. The original description is preserved in `raw_description` to maintain auditability.

## Design Decisions
- **Transparency**: Matched items should always show what they are linked to, even if they are "stricken off" in the list. This provides an audit trail for the user.
- **Personalization**: Using real profile pictures instead of generic icons significantly improves the "premium" feel of a finance app.
- **Bi-Directional Navigation**: Users should be able to "jump" between matched counterparts (Bank -> Splitwise and vice-versa) directly from the item details or action bar.

## Milestone Memories

### 2026-05-03: Professional Parser Support
- **Feature**: Added support for Kotak MT940 (SWIFT) statements.
- **Implementation**: Leveraged the `mt940` library with Tag 4 isolation.

### 2026-05-02: The Conflict Resolution Release
- **Feature**: Implemented the end-to-end Conflict Resolution workflow.
- **UI**: Added the high-visibility "Stale Matches" banner and the side-by-side Diff Modal.
- **Backend**: Added the `resolve` endpoint to bulk-process conflict decisions.

### 2026-05-02: V1.5 UI Overhaul
- **Feature**: Manual editing for both transactions and expenses.
- **UX**: Added keyboard shortcuts (Escape to deselect) and click-outside behavior for cleaner state management.
- **Visuals**: Integrated Splitwise profile pictures and expanded "Split Details" view for expenses.
