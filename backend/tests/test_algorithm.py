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
