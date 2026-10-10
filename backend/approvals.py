"""
Emir tool'ları için human-in-the-loop onayı.

Emir tool'u (Trader alt ajanının worker thread'inde çalışır) bir `approval_required` olayı yayınlar ve
kullanıcı arayüzden /api/approvals/{id} ile karar verene kadar bekler. Olay, astream_events üzerinden
SSE akışına ulaşır; akış bu süre boyunca açık kalır.
"""
import threading
import uuid
from concurrent.futures import Future, TimeoutError as FutureTimeoutError
from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.callbacks import dispatch_custom_event
from langchain_core.runnables.config import ensure_config
from pydantic import BaseModel

from backend.auth import verify_jwt

# Bu süre içinde karar verilmezse emir reddedilmiş sayılır. Next.js proxy'si (undici) 300 sn veri
# gelmeyen akışı kestiği için bunun altında tutulur.
APPROVAL_TIMEOUT_SECONDS = 120

REFUSAL_MESSAGES = {
    "rejected": "İşlem yapılmadı: kullanıcı bu emri REDDETTİ. Emri tekrar deneme, durumu raporla.",
    "expired": f"İşlem yapılmadı: kullanıcı {APPROVAL_TIMEOUT_SECONDS} saniye içinde onay vermedi. Emri tekrar deneme, durumu raporla.",
    "cancelled": "İşlem yapılmadı: kullanıcı isteği iptal etti. Emri tekrar deneme.",
}

router = APIRouter(dependencies=[Depends(verify_jwt)])


@dataclass
class _PendingApproval:
    request_id: str | None
    future: Future


# Bekleyen onaylar process belleğinde tutulur: backend tek process (tek uvicorn worker) olarak çalışmalı
_pending: dict[str, _PendingApproval] = {}
_lock = threading.Lock()


def _resolve(approval_id: str, status: str) -> bool:
    with _lock:
        pending = _pending.get(approval_id)
        if not pending or pending.future.done():
            return False
        pending.future.set_result(status)
        return True


def request_approval(action: str, details: dict) -> str | None:
    """Emri kullanıcıya onaylatır. Onaylanırsa None, aksi halde tool'un döndüreceği açıklamayı döndürür.
    Karar gelene veya süre dolana kadar çağıran thread'i bloklar."""
    request_id = ensure_config().get("configurable", {}).get("request_id")
    approval_id = str(uuid.uuid4())
    future: Future = Future()
    with _lock:
        _pending[approval_id] = _PendingApproval(request_id, future)

    try:
        dispatch_custom_event("approval_required", {
            "approval_id": approval_id,
            "action": action,
            "details": details,
            "timeout": APPROVAL_TIMEOUT_SECONDS,
        })
        try:
            status = future.result(timeout=APPROVAL_TIMEOUT_SECONDS)
        except FutureTimeoutError:
            status = "expired"
    finally:
        with _lock:
            _pending.pop(approval_id, None)

    dispatch_custom_event("approval_resolved", {"approval_id": approval_id, "status": status})
    return None if status == "approved" else REFUSAL_MESSAGES[status]


def cancel_request(request_id: str) -> None:
    """Sohbet isteği bittiğinde/iptal edildiğinde ona ait bekleyen onayları reddeder."""
    with _lock:
        approval_ids = [aid for aid, p in _pending.items() if p.request_id == request_id]
    for approval_id in approval_ids:
        _resolve(approval_id, "cancelled")


class ApprovalDecision(BaseModel):
    approved: bool


@router.post("/api/approvals/{approval_id}")
async def decide_approval(approval_id: str, decision: ApprovalDecision):
    status = "approved" if decision.approved else "rejected"
    if not _resolve(approval_id, status):
        raise HTTPException(status_code=404, detail="Onay bulunamadı veya süresi doldu")
    return {"status": status}
