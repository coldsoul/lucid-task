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
