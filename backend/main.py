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
