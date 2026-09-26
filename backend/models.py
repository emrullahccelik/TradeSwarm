from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    session_id: str

class SessionCreate(BaseModel):
    title: str = "Yeni Sohbet"
