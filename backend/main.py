
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import jwt
from datetime import datetime, timedelta
from backend.config import API_AUTH_KEY

from sqlalchemy.future import select
import json
import asyncio

from backend.db import init_db, AsyncSessionLocal, ChatSession, ChatMessage
from backend.models import ChatRequest, SessionCreate
from backend.config import TITLE_MODEL, TITLE_API_KEY, TITLE_BASE_URL, STT_MODEL, STT_API_KEY, STT_BASE_URL
from agents.orchestrator.agent import create_orchestrator_agent
from langchain.chat_models import init_chat_model


app = FastAPI(title="TradeSwarm AI Backend")

# JWT Config
SECRET_KEY = API_AUTH_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_jwt(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

class LoginRequest(BaseModel):
    password: str

@app.post("/api/login")
async def login(req: LoginRequest):
    if req.password == API_AUTH_KEY:
        access_token = create_access_token(data={"sub": "admin"})
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid password")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = create_orchestrator_agent()

async def generate_title_from_message(user_message: str, assistant_message: str) -> str:
    try:
        llm = init_chat_model(
            model=TITLE_MODEL,
            model_provider="openai",
            api_key=TITLE_API_KEY,
            base_url=TITLE_BASE_URL,
            temperature=0.7
        )
        prompt = f"Kullanıcı mesajı ve Asistanın cevabına dayanarak bu sohbet için 3-5 kelimelik kısa, öz ve ilgi çekici bir başlık oluştur. Sadece başlığı yaz, tırnak işareti kullanma.\n\nKullanıcı: {user_message}\n\nAsistan: {assistant_message}"
        response = await llm.ainvoke(prompt)
        title = response.content.strip().replace('"', '')
        return title
    except Exception as e:
        return user_message[:30] + "..." if len(user_message) > 30 else user_message

@app.on_event("startup")
async def on_startup():
    await init_db()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def generate_chat_events(message: str, session_id: str, db):
    """
    Kullanıcı mesajını alır, LangChain'in astream_events API'si ile çalıştırır.
    Gerçekleşen her olayı (Tool başlangıcı, bitişi, LLM kelimeleri, Akıl yürütme/reasoning) SSE formatında yayınlar.
    """
    
    # Kullanıcı mesajını DB'ye kaydet
    user_msg = ChatMessage(session_id=session_id, role="user", content=message)
    db.add(user_msg)
    await db.commit()
    
    # Asistanın yanıtını biriktirmek için state
    assistant_content = ""
    ui_state = []
    active_sub_agents = set()

    try:
        # DB'den geçmiş mesajları çekerek ajana hafıza (memory) sağlıyoruz (Sunucu restart olsa bile hatırlaması için)
        past_msgs_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        past_msgs = past_msgs_result.scalars().all()
        
        formatted_messages = []
        for m in past_msgs:
            # Sadece önceki mesajları alıyoruz (Şu anki user mesajı henüz commit edilmediği için listede son sırada olabilir)
            # Biz yine de db'ye ekledik, o yüzden db'den gelen listeyi olduğu gibi kullanabiliriz!
            if m.content:
                formatted_messages.append({"role": m.role, "content": m.content})
        
        config = {"configurable": {"thread_id": session_id}}
        
        async for event in orchestrator.astream_events(
            {"messages": formatted_messages},
            config=config,
            version="v2"
        ):
            kind = event["event"]
            name = event.get("name", "")
            
            sub_agents = ["ask_trader", "ask_researcher", "ask_market_analyzer"]
            
            if kind == "on_tool_start":
                run_id = event.get("run_id", "")
                parent_ids = event.get("parent_ids", [])
                if name in sub_agents:
                    active_sub_agents.add(run_id)
                    payload = {"type": "sub_agent_start", "tool": name, "run_id": run_id}
                    ui_state.append(payload)
                else:
                    payload = {"type": "tool_start", "tool": name, "run_id": run_id, "parent_ids": parent_ids}
                    ui_state.append(payload)
                yield f"data: {json.dumps(payload)}\n\n"
                
            elif kind == "on_tool_end":
                run_id = event.get("run_id", "")
                parent_ids = event.get("parent_ids", [])
                if name in sub_agents:
                    active_sub_agents.discard(run_id)
                    output = event["data"].get("output", "")
                    if hasattr(output, "content"):
                        output = output.content
                    payload = {"type": "sub_agent_end", "tool": name, "text": str(output), "run_id": run_id}
                    ui_state.append(payload)
                else:
                    payload = {"type": "tool_end", "tool": name, "run_id": run_id, "parent_ids": parent_ids}
                    ui_state.append(payload)
                yield f"data: {json.dumps(payload)}\n\n"
                
            elif kind == "on_chat_model_stream":
                # Eğer bu stream'in ebeveynlerinden biri aktif bir alt ajansa, sızmasını engelle!
                parent_ids = event.get("parent_ids", [])
                if any(pid in active_sub_agents for pid in parent_ids):
                    continue
                
                chunk = event["data"].get("chunk")
                
                if chunk:
                    if hasattr(chunk, "content_blocks") and isinstance(chunk.content_blocks, list):
                        for block in chunk.content_blocks:
                            if isinstance(block, dict) and block.get("type") == "reasoning":
                                reasoning_text = block.get("reasoning")
                                if reasoning_text:
                                    payload = {"type": "reasoning", "text": reasoning_text}
                                    ui_state.append(payload)
                                    yield f"data: {json.dumps(payload)}\n\n"
                    
                    elif isinstance(chunk.content, list):
                        for item in chunk.content:
                            if isinstance(item, dict) and item.get("type") == "reasoning":
                                reasoning_text = item.get("reasoning")
                                if reasoning_text:
                                    payload = {"type": "reasoning", "text": reasoning_text}
                                    ui_state.append(payload)
                                    yield f"data: {json.dumps(payload)}\n\n"
                    
                    reasoning_content = chunk.additional_kwargs.get("reasoning") or chunk.additional_kwargs.get("reasoning_content")
                    if reasoning_content:
                        payload = {"type": "reasoning", "text": reasoning_content}
                        ui_state.append(payload)
                        yield f"data: {json.dumps(payload)}\n\n"
                    
                    if isinstance(chunk.content, str) and chunk.content:
                        payload = {"type": "content", "text": chunk.content}
                        assistant_content += chunk.content
                        yield f"data: {json.dumps(payload)}\n\n"
                    elif isinstance(chunk.content, list):
                        for item in chunk.content:
                            if isinstance(item, dict) and item.get("type") == "text" and item.get("text"):
                                payload = {"type": "content", "text": item.get("text")}
                                assistant_content += item.get("text")
                                yield f"data: {json.dumps(payload)}\n\n"

        # Asistan yanıtını DB'ye kaydet
        assistant_msg = ChatMessage(
            session_id=session_id, 
            role="assistant", 
            content=assistant_content,
            ui_state=ui_state
        )
        db.add(assistant_msg)
        
        # Session updated_at'i güncelle
        session = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        sess_obj = session.scalar_one_or_none()
        if sess_obj:
            # If first message, update title
            if sess_obj.title == "Yeni Sohbet":
                sess_obj.title = await generate_title_from_message(message, assistant_content)
        
        await db.commit()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except asyncio.CancelledError:
        # İptal durumunda o ana kadarki cevabı kaydet
        assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=assistant_content, ui_state=ui_state)
        db.add(assistant_msg)
        await db.commit()
        raise
    except Exception as e:
        error_payload = {"type": "error", "text": str(e)}
        yield f"data: {json.dumps(error_payload)}\n\n"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db = Depends(get_db)):
    """
    Arayüzden gelen POST isteklerini karşılar ve StreamingResponse ile Server-Sent Events (SSE) yayınını başlatır.
    """
    return StreamingResponse(
        generate_chat_events(request.message, request.session_id, db),
        media_type="text/event-stream"
    )

