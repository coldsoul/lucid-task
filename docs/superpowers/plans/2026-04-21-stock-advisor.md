# Stock Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web app that accepts a time range and available funds and returns the optimal buy/sell times for a single synthetic stock.

**Architecture:** FastAPI backend with a DuckDB dataset of ~2.4M per-second price ticks (Jan–Apr 2026, 9am–5pm Mon–Fri). An O(n) single-pass algorithm finds the maximum-profit buy/sell pair in the queried range. A React/Vite frontend with `react-datepicker` sends queries and renders the result.

**Tech Stack:** Python 3.12, FastAPI, DuckDB, NumPy, pandas, pytest, httpx — React 18, TypeScript, Vite, react-datepicker, Vitest, @testing-library/react.

---

## File Map

```
lucid_task/
├── backend/
│   ├── main.py                        # FastAPI app + lifespan (DB open/close)
│   ├── api/
│   │   └── routes.py                  # GET /api/best-trade, validation, response model
│   ├── core/
│   │   ├── algorithm.py               # find_best_trade() — pure O(n) optimizer
│   │   └── db.py                      # get_prices_in_range() — DuckDB query helper
│   ├── data/
│   │   ├── generate.py                # One-off script: writes stock_prices.duckdb
│   │   └── stock_prices.duckdb        # Generated — not committed to git
│   ├── tests/
│   │   ├── conftest.py                # Shared fixtures (in-memory DuckDB, test client)
│   │   ├── test_generate.py           # Unit tests for data generation helpers
│   │   ├── test_algorithm.py          # Unit tests for find_best_trade
│   │   ├── test_db.py                 # Unit tests for get_prices_in_range
│   │   └── test_api.py                # Integration tests via FastAPI TestClient
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Root: state, submit handler, layout
│   │   ├── components/
│   │   │   ├── TimeRangePicker.tsx    # Two react-datepicker instances (From/To)
│   │   │   ├── FundsInput.tsx         # Numeric funds input with validation
│   │   │   └── ResultCard.tsx         # Displays trade result or no-profit message
│   │   ├── api/
│   │   │   └── client.ts              # Typed fetch wrapper → /api/best-trade
│   │   ├── utils/
│   │   │   └── format.ts              # formatForApi — Date → YYYY-MM-DDTHH:MM string
│   │   └── test/
│   │       └── setup.ts               # @testing-library/jest-dom import
│   ├── vite.config.ts                 # Vitest config + /api proxy to :8000
│   ├── tsconfig.json
│   └── package.json
├── .gitignore
└── docs/
    └── superpowers/
        ├── specs/2026-04-21-stock-advisor-design.md
        └── plans/2026-04-21-stock-advisor.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `backend/requirements.txt`
- Create: `.gitignore`
- Create: `backend/__init__.py`, `backend/api/__init__.py`, `backend/core/__init__.py`, `backend/data/__init__.py`, `backend/tests/__init__.py`
- Create: `frontend/` (via Vite scaffold)

- [ ] **Step 1: Create backend directory structure**

```bash
mkdir -p backend/api backend/core backend/data backend/tests
touch backend/__init__.py backend/api/__init__.py backend/core/__init__.py backend/data/__init__.py backend/tests/__init__.py
```

- [ ] **Step 2: Write requirements.txt**

Create `backend/requirements.txt`:
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
duckdb>=0.10.0
numpy>=1.26.0
pandas>=2.2.0
pydantic>=2.7.0
pytest>=8.2.0
httpx>=0.27.0
```

- [ ] **Step 3: Create and activate Python virtual environment**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Expected: packages install without errors. `pip show fastapi duckdb numpy` should all show versions.

- [ ] **Step 4: Scaffold the frontend with Vite**

```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-datepicker
npm install --save-dev @types/react-datepicker vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected: `frontend/node_modules` created, no errors.

- [ ] **Step 5: Create .gitignore**

Create `.gitignore` at repo root:
```
# Python
backend/.venv/
backend/__pycache__/
backend/**/__pycache__/
backend/data/stock_prices.duckdb
*.pyc

# Frontend
frontend/node_modules/
frontend/dist/

# Brainstorm mockups
.superpowers/
```

- [ ] **Step 6: Commit**

```bash
git init
git add backend/requirements.txt backend/__init__.py backend/api/__init__.py backend/core/__init__.py backend/data/__init__.py backend/tests/__init__.py frontend/package.json frontend/vite.config.ts frontend/tsconfig.json .gitignore
git commit -m "feat: project scaffold — backend and frontend directories"
```

---

## Task 2: Synthetic Data Generator

**Files:**
- Create: `backend/data/generate.py`
- Create: `backend/tests/test_generate.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_generate.py`:
```python
from datetime import date, datetime
from backend.data.generate import trading_days, generate_prices


def test_trading_days_skips_weekends():
    # 2026-01-01 is Thursday; 2026-01-07 is Wednesday
    days = list(trading_days(date(2026, 1, 1), date(2026, 1, 7)))
    assert len(days) == 5
    assert date(2026, 1, 3) not in days  # Saturday
    assert date(2026, 1, 4) not in days  # Sunday


