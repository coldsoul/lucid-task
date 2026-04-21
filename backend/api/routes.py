from datetime import datetime, time

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.api.deps import get_db
from backend.core.algorithm import find_best_trade
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


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/best-trade", response_model=TradeResponse)
def best_trade(
    db: duckdb.DuckDBPyConnection = Depends(get_db),
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
    if from_dt.time() < _TRADING_OPEN or to_dt.time() > _TRADING_CLOSE:
        raise HTTPException(
            status_code=422,
            detail="Times must be within trading hours (09:00–17:00 Mon–Fri)",
        )
    if from_dt.weekday() >= 5 or to_dt.weekday() >= 5:
        raise HTTPException(
            status_code=422,
            detail="Times must be within trading hours (09:00–17:00 Mon–Fri)",
        )

    prices = get_prices_in_range(db, from_dt, to_dt)
    result = find_best_trade(prices, funds)
    return TradeResponse.model_validate(result, from_attributes=True)
