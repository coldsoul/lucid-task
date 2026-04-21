import os
from contextlib import asynccontextmanager
from pathlib import Path

import duckdb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.routes import router

_DB_PATH = Path(__file__).parent / "data" / "stock_prices.duckdb"
_STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not hasattr(app.state, "db"):
        app.state.db = duckdb.connect(str(_DB_PATH), read_only=True)
    yield
    if hasattr(app.state, "db"):
        app.state.db.close()


app = FastAPI(title="Stock Advisor", lifespan=lifespan)

_allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

if _STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_STATIC_DIR), html=True), name="static")
