import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import auth
from backend.config import API_AUTH_KEY, JWT_SECRET


@pytest.fixture
def client():
    auth._failed_logins.clear()
    app = FastAPI()
    app.include_router(auth.router)
    return TestClient(app)


def test_login_returns_token_signed_with_jwt_secret(client):
    resp = client.post("/api/login", json={"password": API_AUTH_KEY})

    assert resp.status_code == 200
    payload = jwt.decode(resp.json()["access_token"], JWT_SECRET, algorithms=[auth.ALGORITHM])
    assert payload["sub"] == "admin"


def test_login_is_rate_limited_after_repeated_failures(client):
    for _ in range(auth.MAX_FAILED_LOGINS):
        assert client.post("/api/login", json={"password": "wrong"}).status_code == 401

    # Doğru şifre de kilit süresince reddedilir
    assert client.post("/api/login", json={"password": API_AUTH_KEY}).status_code == 429
