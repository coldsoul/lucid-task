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
