<div align="center">
  <h1 style="font-family: 'Space Grotesk', sans-serif; font-weight: 800; color: #0f766e;">NEME</h1>
  <p style="font-family: 'Space Mono', monospace;"><b>Your Personal Financial Operating System</b></p>
  <p><i>Reconcile, Track, and Trust Your Finances</i></p>
</div>

<br>

## Vision

Neme is a private, trustworthy financial operating system designed to bring together the major parts of your financial life. The first iteration focuses squarely on **trust, provenance, and reconciliation**.

Before we build predictive analytics or AI coaching, Neme ensures your ground truth is flawless by seamlessly reconciling your bank statements against your Splitwise expenses.

## Key Features

- **Splitwise Reconciliation:** Mirror your Splitwise expenses locally and reconcile them side-by-side with your bank transactions.
- **Smart Import Engine:** Easily ingest CSV statements (HSBC supported, more coming) with automatic duplicate detection and collision handling.
- **Semantic Teal Design:** A premium, meticulously crafted interface using **Space Grotesk** and **Space Mono**, with full Light/Dark Mode support powered by Tailwind CSS v4.
- **Provenance First:** Raw data is preserved. Reconciliations are auditable. Trust is paramount.

## Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Semantic Variable Architecture)
- **Typography:** Space Grotesk (Headers/UI) & Space Mono (Data)
- **Icons:** Lucide React

### Backend
- **Framework:** Python 3.12 + FastAPI
- **Database:** SQLite with SQLAlchemy ORM & Alembic Migrations
- **Data Processing:** Pandas
- **Integrations:** Splitwise API

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/Neme.git
cd Neme
```

### 2. Set up the Backend
Navigate to the `backend` directory, create a virtual environment, and run the FastAPI server:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e ".[dev]"

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```
*(Note: Create a `.env` file in the backend directory with your `SPLITWISE_API_KEY` to enable syncing.)*

### 3. Set up the Frontend
Open a new terminal window, navigate to the `frontend` directory, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```
The application will launch at `http://localhost:5173`.

## Contributing & Code Quality

Neme maintains strict code quality standards to ensure trust and reliability. We use a unified `pre-commit` pipeline to format both the Python backend and the TypeScript frontend.

**1. Install Pre-commit Hooks**
```bash
pip install pre-commit
pre-commit install
```

**2. Make your changes**
- Ensure frontend updates respect the semantic Teal design system (`bg-card`, `text-foreground`, `bg-primary`, etc.).
- Run the app locally to test your dark/light mode compatibility.

**3. Commit your changes**
Upon running `git commit`, `pre-commit` will automatically format your code using:
- `black` & `isort` for Python
- `prettier` for Frontend formatting
- `eslint` for Frontend linting

<br>

<div align="center">
  <i>Built for absolute financial clarity.</i>
</div>
