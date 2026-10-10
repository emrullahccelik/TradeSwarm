"""
Artifact'lar: Orchestrator'ın ürettiği, arayüzde sağ panelde sandbox'lı bir iframe içinde gösterilen tek dosyalık HTML sayfaları.

Her güncelleme yeni bir versiyon satırı olarak saklanır. Tool içeriği DB'ye yazar ve bir `artifact` olayı yayınlar; olay
astream_events üzerinden SSE akışına ulaşır ve mesajın ui_state'inde saklanır, böylece sohbet yeniden açıldığında da görünür.
"""
import uuid

from langchain.tools import tool
from langchain_core.callbacks import adispatch_custom_event
from langchain_core.runnables.config import RunnableConfig
from sqlalchemy.future import select

from backend.db import AsyncSessionLocal, Artifact

# İçeriği argüman olarak üretilen tool'lar; arayüz bunlar yazılırken ilerleme gösterir
ARTIFACT_TOOLS = ("create_artifact", "update_artifact")

# Tek bir versiyonun üst sınırı; DB'yi ve SSE akışını şişirecek kontrolsüz çıktıları engeller
MAX_ARTIFACT_CHARS = 200_000


async def _load_latest(session_id: str, artifact_id: str) -> Artifact | None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Artifact)
            .where(Artifact.session_id == session_id, Artifact.artifact_id == artifact_id)
            .order_by(Artifact.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


async def _save(artifact: Artifact) -> None:
    async with AsyncSessionLocal() as db:
        db.add(artifact)
        await db.commit()


async def list_session_artifacts(db, session_id: str) -> list[tuple[str, str, int]]:
    """Sohbetteki her artifact'ın son versiyonunu (artifact_id, başlık, versiyon) olarak, oluşturulma sırasıyla döndürür."""
    result = await db.execute(
        select(Artifact.artifact_id, Artifact.title, Artifact.version)
        .where(Artifact.session_id == session_id)
        .order_by(Artifact.created_at.asc(), Artifact.version.asc())
    )
    latest = {}
    for artifact_id, title, version in result.all():
        latest[artifact_id] = (artifact_id, title, version)
    return list(latest.values())


def artifacts_context(artifacts: list[tuple[str, str, int]]) -> str | None:
    """Model geçmişte yalnızca mesaj metinlerini görür; var olan artifact'ları güncelleyebilmesi için id'lerini bildirir."""
    if not artifacts:
        return None
    lines = [f"- {artifact_id}: {title} (v{version})" for artifact_id, title, version in artifacts]
    return (
        "Bu sohbette daha önce oluşturulan artifact'lar. Birini değiştirmek için yenisini oluşturma: "
        "get_artifact ile içeriğini oku, update_artifact ile güncelle.\n" + "\n".join(lines)
    )


def _validate(content: str) -> str | None:
    if not content.strip():
        return "Hata: artifact içeriği boş olamaz."
    if len(content) > MAX_ARTIFACT_CHARS:
        return f"Hata: artifact içeriği {MAX_ARTIFACT_CHARS} karakteri geçemez, daha kısa bir sayfa üret."
    return None


async def _save_and_publish(artifact: Artifact, config: RunnableConfig) -> None:
    await _save(artifact)
    await adispatch_custom_event("artifact", {
        "artifact_id": artifact.artifact_id,
        "version": artifact.version,
        "title": artifact.title,
        "content": artifact.content,
    }, config=config)


def _published_message(artifact: Artifact, verb: str) -> str:
    return (
        f"Artifact {verb} (id: {artifact.artifact_id}, v{artifact.version}). Kullanıcı onu sağdaki panelde görüyor; "
        "içeriğini cevabında tekrar yazma, sadece kısaca ne içerdiğini anlat."
    )


@tool
async def create_artifact(title: str, content: str, config: RunnableConfig) -> str:
    """Kullanıcıya sağdaki panelde gösterilecek yeni bir artifact (tek dosyalık, kendi kendine yeten HTML sayfası) oluşturur.
    Rapor, grafik, dashboard, tablo, karşılaştırma gibi görsel veya kalıcı çıktılar için kullan.
    title: kısa başlık. content: tam HTML belgesi (CSS ve JS dahil, <!DOCTYPE html> ile başlayan)."""
    session_id = config.get("configurable", {}).get("thread_id")
    if not session_id:
        return "Hata: session_id bulunamadı."
    if error := _validate(content):
        return error

    artifact = Artifact(artifact_id=uuid.uuid4().hex[:8], session_id=session_id, version=1, title=title, content=content)
    await _save_and_publish(artifact, config)
    return _published_message(artifact, "oluşturuldu")


@tool
async def update_artifact(artifact_id: str, content: str, config: RunnableConfig, title: str | None = None) -> str:
    """Var olan bir artifact'ın yeni versiyonunu oluşturur. content: sayfanın değişiklikler uygulanmış TAM yeni HTML'i
    (sadece değişen kısım değil). title verilmezse eski başlık korunur. Önce get_artifact ile mevcut içeriği oku."""
    session_id = config.get("configurable", {}).get("thread_id")
    if not session_id:
        return "Hata: session_id bulunamadı."
    if error := _validate(content):
        return error

    latest = await _load_latest(session_id, artifact_id)
    if not latest:
        return f"Hata: bu sohbette {artifact_id} id'li artifact bulunamadı."

    artifact = Artifact(
        artifact_id=artifact_id,
        session_id=session_id,
        version=latest.version + 1,
        title=title or latest.title,
        content=content,
    )
    await _save_and_publish(artifact, config)
    return _published_message(artifact, "güncellendi")


@tool
async def get_artifact(artifact_id: str, config: RunnableConfig) -> str:
    """Bir artifact'ın son versiyonunun HTML içeriğini döndürür. update_artifact'tan önce mevcut içeriği görmek için kullan."""
    session_id = config.get("configurable", {}).get("thread_id")
    if not session_id:
        return "Hata: session_id bulunamadı."

    latest = await _load_latest(session_id, artifact_id)
    if not latest:
        return f"Hata: bu sohbette {artifact_id} id'li artifact bulunamadı."
    return f"{latest.title} (v{latest.version}):\n\n{latest.content}"
