import duckdb
from datetime import datetime


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
