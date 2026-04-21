# Stock Advisor — Design Spec

**Date:** 2026-04-21  
**Status:** Approved  

---

## Overview

A web application that accepts a time range and available funds, then returns the optimal buy/sell times for a single stock within that range. The backend exposes a REST API backed by a synthetic per-second price dataset. The frontend is a React SPA that renders the query form and result.

---

## Decisions Log

| Question | Decision |
|---|---|
| Dataset period | Jan 1, 2026 – Apr 30, 2026 |
| Trading hours | 9:00am–5:00pm Mon–Fri (simplified, no holidays) |
| Storage | DuckDB (in-process, file-based) |
| No profitable trade | 200 response with `profitable: false`, values null/zero |
| Fractional shares | No — whole shares only (floor division) |
| Backend framework | FastAPI |
| Frontend | React + Vite + TypeScript |
| UI layout | Horizontal controls (From, To, Funds in one row), result card below |
| Date/time picker | react-datepicker, minute-level granularity |
| Project structure | Monorepo with `/backend` and `/frontend`, separate dev servers |

---

## Project Structure

```
lucid_task/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── api/
│   │   └── routes.py            # REST endpoint definitions
│   ├── core/
│   │   ├── algorithm.py         # Buy/sell optimizer (O(n))
│   │   └── db.py                # DuckDB connection + range queries
│   ├── data/
│   │   ├── generate.py          # One-off synthetic data generator
│   │   └── stock_prices.duckdb  # Generated dataset (not committed to git)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── TimeRangePicker.tsx
│   │   │   ├── FundsInput.tsx
│   │   │   └── ResultCard.tsx
│   │   └── api/
│   │       └── client.ts        # Typed fetch wrapper
│   ├── vite.config.ts           # Proxy /api → :8000
│   └── package.json
└── docs/
    └── superpowers/specs/
        └── 2026-04-21-stock-advisor-design.md
```

**Dev setup:**
- Backend: `uvicorn main:app --reload` on port 8000
- Frontend: `npm run dev` (Vite) on port 5173, with `/api` proxied to `:8000`

---

## API

### Endpoint

```
GET /api/best-trade
```

### Query Parameters

| Parameter | Type | Format | Required |
|---|---|---|---|
| `from` | string | `YYYY-MM-DDTHH:MM` | Yes |
| `to` | string | `YYYY-MM-DDTHH:MM` | Yes |
| `funds` | number | positive float | Yes |

> **Implementation note:** `from` is a reserved keyword in Python. In FastAPI, declare it as `from_dt: datetime = Query(alias="from")` to accept the `from` query parameter name without a syntax error.

### Response — Profitable Trade Found

```json
{
  "profitable": true,
  "buy_at": "2026-01-15T10:23:00",
  "sell_at": "2026-01-17T14:05:00",
  "buy_price": 142.37,
  "sell_price": 158.92,
  "shares": 7,
  "total_cost": 996.59,
  "profit": 115.85
}
```

### Response — No Profitable Trade

```json
{
  "profitable": false,
  "buy_at": null,
  "sell_at": null,
  "buy_price": null,
  "sell_price": null,
  "shares": 0,
  "total_cost": 0.0,
  "profit": 0.0
}
```

---

## Algorithm

O(n) single-pass scan over the DuckDB-fetched slice for the queried time window:

1. Iterate rows ordered by `ts` ascending
2. Track `min_price` and `min_ts` (the best candidate buy point seen so far)
3. At each tick: `candidate_profit = price - min_price`
4. If `candidate_profit > best_profit`: update `best_profit`, `best_buy_ts`, `best_sell_ts`
5. If `price < min_price`: update `min_price` and `min_ts`

**Tie-breaking** (equal profit, multiple valid pairs):
- Prefer the pair with the **earlier buy time**
- If buy times are equal, prefer the **earlier sell time** (shortest range)

**No profitable trade:** If `best_profit <= 0` after the full scan, return the no-profit response shape.

**Shares calculation:**
```
shares = floor(funds / buy_price)
total_cost = shares * buy_price
profit = shares * (sell_price - buy_price)
```

---

## Data Generation

Script: `backend/data/generate.py`  
Run once before starting the server. Writes `backend/data/stock_prices.duckdb`.

**Model:** Geometric Brownian Motion  
**Parameters:**
- Start price: $100.00
- Daily volatility: 1.5%
- Trading hours: 9:00am–5:00pm Mon–Fri
- Date range: 2026-01-01 to 2026-04-30
- Frequency: 1 row per second (~2.4M rows total)

**Schema** (table: `prices`):

| Column | Type | Example |
|---|---|---|
| `ts` | TIMESTAMP | `2026-01-02 09:00:00` |
| `price` | DOUBLE | `100.43` |

Index on `ts` for efficient range queries.

---

## Error Handling

| Scenario | HTTP Status | Message |
|---|---|---|
| `from` >= `to` | 422 | "`from` must be before `to`" |
| Range outside dataset bounds | 422 | "Valid range is 2026-01-01 to 2026-04-30" |
| `from` or `to` outside trading hours | 422 | "Times must be within trading hours (09:00–17:00 Mon–Fri)" |
| `funds` <= 0 | 422 | "`funds` must be a positive number" |
| No profitable trade | 200 | `profitable: false` (see response shape above) |
| Internal server error | 500 | "An unexpected error occurred" |

Type coercion (string → datetime, string → float) is handled automatically by FastAPI/Pydantic. Business logic checks (`from < to`, dataset bounds, trading hours, `funds > 0`) require explicit custom validators in the route or a Pydantic model with `@model_validator`.

---

## Frontend

**Stack:** React 18 + Vite + TypeScript + react-datepicker

### Components

| Component | Responsibility |
|---|---|
| `TimeRangePicker` | Two `react-datepicker` instances (From / To), minute-level, constrained to trading hours and dataset bounds |
| `FundsInput` | Numeric input for available funds, positive values only |
| `ResultCard` | Displays buy/sell date-time, prices, shares bought, total cost, profit; shows "no profitable trade" message when `profitable: false` |
| `App` | Composes all components, holds state, calls `api/client.ts` on submit |

### Result Display (when profitable)

```
Buy at:       2026-01-15 10:23
Sell at:      2026-01-17 14:05
Buy price:    $142.37
Sell price:   $158.92
Shares:       7
Total cost:   $996.59
Profit:       +$115.85
```

### Result Display (no profitable trade)

```
No profitable trade exists in the selected time range.
```

---

## Out of Scope

- Authentication / authorisation
- Multiple stocks
- Real market data
- Historical persistence of queries
- Deployment / containerisation
