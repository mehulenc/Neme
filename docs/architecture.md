# Architecture

This document describes the technical architecture of Neme.

## System Overview

Neme is a two-tier application with a Python backend and a React frontend, both running locally. There is no cloud deployment — all data stays on your machine.

```text
┌─────────────────────────────────────────────────────┐
│                   Frontend (Vite)                   │
│              React 19 + TypeScript                  │
│              Tailwind CSS v4 Theming                │
│                  localhost:5173                     │
└────────────────────┬────────────────────────────────┘
                     │  HTTP (proxied)
┌────────────────────▼────────────────────────────────┐
│                 Backend (FastAPI)                   │
│              Python 3.12 + uvicorn                  │
│                  localhost:8000                     │
├─────────────────────────────────────────────────────┤
│  Modules:                                           │
│    main.py            — App setup, auth, routing    │
│    api_reconciliation — Link, match, status APIs    │
│    heuristics.py      — Auto-suggest engine         │
│    import_engine.py   — CSV ingestion pipeline      │
│    sync.py            — Splitwise mirror sync       │
│    splitwise.py       — OAuth + API client          │
│    parsers/           — Bank-specific statement parsers│
│    models.py          — SQLAlchemy ORM models       │
│    database.py        — Session factory             │
├─────────────────────────────────────────────────────┤
│  Database: SQLite (finance.db)                      │
│  Migrations: Alembic                                │
└─────────────────────────────────────────────────────┘
                     │
                     │  HTTPS
┌────────────────────▼────────────────────────────────┐
│            Splitwise API (external)                 │
│         OAuth 2.0 authenticated                     │
└─────────────────────────────────────────────────────┘
```

## Backend Modules

### `main.py`

Application entry point. Configures FastAPI, CORS, and mounts all routers. Handles Splitwise OAuth login/callback flow and persists the user ID and access token.

### `api_reconciliation.py`

Core reconciliation API. Endpoints:

- `GET /api/reconciliation/data` — Returns transactions, expenses, and heuristic match suggestions.
- `POST /api/reconciliation/link` — Creates a reconciliation link between selected items.
- `POST /api/reconciliation/transactions/{id}/status` — Updates a transaction's status (PERSONAL, IGNORED, UNMATCHED).
- `POST /api/reconciliation/quick-create` — Creates a Splitwise expense, syncs it locally, and auto-links it.

### `heuristics.py`

Pure-logic module for auto-suggest matching. Compares unmatched transactions against unmatched expenses using:

- Amount matching: checks both `paid_share` and `total_amount` within ±500 minor units.
- Date proximity: ±2 days.
- Returns confidence level (`high` for exact, `medium` for within tolerance) and human-readable reason strings.

### `import_engine.py`

Handles CSV ingestion. Creates an `ImportBatch`, runs the bank-specific parser, performs exact duplicate detection, and inserts new transactions.

### `sync.py`

Handles Splitwise expense mirroring. Fetches expenses from the API, upserts the local mirror, and flags active reconciliation links as `STALE_REVIEW_REQUIRED` when a remote expense's amount or date changes.

### `parsers/`

Bank-specific statement parsers. Each parser implements a common interface that takes raw bytes and returns a list of standardized transaction objects. All parsers use a global `clean_counterparty` utility to normalize cryptic bank descriptions into human-readable merchant names.

- **Currently Supported:** HSBC (CSV), Axis Bank (Excel), ICICI Bank (Excel .xls), Kotak Bank (MT940).
- For detailed technical implementation and cleaning heuristics, see [BANK_PARSERS.md](BANK_PARSERS.md).

## Frontend Components

### `App.tsx`

Main dashboard. Renders the side-by-side reconciliation view with:

- Left column: Bank transactions (with inline heuristic suggestions)
- Right column: Splitwise expenses (with inline heuristic suggestions)
- Floating action bar for linking, marking personal, and quick-creating
- Header with Upload CSV button, theme toggle, and refresh

### `QuickCreateModal.tsx`

Modal for creating a new Splitwise expense from a selected transaction. Supports multi-friend selection with search, even/uneven splits, and group selection.

### `UploadModal.tsx`

Modal for uploading CSV bank statements. Supports bank selection, account ID input, and drag-and-drop file upload.

## Design System

The UI uses a semantic variable architecture defined in `index.css`:

- All colors reference CSS custom properties (`--background`, `--foreground`, `--primary`, etc.)
- Light and dark themes swap values via the `.dark` class on `<html>`
- Theme preference persists in `localStorage`, defaults to light
- Typography: Space Grotesk (sans-serif) and Space Mono (monospace)
- Primary accent: Teal (`hsl(171, 76%, 41%)`)

## Data Flow

### Import Flow

```text
CSV file → UploadModal → POST /api/import → Parser → ImportEngine → SQLite
```

### Sync Flow

```text
POST /api/sync/splitwise → SplitwiseClient → sync.py → SQLite (upsert + stale detection)
```

### Reconciliation Flow

```text
GET /api/reconciliation/data → Dashboard renders both columns + heuristic suggestions
User clicks suggestion → Both items selected → Click "Link Records" → POST /api/reconciliation/link
```

### Quick-Create Flow

```text
User selects 1 txn → Click "Quick Create" → Modal → POST /api/reconciliation/quick-create
→ Splitwise API creates expense → Local sync → Auto-link created
```
