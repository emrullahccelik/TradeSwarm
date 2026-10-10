import base64
import io
import wave

import aiohttp
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth import verify_jwt
from backend.config import STT_API_KEY, STT_BASE_URL, STT_MODEL, TTS_MODEL, TTS_VOICE

router = APIRouter(dependencies=[Depends(verify_jwt)])

REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=60)

def _endpoint(path: str) -> str:
    # STT_BASE_URL tam transcription endpoint'i olarak da verilebilir; kökü alıp istenen yolu ekle
    base = STT_BASE_URL.rstrip("/").removesuffix("/audio/transcriptions")
    return base + path

def _headers() -> dict:
    if not STT_API_KEY:
        raise HTTPException(status_code=500, detail="STT_API_KEY eksik")
    return {"Authorization": f"Bearer {STT_API_KEY}", "Content-Type": "application/json"}

class STTRequest(BaseModel):
    audio_base64: str
    format: str = "webm"

@router.post("/api/stt")
async def process_stt(req: STTRequest):
    headers = _headers()
    payload = {
        "model": STT_MODEL,
        "input_audio": {
            "data": req.audio_base64,
            "format": req.format
        }
    }
    async with aiohttp.ClientSession(timeout=REQUEST_TIMEOUT) as session:
        async with session.post(_endpoint("/audio/transcriptions"), json=payload, headers=headers) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=resp.status, detail=f"STT Error: {await resp.text()}")
            data = await resp.json()
            return {"text": data.get("text", "")}

class TTSRequest(BaseModel):
    text: str

@router.post("/api/tts")
async def process_tts(req: TTSRequest):
    headers = _headers()
    payload = {
        "model": TTS_MODEL,
        "input": req.text,
        "voice": TTS_VOICE
    }
    async with aiohttp.ClientSession(timeout=REQUEST_TIMEOUT) as session:
        async with session.post(_endpoint("/audio/speech"), json=payload, headers=headers) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=resp.status, detail=f"TTS Error: {await resp.text()}")
            pcm_data = await resp.read()

    # Sağlayıcı ham 24kHz 16-bit mono PCM döndürür; tarayıcının çözebilmesi için WAV başlığı eklenir
    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(24000)
        wav_file.writeframes(pcm_data)
    return {"audio": base64.b64encode(wav_io.getvalue()).decode("utf-8")}
