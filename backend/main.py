import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Ana ajanımızı içeri aktarıyoruz
from agents.orchestrator.agent import create_orchestrator_agent

app = FastAPI(title="TradeSwarm AI Backend")

# Frontend'in (React vb.) API'ye erişebilmesi için CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sunucu başlarken ajanı bir kez ayağa kaldırıyoruz
orchestrator = create_orchestrator_agent()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

async def generate_chat_events(message: str, session_id: str):
    """
    Kullanıcı mesajını alır, LangChain'in astream_events API'si ile çalıştırır.
    Gerçekleşen her olayı (Tool başlangıcı, bitişi, LLM kelimeleri, Akıl yürütme/reasoning) SSE formatında yayınlar.
    """
    try:
        # Hafıza (Memory) için thread_id config ayarı
        config = {"configurable": {"thread_id": session_id}}
        
        # LangChain v2 streaming events
        async for event in orchestrator.astream_events(
            {"messages": [{"role": "user", "content": message}]},
            config=config,
            version="v2"
        ):
            kind = event["event"]
            name = event.get("name", "")
            
            sub_agents = ["ask_trader", "ask_researcher", "ask_market_analyzer"]
            
            # --- TOOL / SUB-AGENT BAŞLAMA ANI ---
            if kind == "on_tool_start":
                if name in sub_agents:
                    payload = {"type": "sub_agent_start", "tool": name}
                else:
                    payload = {"type": "tool_start", "tool": name}
                yield f"data: {json.dumps(payload)}\n\n"
                
            # --- TOOL / SUB-AGENT BİTİŞ ANI ---
            elif kind == "on_tool_end":
                if name in sub_agents:
                    # Alt ajanın verdiği tam cevabı alıyoruz
                    output = event["data"].get("output", "")
                    # ToolMessage formatındaysa içeriğini alalım
                    if hasattr(output, "content"):
                        output = output.content
                    payload = {"type": "sub_agent_end", "tool": name, "text": str(output)}
                else:
                    payload = {"type": "tool_end", "tool": name}
                yield f"data: {json.dumps(payload)}\n\n"
                
            # --- ORCHESTRATOR'IN KELİME KELİME CEVABI (STREAMING) VE REASONING ---
            elif kind == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                
                # Sadece Ana Ajanın (Orchestrator) kelimelerini stream etmek için basit bir kontrol:
                # (Eğer event name 'agent' veya 'ChatOpenRouter' ise. Alt ajanlarınki 'ChatOpenAI' vs olabiliyor ama
                # alt ajanlar tool içinde invoke edildiği için kendi stream'leri on_chat_model_stream'e düşmez,
                # yine de filtreyi tutalım)
                if chunk:
                    # Notebook'taki yönteme göre reasoning kontrolü (content_blocks)
                    if hasattr(chunk, "content_blocks") and isinstance(chunk.content_blocks, list):
                        for block in chunk.content_blocks:
                            if isinstance(block, dict) and block.get("type") == "reasoning":
                                reasoning_text = block.get("reasoning")
                                if reasoning_text:
                                    payload = {"type": "reasoning", "text": reasoning_text}
                                    yield f"data: {json.dumps(payload)}\n\n"
                    
                    # Alternatif olarak chunk.content liste formatında geldiyse
                    elif isinstance(chunk.content, list):
                        for item in chunk.content:
                            if isinstance(item, dict) and item.get("type") == "reasoning":
                                reasoning_text = item.get("reasoning")
                                if reasoning_text:
                                    payload = {"type": "reasoning", "text": reasoning_text}
                                    yield f"data: {json.dumps(payload)}\n\n"
                    
                    # Ek fallback: OpenRouter'ın eski include_reasoning API formatı
                    reasoning_content = chunk.additional_kwargs.get("reasoning") or chunk.additional_kwargs.get("reasoning_content")
                    if reasoning_content:
                        payload = {"type": "reasoning", "text": reasoning_content}
                        yield f"data: {json.dumps(payload)}\n\n"
                    
                    # Normal içerik token'ı (String olarak)
                    if isinstance(chunk.content, str) and chunk.content:
                        payload = {"type": "content", "text": chunk.content}
                        yield f"data: {json.dumps(payload)}\n\n"
                    # Eğer içerik blok/liste formatında text ise
                    elif isinstance(chunk.content, list):
                        for item in chunk.content:
                            if isinstance(item, dict) and item.get("type") == "text" and item.get("text"):
                                payload = {"type": "content", "text": item.get("text")}
                                yield f"data: {json.dumps(payload)}\n\n"

        # İşlem sorunsuz bittiğinde frontend'e sinyal gönderiyoruz
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        # Hata anında frontend'e hata mesajı gönderiyoruz
        error_payload = {"type": "error", "text": str(e)}
        yield f"data: {json.dumps(error_payload)}\n\n"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Arayüzden gelen POST isteklerini karşılar ve StreamingResponse ile Server-Sent Events (SSE) yayınını başlatır.
    """
    return StreamingResponse(
        generate_chat_events(request.message, request.session_id),
        media_type="text/event-stream"
    )

@app.get("/api/health")
async def health_check():
    return {"status": "TradeSwarm Backend is running perfectly!"}
