# Stock Advisor

A web app that finds the optimal buy/sell times for a stock within a user-defined time window, maximising profit given available funds.

## What it does

- Input a start/end datetime (minute granularity) and available funds
- Returns the best buy/sell pair with share count, costs, and projected profit
- Stock prices are synthetic data generated via Geometric Brownian Motion (~2.4M ticks, 1/sec during trading hours 9am–5pm Mon–Fri, Jan–Apr 2026)

## Architecture

```
lucid_task/
├── backend/          # Python FastAPI service
│   ├── main.py       # App entry point, lifespan, DB connection, static serving
│   ├── api/          # REST routes (GET /api/best-trade, GET /api/health) + DI deps
│   ├── core/         # O(n) trade optimiser + DuckDB query helper
│   └── data/         # GBM data generator + stock_prices.duckdb
├── frontend/         # React + TypeScript SPA (Vite)
│   └── src/
│       ├── App.tsx       # Form orchestration
│       ├── components/   # TimeRangePicker, FundsInput, ResultCard
│       └── api/          # Typed fetch client + generated types
└── Dockerfile        # Multi-stage build: frontend → backend serves both
```

The frontend dev server proxies `/api/*` to the backend on port 8000. In production, the backend serves the built frontend directly from `frontend/dist/`.

## Running locally (development)

**Prerequisites:** Python 3.12+, Node.js 18+

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# One-time: generate the DuckDB price database (~142 MB)
python data/generate.py

# Return to project root, then start the API server on http://localhost:8000
cd ..
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install

# Start dev server on http://localhost:5173
npm run dev
```

Open `http://localhost:5173` once both servers are running.

### Tests

```bash
# Backend
PYTHONPATH=. python -m pytest backend/tests/

# Frontend
cd frontend && npm test
```

## Running in production (Docker)

```bash
# One-time: generate the price database (required before building the image)
cd backend && python data/generate.py && cd ..

# Build and run
docker build -t stock-advisor .
docker run -p 8000:8000 \
  -v "$(pwd)/backend/data/stock_prices.duckdb:/app/backend/data/stock_prices.duckdb:ro" \
  stock-advisor
```

Open `http://localhost:8000`. Both the frontend and API are served from the same origin — no CORS configuration needed.

**Environment variables:**

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins (dev only; not needed when serving from same origin) |

## API

`GET /api/best-trade?from=<ISO>&to=<ISO>&funds=<number>`

Returns the optimal buy/sell pair within the requested time window.

`GET /api/health`

Returns `{"status": "ok"}`. Use for liveness checks.
