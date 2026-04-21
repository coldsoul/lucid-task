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
