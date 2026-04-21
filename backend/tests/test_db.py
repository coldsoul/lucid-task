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
