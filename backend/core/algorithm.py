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
