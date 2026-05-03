# Neme Backend

The Neme backend is a FastAPI application that handles bank statement parsing, Splitwise synchronization, and reconciliation logic.

## Tech Stack

- **Python 3.12**
- **FastAPI**: Modern, fast (high-performance) web framework.
- **SQLAlchemy**: SQL Toolkit and Object Relational Mapper.
- **Alembic**: Database migrations.
- **SQLite**: Local-first storage.

## Key Modules

- `app/parsers/`: Bank-specific statement parsers (HSBC, Axis, ICICI, Kotak).
- `app/heuristics.py`: Logic for suggested matches.
- `app/sync.py`: Splitwise expense mirroring.
- `app/splitwise.py`: OAuth client for Splitwise.

## Setup

1. Create a virtual environment: `python -m venv .venv`
2. Activate it: `source .venv/bin/activate`
3. Install dependencies: `pip install -e ".[dev]"`
4. Run migrations: `alembic upgrade head`
5. Start the server: `uvicorn app.main:app --reload --port 8000`

## Environment Variables

Create a `.env` file with:
```env
SPLITWISE_CONSUMER_KEY=your_key
SPLITWISE_CONSUMER_SECRET=your_secret
DATABASE_URL=sqlite:///./finance.db
```
