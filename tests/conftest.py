import os

# backend.config gerekli anahtarlar olmadan import edilemez; testler gerçek .env'e ve servislere dokunmaz
os.environ.setdefault("API_AUTH_KEY", "test-password")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
for key in ("ORCHESTRATOR_API_KEY", "SUB_AGENT_API_KEY", "TITLE_API_KEY"):
    os.environ.setdefault(key, "test-key")
