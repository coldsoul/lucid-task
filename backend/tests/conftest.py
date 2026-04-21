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
    from backend.api.deps import get_db
    app.dependency_overrides[get_db] = lambda: db_conn
    yield TestClient(app)
    app.dependency_overrides.clear()