def test_trading_days_single_weekend_day_excluded():
    days = list(trading_days(date(2026, 1, 3), date(2026, 1, 3)))  # Saturday
    assert days == []


def test_generate_prices_row_count():
    # 2 trading days (Mon-Tue) × 28800 seconds/day = 57600 rows
    prices = generate_prices(
        start=date(2026, 1, 5),
        end=date(2026, 1, 6),
        start_price=100.0,
        seed=42,
    )
    assert len(prices) == 57600


def test_generate_prices_timestamps_in_order():
    prices = generate_prices(
        start=date(2026, 1, 5),
        end=date(2026, 1, 5),
        start_price=100.0,
        seed=42,
    )
    timestamps = [p[0] for p in prices]
    assert timestamps == sorted(timestamps)


def test_generate_prices_first_timestamp():
    prices = generate_prices(
        start=date(2026, 1, 5),
        end=date(2026, 1, 5),
        start_price=100.0,
        seed=42,
    )
    assert prices[0][0] == datetime(2026, 1, 5, 9, 0, 0)


def test_generate_prices_last_timestamp():
    prices = generate_prices(
        start=date(2026, 1, 5),
        end=date(2026, 1, 5),
        start_price=100.0,
        seed=42,
    )
    assert prices[-1][0] == datetime(2026, 1, 5, 16, 59, 59)


def test_generate_prices_are_positive():
    prices = generate_prices(
        start=date(2026, 1, 5),
        end=date(2026, 1, 5),
        start_price=100.0,
        seed=42,
    )
    assert all(p[1] > 0 for p in prices)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && source .venv/bin/activate
pytest tests/test_generate.py -v
```

Expected: `ModuleNotFoundError: No module named 'backend.data.generate'`

- [ ] **Step 3: Implement generate.py**

Create `backend/data/generate.py`:
```python
import numpy as np
import duckdb
import pandas as pd
from datetime import date, datetime, time, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "stock_prices.duckdb"
MARKET_OPEN = time(9, 0, 0)
SECONDS_PER_DAY = (17 - 9) * 3600  # 28800


def trading_days(start: date, end: date):
    current = start
    while current <= end:
        if current.weekday() < 5:
            yield current
        current += timedelta(days=1)


def generate_prices(
    start: date,
    end: date,
    start_price: float = 100.0,
    daily_volatility: float = 0.015,
    seed: int = 42,
) -> list[tuple[datetime, float]]:
    rng = np.random.default_rng(seed)
    dt = 1.0 / SECONDS_PER_DAY
    sigma = daily_volatility

    prices = []
    price = start_price

    for day in trading_days(start, end):
        day_start = datetime.combine(day, MARKET_OPEN)
        for second in range(SECONDS_PER_DAY):
            ts = day_start + timedelta(seconds=second)
            prices.append((ts, round(float(price), 6)))
            price *= float(
                np.exp(-0.5 * sigma**2 * dt + sigma * np.sqrt(dt) * rng.standard_normal())
            )

    return prices


def write_to_duckdb(prices: list[tuple[datetime, float]], db_path: Path = DB_PATH) -> int:
    df = pd.DataFrame(prices, columns=["ts", "price"])
    conn = duckdb.connect(str(db_path))
    conn.execute("DROP TABLE IF EXISTS prices")
    conn.execute("CREATE TABLE prices AS SELECT * FROM df")
    conn.execute("CREATE INDEX idx_ts ON prices (ts)")
    count = conn.execute("SELECT COUNT(*) FROM prices").fetchone()[0]
    conn.close()
    return count


if __name__ == "__main__":
    from datetime import date as d
    print("Generating synthetic stock prices...")
    prices = generate_prices(start=d(2026, 1, 1), end=d(2026, 4, 30))
    count = write_to_duckdb(prices)
    print(f"Written {count:,} rows to {DB_PATH}")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_generate.py -v
```

Expected:
```
PASSED tests/test_generate.py::test_trading_days_skips_weekends
PASSED tests/test_generate.py::test_trading_days_single_weekend_day_excluded
PASSED tests/test_generate.py::test_generate_prices_row_count
PASSED tests/test_generate.py::test_generate_prices_timestamps_in_order
PASSED tests/test_generate.py::test_generate_prices_first_timestamp
PASSED tests/test_generate.py::test_generate_prices_last_timestamp
PASSED tests/test_generate.py::test_generate_prices_are_positive
7 passed in ...
```

- [ ] **Step 5: Run the generator to create the dataset**

```bash
python -m backend.data.generate
```

Expected:
```
Generating synthetic stock prices...
Written 2,419,200 rows to .../backend/data/stock_prices.duckdb
```

(Exact row count depends on trading days in Jan–Apr 2026. Will be ~2.4M.)

- [ ] **Step 6: Commit**

```bash
git add backend/data/generate.py backend/tests/test_generate.py
git commit -m "feat: synthetic data generator using GBM, writes DuckDB dataset"
```

---

## Task 3: Algorithm

**Files:**
- Create: `backend/core/algorithm.py`
- Create: `backend/tests/test_algorithm.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_algorithm.py`:
```python
import math
from datetime import datetime
from backend.core.algorithm import find_best_trade, TradeResult

