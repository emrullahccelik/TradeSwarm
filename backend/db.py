from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from datetime import datetime, timezone
import uuid
from backend.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

def utc_now() -> datetime:
    # Kolonlar timezone'suz (TIMESTAMP WITHOUT TIME ZONE) olduğu için naive UTC değer saklanır
    return datetime.now(timezone.utc).replace(tzinfo=None)

class ChatSession(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, default="Yeni Sohbet")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class ChatMessage(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"))
    role = Column(String) # user, assistant
    content = Column(Text, nullable=True)
    # reasoning = Column(Text, nullable=True) # if we want to store reasoning separately
    # Veya UI'ın kullanabileceği tüm datayı (tool calls vb) JSON'da tutabiliriz:
    ui_state = Column(JSON, nullable=True) # Tüm tool, reasoning, content akışlarını burada tutabiliriz
    created_at = Column(DateTime, default=utc_now)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
