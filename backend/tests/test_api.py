def test_profitable_trade(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T09:00",
        "to": "2026-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["profitable"] is True
    assert data["buy_at"].startswith("2026-01-02T09:00")
    assert data["sell_at"].startswith("2026-01-02T10:00")
    assert data["shares"] == 10
    assert data["profit"] == 500.0


def test_no_profitable_trade(client):
    # Only descending prices available from 10:00 onward
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T10:00",
        "to": "2026-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["profitable"] is False
    assert data["shares"] == 0
    assert data["profit"] == 0.0


def test_from_must_be_before_to(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T17:00",
        "to": "2026-01-02T09:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "`from` must be before `to`" in response.json()["detail"]


def test_range_outside_dataset_bounds(client):
    response = client.get("/api/best-trade", params={
        "from": "2025-01-01T09:00",
        "to": "2025-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "2026-01-01" in response.json()["detail"]


def test_outside_trading_hours(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T06:00",
        "to": "2026-01-02T17:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "trading hours" in response.json()["detail"]


def test_weekend_rejected(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-03T09:00",  # Saturday
        "to": "2026-01-03T17:00",
        "funds": 1000,
    })
    assert response.status_code == 422
    assert "trading hours" in response.json()["detail"]


def test_negative_funds_rejected(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T09:00",
        "to": "2026-01-02T17:00",
        "funds": -100,
    })
    assert response.status_code == 422


def test_missing_parameter(client):
    response = client.get("/api/best-trade", params={
        "from": "2026-01-02T09:00",
        "to": "2026-01-02T17:00",
        # funds missing
    })
    assert response.status_code == 422
