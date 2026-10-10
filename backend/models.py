from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    session_id: str

class SessionCreate(BaseModel):
    title: str = "Yeni Sohbet"