T0 = datetime(2026, 1, 2, 9, 0, 0)
T1 = datetime(2026, 1, 2, 9, 0, 1)
T2 = datetime(2026, 1, 2, 9, 0, 2)
T3 = datetime(2026, 1, 2, 9, 0, 3)


def test_basic_profitable_trade():
    prices = [(T0, 100.0), (T1, 150.0)]
    result = find_best_trade(prices, 1000.0)
    assert result.profitable is True
    assert result.buy_at == T0
    assert result.sell_at == T1
    assert result.buy_price == 100.0
    assert result.sell_price == 150.0
    assert result.shares == 10
    assert result.total_cost == 1000.0
    assert result.profit == 500.0


def test_no_profitable_trade_decreasing():
    prices = [(T0, 150.0), (T1, 100.0)]
    result = find_best_trade(prices, 1000.0)
    assert result.profitable is False
    assert result.buy_at is None
    assert result.sell_at is None
    assert result.buy_price is None
    assert result.sell_price is None
    assert result.shares == 0
    assert result.total_cost == 0.0
    assert result.profit == 0.0


def test_all_equal_prices_not_profitable():
    prices = [(T0, 100.0), (T1, 100.0), (T2, 100.0)]
    result = find_best_trade(prices, 1000.0)
    assert result.profitable is False


def test_empty_prices():
    result = find_best_trade([], 1000.0)
    assert result.profitable is False


def test_single_price():
    result = find_best_trade([(T0, 100.0)], 1000.0)
    assert result.profitable is False


def test_tiebreak_earliest_buy_retained():
    # T0@10 and T1@10 both give profit 10 when sold at T2@20 and T3@20.
    # The scan naturally keeps (T0, T2) — earliest buy, shortest range.
    prices = [(T0, 10.0), (T1, 10.0), (T2, 20.0), (T3, 20.0)]
    result = find_best_trade(prices, 100.0)
    assert result.buy_at == T0
    assert result.sell_at == T2


def test_tiebreak_later_minimum_not_preferred():
    # Same profit 10 achievable as (T0@10, T1@20) and (T2@9, T3@19).
    # (T0, T1) has earlier buy — must be kept.
    prices = [(T0, 10.0), (T1, 20.0), (T2, 9.0), (T3, 19.0)]
    result = find_best_trade(prices, 100.0)
    assert result.buy_at == T0
    assert result.sell_at == T1


def test_whole_shares_floor_division():
    prices = [(T0, 47.32), (T1, 58.00)]
    result = find_best_trade(prices, 1000.0)
    assert result.shares == 21  # floor(1000 / 47.32)
    assert result.total_cost == round(21 * 47.32, 2)
    assert result.profit == round(21 * (58.00 - 47.32), 2)


def test_funds_too_small_for_one_share():
    prices = [(T0, 200.0), (T1, 300.0)]
    result = find_best_trade(prices, 100.0)
    # Can't buy even one share at 200 with only 100
    assert result.profitable is True  # trade exists in market
    assert result.shares == 0
    assert result.profit == 0.0


def test_best_profit_in_middle():
    # Global min at T1, best sell at T2
    prices = [(T0, 50.0), (T1, 30.0), (T2, 80.0), (T3, 40.0)]
    result = find_best_trade(prices, 300.0)
    assert result.buy_at == T1
    assert result.sell_at == T2
    assert result.buy_price == 30.0
    assert result.sell_price == 80.0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_algorithm.py -v
```

Expected: `ModuleNotFoundError: No module named 'backend.core.algorithm'`

- [ ] **Step 3: Implement algorithm.py**

Create `backend/core/algorithm.py`:
```python
import math
from dataclasses import dataclass
from datetime import datetime


@dataclass
class TradeResult:
    profitable: bool
    buy_at: datetime | None
    sell_at: datetime | None
    buy_price: float | None
    sell_price: float | None
    shares: int
    total_cost: float
    profit: float


