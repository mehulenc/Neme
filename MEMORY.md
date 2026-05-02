# Neme Project Memory & Learnings

## Technical Learnings

### Backend & Database
- **SQLite Migrations**: When adding columns to SQLite via Alembic, always use `server_default` for non-nullable columns to ensure existing rows are populated correctly during the migration.
- **Splitwise API Nuances**:
    - The `users` array in an expense object contains nested `user` objects which hold the `picture` data.
    - Profile pictures come in `small`, `medium`, and `large` variants. `medium` is preferred for standard UI components to balance quality and performance.
- **Audit Trails**: Manual edits should be tracked explicitly (e.g., `is_edited` flag) to distinguish between raw imported data and user-modified records.

### Frontend & UX
- **Global Event Listeners**: Implementing "Escape to deselect" requires global keyboard listeners. It's important to clean these up on component unmount to prevent memory leaks or unexpected behavior.
- **Context Selection**: When building pickers (like a friend/group picker), using `useRef` and a global "click outside" listener is the most reliable way to handle closing the picker.
- **Currency Handling**: Never hardcode currency symbols. Always use a dynamic mapping based on `currency_code` (ISO 4217) and provide fallbacks for unknown codes.
- **Recursive State**: For complex UIs like reconciliation, maintaining a clean selection state (`Set` for multiple, single ID for focus) is critical for consistent behavior.

## Implementation Patterns
- **Sync Pattern**: For Splitwise, the pattern is: Remote Edit -> Remote API Call -> Local Sync Trigger -> UI Refresh. This ensures the local database remains a faithful mirror of the source of truth.
- **Recommendation UI**: Suggested matches should be "one-click actionable". Selecting one side of a recommendation should automatically select its counterpart.

## Design Decisions
- **Transparency**: Matched items should always show what they are linked to, even if they are "stricken off" in the list. This provides an audit trail for the user.
- **Personalization**: Using real profile pictures instead of generic icons significantly improves the "premium" feel of a finance app.
