import os
import logging
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "swarmuser")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "swarmpassword")
POSTGRES_DB = os.getenv("POSTGRES_DB", "tradeswarm")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{DB_HOST}:{DB_PORT}/{POSTGRES_DB}"

# ORCHESTRATOR AGENT LLM CONFIG
ORCHESTRATOR_BASE_URL = os.getenv("ORCHESTRATOR_BASE_URL", "https://openrouter.ai/api/v1")
ORCHESTRATOR_API_KEY = os.getenv("ORCHESTRATOR_API_KEY")
ORCHESTRATOR_MODEL = os.getenv("ORCHESTRATOR_MODEL", "deepseek/deepseek-v4-flash")

# SUB AGENT LLM CONFIG
SUB_AGENT_BASE_URL = os.getenv("SUB_AGENT_BASE_URL", "https://openrouter.ai/api/v1")
SUB_AGENT_API_KEY = os.getenv("SUB_AGENT_API_KEY")
SUB_AGENT_MODEL = os.getenv("SUB_AGENT_MODEL", "deepseek/deepseek-v4-flash")

# TITLE GENERATOR LLM CONFIG
TITLE_BASE_URL = os.getenv("TITLE_BASE_URL", "https://openrouter.ai/api/v1")
TITLE_API_KEY = os.getenv("TITLE_API_KEY")
TITLE_MODEL = os.getenv("TITLE_MODEL", "meta-llama/llama-3.1-8b-instruct")

# Binance
BINANCE_SPOT_API_KEY = os.getenv("BINANCE_SPOT_API_KEY")
BINANCE_SPOT_SECRET_KEY = os.getenv("BINANCE_SPOT_SECRET_KEY")

# Tools
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY")
# "demo" (ücretsiz plan) veya "pro"
COINGECKO_API_PLAN = os.getenv("COINGECKO_API_PLAN", "demo").lower()

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Security
API_AUTH_KEY = os.getenv("API_AUTH_KEY")
if not API_AUTH_KEY:
    raise RuntimeError("API_AUTH_KEY tanımlı değil. .env dosyasına giriş şifresini ekleyin.")

# JWT imza anahtarı giriş şifresinden ayrı tutulur; tanımlı değilse geriye dönük uyumluluk için şifre kullanılır
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    logging.getLogger(__name__).warning("JWT_SECRET tanımlı değil, API_AUTH_KEY imza anahtarı olarak kullanılıyor.")
    JWT_SECRET = API_AUTH_KEY

# Frontend Next.js proxy'si üzerinden aynı origin'den gelir; CORS sadece başka bir origin gerekiyorsa açılır
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

# false ise Trader ajanı emir oluşturamaz/iptal edemez, sadece okuma yapar
TRADING_ENABLED = os.getenv("TRADING_ENABLED", "true").lower() == "true"

# STT (Speech-to-Text) CONFIG
STT_BASE_URL = os.getenv("STT_BASE_URL", "https://openrouter.ai/api/v1")
STT_API_KEY = os.getenv("STT_API_KEY")
STT_MODEL = os.getenv("STT_MODEL", "openai/whisper-1")

# TTS (Text-to-Speech) CONFIG - STT ile aynı sağlayıcı ve API anahtarını kullanır
TTS_MODEL = os.getenv("TTS_MODEL", "google/gemini-3.8-flash-lite-tts")
TTS_VOICE = os.getenv("TTS_VOICE", "Zephyr")
