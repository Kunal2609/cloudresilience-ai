# CloudResilience AI

**Model cloud architecture failures, trace their impact, and plan recovery before an incident.**

CloudResilience AI is a local-first architecture modeling and simulation tool. Build a graph of cloud resources and their relationships, run hypothetical outage or compromise scenarios, and review blast radius, resilience scores, and recovery recommendations.

> **Safety and scope:** The application analyzes only the architecture model you provide. It does not connect to, inspect, or change a live cloud account. Its scores and scenario outcomes are estimates, not production measurements or a substitute for a cloud provider's policy engine.

## What it does

- Create, edit, validate, save, and import or export cloud architecture graphs.
- Simulate failure propagation, blast radius, modeled attack paths, and recovery order.
- Review CRRS resilience scoring, recommendations, history, and what-if comparisons.
- Export Markdown reports and get deterministic explanations without an API key.
- Optionally generate narrative explanations with an LLM provider configured on the backend.

The attack-path analyzer follows explicit modeled permission and role-assumption edges. Network connectivity alone does not grant authorization. IAM analysis is a modeled subset and does not evaluate the full AWS policy language.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Flow, Recharts |
| Backend | FastAPI, Pydantic, NetworkX, SQLAlchemy |
| Storage | SQLite for native development; PostgreSQL with Docker Compose |

## Quick start with Docker

Requirements: Docker Desktop with Docker Compose.

```powershell
docker compose up --build
```

Then open:

- Frontend: <http://localhost:5173>
- API documentation: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/health>

Compose starts PostgreSQL, the API, and the frontend. Database files persist in the `postgres_data` volume. Stop the stack with `Ctrl+C` or `docker compose down`. `docker compose down -v` also removes the database volume and its data.

Copy `.env.example` to `.env` to customize local configuration. Keep real API keys and passwords in `.env`; it is ignored by Git.

## Run locally without Docker

Requirements: Python 3.12 or later and Node.js/npm.

Start the API in one PowerShell window:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Start the frontend in another window:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Native development uses SQLite by default and stores its database in the backend working directory.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Database connection; defaults to SQLite for native development. Compose configures PostgreSQL. |
| `OPENAI_API_KEY` | Optional backend-only key for generated explanations. |
| `GEMINI_API_KEY` | Optional backend-only key for generated explanations. |

The deterministic explanation path works when no LLM key is configured. Never put provider keys in frontend variables or commit a populated `.env` file.

## Development checks

Backend tests:

```powershell
cd backend
python -m pytest -q
```

Frontend production build:

```powershell
cd frontend
npm run build
```

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for the implementation checklist, verification record, and known gaps. API integration coverage and container startup are not fully verified in the recorded environment.

## Project layout

```text
backend/       FastAPI application, simulation engine, persistence, and tests
frontend/      React and TypeScript application
docker-compose.yml
.env.example   Safe local configuration template
```

## Current limitations

- No authentication or multi-user workspaces; intended for local use.
- No full IAM policy evaluation, live AWS inventory, Terraform import, or cloud changes.
- No Alembic migration workflow is configured yet.
- Terraform, PDF/CSV reporting, AI chat/copilot, and Docker chaos testing are not implemented.
- The Compose setup uses PostgreSQL; native development defaults to SQLite.

## License

No license has been added yet. Until a license is chosen, standard copyright restrictions apply to reuse and redistribution.