@app.get("/api/health")
async def health_check():
    return {"status": "TradeSwarm Backend is running perfectly!"}

@app.get("/api/sessions")
async def get_sessions(db = Depends(get_db)):
    result = await db.execute(select(ChatSession).order_by(ChatSession.updated_at.desc()))
    return result.scalars().all()

@app.post("/api/sessions")
async def create_session(session_data: SessionCreate, db = Depends(get_db)):
    new_sess = ChatSession(title=session_data.title)
    db.add(new_sess)
    await db.commit()
    await db.refresh(new_sess)
    return new_sess

@app.get("/api/sessions/{session_id}/messages")
async def get_messages(session_id: str, db = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, db = Depends(get_db)):
    session = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    sess_obj = session.scalar_one_or_none()
    if sess_obj:
        await db.delete(sess_obj)
        await db.commit()
    return {"status": "success"}

class STTRequest(BaseModel):
    audio_base64: str
    format: str = "webm"

import aiohttp

@app.post("/api/stt")
async def process_stt(req: STTRequest):
    if not STT_API_KEY:
        raise HTTPException(status_code=500, detail="STT_API_KEY eksik")
        
    async with aiohttp.ClientSession() as session:
        payload = {
            "model": STT_MODEL,
            "input_audio": {
                "data": req.audio_base64,
                "format": req.format
            }
        }
        headers = {
            "Authorization": f"Bearer {STT_API_KEY}",
            "Content-Type": "application/json"
        }
        # URL'nin sonuna /audio/transcriptions ekliyoruz (Eğer BASE_URL'de yoksa)
        url = STT_BASE_URL if STT_BASE_URL.endswith("/audio/transcriptions") else STT_BASE_URL + "/audio/transcriptions"
        
        async with session.post(url, json=payload, headers=headers) as resp:
            if resp.status == 200:
                data = await resp.json()
                return {"text": data.get("text", "")}
            else:
                err = await resp.text()
                raise HTTPException(status_code=resp.status, detail=f"OpenRouter Error: {err}")
