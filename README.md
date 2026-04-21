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
│   ├── main.py       # App entry point, lifespan, DB connection
│   ├── api/          # REST routes (GET /api/best-trade)
│   ├── core/         # O(n) trade optimiser + DuckDB query helper
│   └── data/         # GBM data generator + stock_prices.duckdb
└── frontend/         # React + TypeScript SPA (Vite)
    └── src/
        ├── App.tsx       # Form orchestration
        ├── components/   # TimeRangePicker, FundsInput, ResultCard
        └── api/          # Typed fetch client
```

The frontend dev server proxies `/api/*` to the backend on port 8000.

## Running locally

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
cd backend && pytest

# Frontend
cd frontend && npm run test
```
