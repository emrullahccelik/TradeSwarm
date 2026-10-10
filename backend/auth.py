import hmac
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from backend.config import API_AUTH_KEY, JWT_SECRET

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# Brute-force koruması: bir IP'den LOGIN_WINDOW_SECONDS içinde en fazla MAX_FAILED_LOGINS hatalı deneme
MAX_FAILED_LOGINS = 5
LOGIN_WINDOW_SECONDS = 300

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")
router = APIRouter()

_failed_logins: dict[str, deque] = defaultdict(deque)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

async def verify_jwt(token: str = Depends(oauth2_scheme)):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def _recent_failures(client_ip: str) -> deque:
    attempts = _failed_logins[client_ip]
    cutoff = time.monotonic() - LOGIN_WINDOW_SECONDS
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    return attempts

class LoginRequest(BaseModel):
    password: str

@router.post("/api/login")
async def login(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    attempts = _recent_failures(client_ip)
    if len(attempts) >= MAX_FAILED_LOGINS:
        raise HTTPException(status_code=429, detail="Too many failed attempts, try again later")

    # Sabit zamanlı karşılaştırma (timing attack'e karşı)
    if hmac.compare_digest(req.password.encode(), API_AUTH_KEY.encode()):
        _failed_logins.pop(client_ip, None)
        return {"access_token": create_access_token({"sub": "admin"}), "token_type": "bearer"}

    attempts.append(time.monotonic())
    raise HTTPException(status_code=401, detail="Invalid password")
