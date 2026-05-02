<div align="center">
  <h1>NEME</h1>
  <p><b>Your Personal Financial Operating System</b></p>
  <p><i>Reconcile. Track. Trust.</i></p>
</div>

<br>

## What is Neme?

Neme is a private, local-first financial tool that reconciles your bank statements against Splitwise expenses. It gives you a single source of truth for shared spending — with full provenance, auditability, and zero cloud dependency.

The first version focuses squarely on making reconciliation fast, trustworthy, and low-friction. Everything else (analytics, investments, AI insights) comes later, once the foundation is solid.

## Features

**Splitwise Reconciliation**
Mirror expenses locally and reconcile them side-by-side with bank transactions. Manual linking, quick-create, and mark-as-personal workflows.

**Heuristic Auto-Suggest**
The engine automatically suggests matches by comparing amounts (both `paid_share` and `total_amount`, with rounding tolerance) and dates (±2 days). Click a suggestion to link in one action.

**CSV Import**
Ingest bank statements with duplicate detection and collision handling. Currently supports HSBC, with more parsers planned.

**Stale Link Detection**
When a Splitwise expense changes remotely, active reconciliation links are flagged for review.

**Dark Mode**
Full light/dark theme support with a Teal accent palette, Space Grotesk typography, and localStorage persistence.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4 (semantic variables)

**Backend:** Python 3.12, FastAPI, SQLAlchemy, Alembic, SQLite

**Integrations:** Splitwise OAuth 2.0

## Getting Started

### 1. Clone

```bash
git clone https://github.com/mehulenc/Neme.git
cd Neme
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Create a `.env` file in `backend/` with your Splitwise credentials:

```
SPLITWISE_CONSUMER_KEY=your_key
SPLITWISE_CONSUMER_SECRET=your_secret
```

Then visit `http://localhost:8000/auth/splitwise/login` to authenticate.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Contributing

Pre-commit hooks enforce formatting on every commit:

```bash
pip install pre-commit
pre-commit install
```

The pipeline runs `black` + `isort` for Python, and `prettier` + `eslint` for TypeScript. Just commit normally — formatting is automatic.

When editing frontend components, use the semantic design tokens (`bg-card`, `text-foreground`, `bg-primary`, etc.) defined in `frontend/src/index.css`. Test both light and dark mode.

## Documentation

Detailed docs live in the [`docs/`](docs/) folder:

- [Vision](docs/vision.md) — Long-term product direction
- [V1 Scope](docs/v1-scope.md) — What's in and out for the first release
- [Domain Model](docs/domain-model.md) — Entity definitions, invariants, and status model
- [Architecture](docs/architecture.md) — System diagram, module descriptions, and data flows
- [Decisions](docs/decisions.md) — Durable technical decisions and open questions