def find_best_trade(
    prices: list[tuple[datetime, float]],
    funds: float,
) -> TradeResult:
    _no_trade = TradeResult(
        profitable=False,
        buy_at=None,
        sell_at=None,
        buy_price=None,
        sell_price=None,
        shares=0,
        total_cost=0.0,
        profit=0.0,
    )

    if len(prices) < 2:
        return _no_trade

    min_price = prices[0][1]
    min_ts = prices[0][0]
    best_profit = 0.0
    best_buy_ts: datetime | None = None
    best_sell_ts: datetime | None = None
    best_buy_price: float | None = None
    best_sell_price: float | None = None

    for ts, price in prices[1:]:
        candidate = price - min_price
        if candidate > best_profit:
            best_profit = candidate
            best_buy_ts = min_ts
            best_sell_ts = ts
            best_buy_price = min_price
            best_sell_price = price
        if price < min_price:
            min_price = price
            min_ts = ts

    if best_profit <= 0 or best_buy_ts is None:
        return _no_trade

    shares = math.floor(funds / best_buy_price)
    total_cost = round(shares * best_buy_price, 2)
    profit = round(shares * (best_sell_price - best_buy_price), 2)

    return TradeResult(
        profitable=True,
        buy_at=best_buy_ts,
        sell_at=best_sell_ts,
        buy_price=round(best_buy_price, 2),
        sell_price=round(best_sell_price, 2),
        shares=shares,
        total_cost=total_cost,
        profit=profit,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_algorithm.py -v
```

Expected: `9 passed in ...`

- [ ] **Step 5: Commit**

```bash
git add backend/core/algorithm.py backend/tests/test_algorithm.py
git commit -m "feat: O(n) buy/sell optimizer with tie-breaking and whole-share calculation"
```

---

## Task 4: Database Layer

**Files:**
- Create: `backend/core/db.py`
- Create: `backend/tests/test_db.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_db.py`:
```python
import duckdb
import pytest
from datetime import datetime
from backend.core.db import get_prices_in_range


@pytest.fixture
def conn():
    c = duckdb.connect(":memory:")
    c.execute("""
        CREATE TABLE prices (ts TIMESTAMP, price DOUBLE);
        INSERT INTO prices VALUES
            ('2026-01-02 09:00:00', 100.0),
            ('2026-01-02 09:00:01', 101.0),
            ('2026-01-02 09:00:02', 99.0),
            ('2026-01-02 09:00:03', 102.0);
    """)
    yield c
    c.close()


def test_returns_all_rows_in_range(conn):
    rows = get_prices_in_range(
        conn,
        datetime(2026, 1, 2, 9, 0, 0),
        datetime(2026, 1, 2, 9, 0, 3),
    )
    assert len(rows) == 4


def test_returns_rows_in_ascending_order(conn):
    rows = get_prices_in_range(
        conn,
        datetime(2026, 1, 2, 9, 0, 0),
        datetime(2026, 1, 2, 9, 0, 3),
    )
    timestamps = [r[0] for r in rows]
    assert timestamps == sorted(timestamps)


def test_partial_range(conn):
    rows = get_prices_in_range(
        conn,
        datetime(2026, 1, 2, 9, 0, 1),
        datetime(2026, 1, 2, 9, 0, 2),
    )
    assert len(rows) == 2
    assert rows[0][1] == 101.0
    assert rows[1][1] == 99.0


def test_empty_range_returns_empty(conn):
    rows = get_prices_in_range(
        conn,
        datetime(2026, 1, 3, 9, 0, 0),
        datetime(2026, 1, 3, 17, 0, 0),
    )
    assert rows == []


def test_row_shape(conn):
    rows = get_prices_in_range(
        conn,
        datetime(2026, 1, 2, 9, 0, 0),
        datetime(2026, 1, 2, 9, 0, 0),
    )
    assert len(rows) == 1
    ts, price = rows[0]
    assert isinstance(ts, datetime)
    assert isinstance(price, float)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_db.py -v
```

Expected: `ModuleNotFoundError: No module named 'backend.core.db'`

- [ ] **Step 3: Implement db.py**

Create `backend/core/db.py`:
```python
import duckdb
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "stock_prices.duckdb"


def get_prices_in_range(
    conn: duckdb.DuckDBPyConnection,
    from_dt: datetime,
    to_dt: datetime,
) -> list[tuple[datetime, float]]:
    rows = conn.execute(
        "SELECT ts, price FROM prices WHERE ts >= ? AND ts <= ? ORDER BY ts ASC",
        [from_dt, to_dt],
    ).fetchall()
    return [(row[0], float(row[1])) for row in rows]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_db.py -v
```

Expected: `5 passed in ...`

- [ ] **Step 5: Commit**

```bash
git add backend/core/db.py backend/tests/test_db.py
git commit -m "feat: DuckDB range query helper"
```

---

## Task 5: FastAPI Application

**Files:**
- Create: `backend/main.py`
- Create: `backend/api/routes.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/conftest.py`:
```python
import duckdb
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def db_conn():
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE prices (ts TIMESTAMP, price DOUBLE);
        INSERT INTO prices VALUES
            ('2026-01-02 09:00:00', 100.0),
            ('2026-01-02 10:00:00', 150.0),
            ('2026-01-02 16:00:00', 80.0);
    """)
    yield conn
    conn.close()


@pytest.fixture
def client(db_conn):
    from backend.main import app
    app.state.db = db_conn
    # Use TestClient without context manager to skip lifespan
    # (lifespan would try to open the real .duckdb file)
    return TestClient(app)
```

Create `backend/tests/test_api.py`:
```python
def test_profitable_trade(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T09:00",
        "to": "2026-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["profitable"] is True
    assert data["buy_at"].startswith("2026-01-02T09:00")
    assert data["sell_at"].startswith("2026-01-02T10:00")
    assert data["shares"] == 10
    assert data["profit"] == 500.0


def test_no_profitable_trade(client):
    # Only descending prices available from 10:00 onward
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T10:00",
        "to": "2026-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["profitable"] is False
    assert data["shares"] == 0
    assert data["profit"] == 0.0


def test_from_must_be_before_to(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T17:00",
        "to": "2026-01-02T09:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "`from` must be before `to`" in response.json()["detail"]


def test_range_outside_dataset_bounds(client):
    response = client.get("/api/best-trade", params={
        "from": "2025-01-01T09:00",
        "to": "2025-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "2026-01-01" in response.json()["detail"]


def test_outside_trading_hours(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T06:00",
        "to": "2026-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "trading hours" in response.json()["detail"]


def test_weekend_rejected(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-03T09:00",  # Saturday
        "to": "2026-01-03T17:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "trading hours" in response.json()["detail"]


def test_negative_funds_rejected(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T09:00",
        "to": "2026-01-02T17:00",
        "funds": -100,
    })
    assert response.status_code == 422


def test_missing_parameter(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T09:00",
        "to": "2026-01-02T17:00",
        # funds missing
    })
    assert response.status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_api.py -v
```

Expected: `ModuleNotFoundError: No module named 'backend.main'`

- [ ] **Step 3: Implement routes.py**

Create `backend/api/routes.py`:
```python
from datetime import datetime, time
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from backend.core.algorithm import find_best_trade, TradeResult
from backend.core.db import get_prices_in_range

router = APIRouter()

_DATASET_START = datetime(2026, 1, 1, 9, 0)
_DATASET_END = datetime(2026, 4, 30, 17, 0)
_TRADING_OPEN = time(9, 0)
_TRADING_CLOSE = time(17, 0)


class TradeResponse(BaseModel):
    profitable: bool
    buy_at: datetime | None
    sell_at: datetime | None
    buy_price: float | None
    sell_price: float | None
    shares: int
    total_cost: float
    profit: float


@router.get("/best-trade", response_model=TradeResponse)
def best_trade(
    request: Request,
    from_dt: datetime = Query(alias="from"),
    to_dt: datetime = Query(alias="to"),
    funds: float = Query(gt=0),
) -> TradeResponse:
    if from_dt >= to_dt:
        raise HTTPException(status_code=422, detail="`from` must be before `to`")
    if from_dt < _DATASET_START or to_dt > _DATASET_END:
        raise HTTPException(
            status_code=422,
            detail="Valid range is 2026-01-01 to 2026-04-30",
        )
    if (
        from_dt.time() < _TRADING_OPEN
        or to_dt.time() > _TRADING_CLOSE
        or from_dt.weekday() >= 5
        or to_dt.weekday() >= 5
    ):
        raise HTTPException(
            status_code=422,
            detail="Times must be within trading hours (09:00–17:00 Mon–Fri)",
        )

    prices = get_prices_in_range(request.app.state.db, from_dt, to_dt)
    result = find_best_trade(prices, funds)

    return TradeResponse(
        profitable=result.profitable,
        buy_at=result.buy_at,
        sell_at=result.sell_at,
        buy_price=result.buy_price,
        sell_price=result.sell_price,
        shares=result.shares,
        total_cost=result.total_cost,
        profit=result.profit,
    )
```

- [ ] **Step 4: Implement main.py**

Create `backend/main.py`:
```python
from contextlib import asynccontextmanager
from pathlib import Path

import duckdb
from fastapi import FastAPI

from backend.api.routes import router

_DB_PATH = Path(__file__).parent / "data" / "stock_prices.duckdb"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not hasattr(app.state, "db"):
        app.state.db = duckdb.connect(str(_DB_PATH), read_only=True)
    yield
    if hasattr(app.state, "db"):
        app.state.db.close()


app = FastAPI(title="Stock Advisor", lifespan=lifespan)
app.include_router(router, prefix="/api")
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_api.py -v
```

Expected: `8 passed in ...`

- [ ] **Step 6: Smoke-test the running server**

In one terminal:
```bash
cd backend && source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

In another:
```bash
curl "http://localhost:8000/api/best-trade?from=2026-01-02T09:00&to=2026-01-02T17:00&funds=1000"
```

Expected: JSON with `profitable`, `buy_at`, `sell_at`, `shares`, `profit` fields.

- [ ] **Step 7: Commit**

```bash
git add backend/main.py backend/api/routes.py backend/tests/conftest.py backend/tests/test_api.py
git commit -m "feat: FastAPI app with /api/best-trade endpoint and validation"
```

---

## Task 6: Frontend — Vite Config + Test Infrastructure

**Files:**
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Update vite.config.ts**

Replace the contents of `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 2: Create test setup file**

Create `frontend/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Add type reference for Vitest globals**

Open `frontend/tsconfig.json`. Add `"types": ["vitest/globals"]` to the `compilerOptions`:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

(Merge with existing compilerOptions — do not replace the whole file.)

- [ ] **Step 4: Verify test infrastructure works**

Create `frontend/src/test/smoke.test.ts` (temporary):
```typescript
test('test infrastructure works', () => {
  expect(1 + 1).toBe(2)
})
```

Run:
```bash
cd frontend && npm run test -- --run
```

Expected: `1 passed`

Delete `frontend/src/test/smoke.test.ts`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/vite.config.ts frontend/src/test/setup.ts frontend/tsconfig.json
git commit -m "feat: configure Vitest + proxy for frontend"
```

---

## Task 7: API Client

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/client.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/api/client.test.ts`:
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchBestTrade } from './client'

describe('fetchBestTrade', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the correct URL with query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profitable: true,
        buy_at: '2026-01-02T09:00:00',
        sell_at: '2026-01-02T10:00:00',
        buy_price: 100.0,
        sell_price: 150.0,
        shares: 10,
        total_cost: 1000.0,
        profit: 500.0,
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await fetchBestTrade({ from: '2026-01-02T09:00', to: '2026-01-02T17:00', funds: 1000 })

    expect(mockFetch).toHaveBeenCalledOnce()
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('/api/best-trade')
    expect(url).toContain('from=2026-01-02T09%3A00')
    expect(url).toContain('to=2026-01-02T17%3A00')
    expect(url).toContain('funds=1000')
  })

  it('returns parsed JSON on success', async () => {
    const payload = {
      profitable: true,
      buy_at: '2026-01-02T09:00:00',
      sell_at: '2026-01-02T10:00:00',
      buy_price: 100.0,
      sell_price: 150.0,
      shares: 10,
      total_cost: 1000.0,
      profit: 500.0,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }))

    const result = await fetchBestTrade({ from: '2026-01-02T09:00', to: '2026-01-02T17:00', funds: 1000 })
    expect(result.profitable).toBe(true)
    expect(result.profit).toBe(500.0)
  })

  it('throws an error on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'from must be before to' }),
      }),
    )

    await expect(
      fetchBestTrade({ from: '2026-01-02T17:00', to: '2026-01-02T09:00', funds: 1000 }),
    ).rejects.toThrow('from must be before to')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm run test -- --run src/api/client.test.ts
```

Expected: `Cannot find module './client'`

- [ ] **Step 3: Implement client.ts**

Create `frontend/src/api/client.ts`:
```typescript
export interface TradeRequest {
  from: string   // YYYY-MM-DDTHH:MM
  to: string
  funds: number
}

export interface TradeResult {
  profitable: boolean
  buy_at: string | null
  sell_at: string | null
  buy_price: number | null
  sell_price: number | null
  shares: number
  total_cost: number
  profit: number
}

export async function fetchBestTrade(params: TradeRequest): Promise<TradeResult> {
  const url = new URL('/api/best-trade', window.location.origin)
  url.searchParams.set('from', params.from)
  url.searchParams.set('to', params.to)
  url.searchParams.set('funds', String(params.funds))

  const response = await fetch(url.toString())
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail ?? 'Request failed')
  }
  return data as TradeResult
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/api/client.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/api/client.ts frontend/src/api/client.test.ts
git commit -m "feat: typed API client for /api/best-trade"
```

---

## Task 8: TimeRangePicker Component

**Files:**
- Create: `frontend/src/components/TimeRangePicker.tsx`
- Create: `frontend/src/components/TimeRangePicker.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/TimeRangePicker.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { TimeRangePicker } from './TimeRangePicker'

describe('TimeRangePicker', () => {
  it('renders From and To labels', () => {
    render(
      <TimeRangePicker fromDate={null} toDate={null} onChange={() => {}} />
    )
    expect(screen.getByText('From')).toBeInTheDocument()
    expect(screen.getByText('To')).toBeInTheDocument()
  })

  it('renders two date inputs', () => {
    render(
      <TimeRangePicker fromDate={null} toDate={null} onChange={() => {}} />
    )
    // react-datepicker renders <input> elements
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(2)
  })

  it('displays formatted fromDate value', () => {
    const from = new Date('2026-01-05T09:30:00')
    render(
      <TimeRangePicker fromDate={from} toDate={null} onChange={() => {}} />
    )
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveValue('2026-01-05 09:30')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm run test -- --run src/components/TimeRangePicker.test.tsx
```

Expected: `Cannot find module './TimeRangePicker'`

- [ ] **Step 3: Implement TimeRangePicker.tsx**

Create `frontend/src/components/TimeRangePicker.tsx`:
```tsx
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const DATASET_START = new Date('2026-01-01T09:00:00')
const DATASET_END = new Date('2026-04-30T17:00:00')
const TRADING_OPEN = new Date(0, 0, 0, 9, 0)
const TRADING_CLOSE = new Date(0, 0, 0, 17, 0)

interface Props {
  fromDate: Date | null
  toDate: Date | null
  onChange: (from: Date | null, to: Date | null) => void
}

export function TimeRangePicker({ fromDate, toDate, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div>
        <label>From</label>
        <DatePicker
          selected={fromDate}
          onChange={(date) => onChange(date, toDate)}
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm"
          minDate={DATASET_START}
          maxDate={DATASET_END}
          minTime={TRADING_OPEN}
          maxTime={TRADING_CLOSE}
          placeholderText="Select date and time"
        />
      </div>
      <div>
        <label>To</label>
        <DatePicker
          selected={toDate}
          onChange={(date) => onChange(fromDate, date)}
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm"
          minDate={fromDate ?? DATASET_START}
          maxDate={DATASET_END}
          minTime={TRADING_OPEN}
          maxTime={TRADING_CLOSE}
          placeholderText="Select date and time"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/components/TimeRangePicker.test.tsx
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/components/TimeRangePicker.tsx frontend/src/components/TimeRangePicker.test.tsx
git commit -m "feat: TimeRangePicker with react-datepicker, minute-level, trading hours constrained"
```

---

## Task 9: FundsInput Component

**Files:**
- Create: `frontend/src/components/FundsInput.tsx`
- Create: `frontend/src/components/FundsInput.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/FundsInput.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FundsInput } from './FundsInput'

describe('FundsInput', () => {
  it('renders label and input', () => {
    render(<FundsInput value={1000} onChange={() => {}} />)
    expect(screen.getByText('Available Funds ($)')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    render(<FundsInput value={2500} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(2500)
  })

  it('calls onChange with numeric value when user types', async () => {
    const onChange = vi.fn()
    render(<FundsInput value={0} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '500')
    expect(onChange).toHaveBeenLastCalledWith(500)
  })

  it('has min of 1 to prevent zero or negative funds', () => {
    render(<FundsInput value={1000} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('min', '1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm run test -- --run src/components/FundsInput.test.tsx
```

Expected: `Cannot find module './FundsInput'`

- [ ] **Step 3: Implement FundsInput.tsx**

Create `frontend/src/components/FundsInput.tsx`:
```tsx
interface Props {
  value: number
  onChange: (value: number) => void
}

export function FundsInput({ value, onChange }: Props) {
  return (
    <div>
      <label>Available Funds ($)</label>
      <input
        type="number"
        min={1}
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/components/FundsInput.test.tsx
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/components/FundsInput.tsx frontend/src/components/FundsInput.test.tsx
git commit -m "feat: FundsInput component with numeric validation"
```

---

## Task 10: ResultCard Component

**Files:**
- Create: `frontend/src/components/ResultCard.tsx`
- Create: `frontend/src/components/ResultCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ResultCard.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { ResultCard } from './ResultCard'
import type { TradeResult } from '../api/client'

const profitableResult: TradeResult = {
  profitable: true,
  buy_at: '2026-01-15T10:23:00',
  sell_at: '2026-01-17T14:05:00',
  buy_price: 142.37,
  sell_price: 158.92,
  shares: 7,
  total_cost: 996.59,
  profit: 115.85,
}

const noTradeResult: TradeResult = {
  profitable: false,
  buy_at: null,
  sell_at: null,
  buy_price: null,
  sell_price: null,
  shares: 0,
  total_cost: 0,
  profit: 0,
}

describe('ResultCard', () => {
  it('shows nothing when result is null', () => {
    const { container } = render(<ResultCard result={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('displays buy and sell datetimes for profitable trade', () => {
    render(<ResultCard result={profitableResult} />)
    expect(screen.getByText(/2026-01-15/)).toBeInTheDocument()
    expect(screen.getByText(/2026-01-17/)).toBeInTheDocument()
  })

  it('displays shares, cost, and profit', () => {
    render(<ResultCard result={profitableResult} />)
    expect(screen.getByText(/7/)).toBeInTheDocument()
    expect(screen.getByText(/996\.59/)).toBeInTheDocument()
    expect(screen.getByText(/115\.85/)).toBeInTheDocument()
  })

  it('shows no-profit message when not profitable', () => {
    render(<ResultCard result={noTradeResult} />)
    expect(
      screen.getByText(/No profitable trade exists in the selected time range/i)
    ).toBeInTheDocument()
  })

  it('does not show financial fields when not profitable', () => {
    render(<ResultCard result={noTradeResult} />)
    expect(screen.queryByText(/Buy at/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm run test -- --run src/components/ResultCard.test.tsx
```

Expected: `Cannot find module './ResultCard'`

- [ ] **Step 3: Implement ResultCard.tsx**

Create `frontend/src/components/ResultCard.tsx`:
```tsx
import type { TradeResult } from '../api/client'

interface Props {
  result: TradeResult | null
}

function formatDateTime(iso: string): string {
  return iso.replace('T', ' ').substring(0, 16)
}

export function ResultCard({ result }: Props) {
  if (result === null) return null

  if (!result.profitable) {
    return (
      <div>
        <p>No profitable trade exists in the selected time range.</p>
      </div>
    )
  }

  return (
    <div>
      <table>
        <tbody>
          <tr><td>Buy at</td><td>{formatDateTime(result.buy_at!)}</td></tr>
          <tr><td>Sell at</td><td>{formatDateTime(result.sell_at!)}</td></tr>
          <tr><td>Buy price</td><td>${result.buy_price!.toFixed(2)}</td></tr>
          <tr><td>Sell price</td><td>${result.sell_price!.toFixed(2)}</td></tr>
          <tr><td>Shares bought</td><td>{result.shares}</td></tr>
          <tr><td>Total cost</td><td>${result.total_cost.toFixed(2)}</td></tr>
          <tr><td>Profit</td><td>+${result.profit.toFixed(2)}</td></tr>
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/components/ResultCard.test.tsx
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/components/ResultCard.tsx frontend/src/components/ResultCard.test.tsx
git commit -m "feat: ResultCard displays trade result or no-profit message"
```

---

## Task 11: App Composition

**Files:**
- Create: `frontend/src/utils/format.ts`
- Create: `frontend/src/utils/format.test.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing tests for the format utility**

Create `frontend/src/utils/format.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { formatForApi } from './format'

describe('formatForApi', () => {
  it('formats a date as YYYY-MM-DDTHH:MM', () => {
    const date = new Date(2026, 0, 5, 9, 30, 0)
    expect(formatForApi(date)).toBe('2026-01-05T09:30')
  })

  it('pads month, day, hour, and minute with leading zeros', () => {
    const date = new Date(2026, 0, 1, 9, 0, 0)
    expect(formatForApi(date)).toBe('2026-01-01T09:00')
  })

  it('does not include seconds', () => {
    const date = new Date(2026, 0, 5, 10, 23, 45)
    expect(formatForApi(date)).toBe('2026-01-05T10:23')
  })

  it('handles dataset close time', () => {
    const date = new Date(2026, 3, 30, 17, 0, 0)
    expect(formatForApi(date)).toBe('2026-04-30T17:00')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm run test -- --run src/utils/format.test.ts
```

Expected: `Cannot find module './format'`

- [ ] **Step 3: Implement format.ts**

Create `frontend/src/utils/format.ts`:
```typescript
export function formatForApi(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/utils/format.test.ts
```

Expected: `4 passed`

- [ ] **Step 5: Write the failing App tests**

Create `frontend/src/App.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from './App'
import * as client from './api/client'

// Replace react-datepicker with a simple input so we can drive date state
// without fighting the library's calendar DOM.
vi.mock('./components/TimeRangePicker', () => ({
  TimeRangePicker: ({ fromDate, toDate, onChange }: any) => (
    <>
      <input
        data-testid="from-input"
        readOnly
        value={fromDate?.toISOString() ?? ''}
        onClick={() => onChange(new Date('2026-01-05T09:00:00'), toDate)}
      />
      <input
        data-testid="to-input"
        readOnly
        value={toDate?.toISOString() ?? ''}
        onClick={() => onChange(fromDate, new Date('2026-01-05T17:00:00'))}
      />
    </>
  ),
}))

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByText(/Stock Advisor/i)).toBeInTheDocument()
  })

  it('button is disabled when dates are not set', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Find Best Trade/i })).toBeDisabled()
  })

  it('button is enabled after both dates are selected', async () => {
    render(<App />)
    await userEvent.click(screen.getByTestId('from-input'))
    await userEvent.click(screen.getByTestId('to-input'))
    expect(screen.getByRole('button', { name: /Find Best Trade/i })).toBeEnabled()
  })

  it('displays trade result after successful API response', async () => {
    vi.spyOn(client, 'fetchBestTrade').mockResolvedValue({
      profitable: true,
      buy_at: '2026-01-05T09:00:00',
      sell_at: '2026-01-05T10:00:00',
      buy_price: 100.0,
      sell_price: 150.0,
      shares: 10,
      total_cost: 1000.0,
      profit: 500.0,
    })

    render(<App />)
    await userEvent.click(screen.getByTestId('from-input'))
    await userEvent.click(screen.getByTestId('to-input'))
    await userEvent.click(screen.getByRole('button', { name: /Find Best Trade/i }))

    await waitFor(() => {
      expect(screen.getByText(/2026-01-05/)).toBeInTheDocument()
    })
  })

  it('displays error message when API call fails', async () => {
    vi.spyOn(client, 'fetchBestTrade').mockRejectedValue(new Error('`from` must be before `to`'))

    render(<App />)
    await userEvent.click(screen.getByTestId('from-input'))
    await userEvent.click(screen.getByTestId('to-input'))
    await userEvent.click(screen.getByRole('button', { name: /Find Best Trade/i }))

    await waitFor(() => {
      expect(screen.getByText(/`from` must be before `to`/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
npm run test -- --run src/App.test.tsx
```

Expected: `Cannot find module './App'` (or import errors — App.tsx not yet updated).

- [ ] **Step 7: Implement App.tsx**

Replace `frontend/src/App.tsx` entirely:
```tsx
import { useState } from 'react'
import { TimeRangePicker } from './components/TimeRangePicker'
import { FundsInput } from './components/FundsInput'
import { ResultCard } from './components/ResultCard'
import { fetchBestTrade, TradeResult } from './api/client'
import { formatForApi } from './utils/format'

export default function App() {
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [funds, setFunds] = useState<number>(1000)
  const [result, setResult] = useState<TradeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = fromDate !== null && toDate !== null && funds > 0

  async function handleSubmit() {
    if (!fromDate || !toDate) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fetchBestTrade({
        from: formatForApi(fromDate),
        to: formatForApi(toDate),
        funds,
      })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <h1>Stock Advisor</h1>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <TimeRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => { setFromDate(from); setToDate(to) }}
        />
        <FundsInput value={funds} onChange={setFunds} />
        <button onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? 'Loading…' : 'Find Best Trade'}
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ResultCard result={result} />
    </div>
  )
}
```

- [ ] **Step 8: Run all frontend tests to verify they pass**

```bash
npm run test -- --run
```

Expected: all tests pass (`src/App.test.tsx`, `src/utils/format.test.ts`, `src/api/client.test.ts`, `src/components/*.test.tsx`).

- [ ] **Step 9: Run the full stack manually**

Terminal 1:
```bash
cd backend && source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`. Select a From and To datetime, enter funds, click **Find Best Trade**. Verify the result card renders with buy/sell times, shares, and profit.

- [ ] **Step 10: Run all backend tests one final time**

```bash
cd backend && pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
cd ..
git add frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/utils/format.ts frontend/src/utils/format.test.ts
git commit -m "feat: App composition — wires all components; extract and test formatForApi utility"
```
