import threading

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import approvals
from backend.auth import verify_jwt


@pytest.fixture
def events(monkeypatch):
    # Gerçek bir LangChain run'ı dışında olay yayınlanamaz; yayınlanan olaylar burada toplanır
    captured = []
    monkeypatch.setattr(approvals, "dispatch_custom_event", lambda name, data: captured.append((name, data)))
    approvals._pending.clear()
    return captured


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(approvals.router)
    app.dependency_overrides[verify_jwt] = lambda: {"sub": "admin"}
    return TestClient(app)


def run_in_thread(fn):
    """Emir tool'u gibi request_approval'ı ayrı thread'de çalıştırır, sonucu döndüren bir join fonksiyonu verir."""
    result = {}
    thread = threading.Thread(target=lambda: result.setdefault("value", fn()))
    thread.start()

    def join():
        thread.join(timeout=5)
        assert not thread.is_alive()
        return result["value"]
    return join


def wait_for_approval_id(events):
    for _ in range(500):
        if events:
            name, data = events[0]
            assert name == "approval_required"
            return data["approval_id"]
        threading.Event().wait(0.01)
    raise AssertionError("approval_required olayı yayınlanmadı")


@pytest.mark.parametrize("approved, expected_status", [(True, "approved"), (False, "rejected")])
def test_decision_endpoint_unblocks_tool(events, client, approved, expected_status):
    join = run_in_thread(lambda: approvals.request_approval("create_market_order", {"symbol": "BTCUSDT"}))
    approval_id = wait_for_approval_id(events)

    resp = client.post(f"/api/approvals/{approval_id}", json={"approved": approved})

    assert resp.status_code == 200
    result = join()
    assert (result is None) == approved
    assert events[-1] == ("approval_resolved", {"approval_id": approval_id, "status": expected_status})
    assert approval_id not in approvals._pending


def test_unanswered_approval_expires(events, monkeypatch):
    monkeypatch.setattr(approvals, "APPROVAL_TIMEOUT_SECONDS", 0.05)

    result = approvals.request_approval("cancel_open_order", {"symbol": "BTCUSDT", "order_id": 1})

    assert result == approvals.REFUSAL_MESSAGES["expired"]
    assert events[-1][1]["status"] == "expired"


def test_cancel_request_rejects_only_its_own_approvals(events, monkeypatch):
    monkeypatch.setattr(approvals, "ensure_config", lambda: {"configurable": {"request_id": "req-1"}})
    join = run_in_thread(lambda: approvals.request_approval("create_limit_order", {}))
    approval_id = wait_for_approval_id(events)

    approvals.cancel_request("req-2")
    assert approval_id in approvals._pending

    approvals.cancel_request("req-1")
    assert join() == approvals.REFUSAL_MESSAGES["cancelled"]


def test_unknown_or_already_decided_approval_returns_404(events, client):
    assert client.post("/api/approvals/does-not-exist", json={"approved": True}).status_code == 404
