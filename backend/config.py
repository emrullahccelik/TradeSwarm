import os
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

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Security
API_AUTH_KEY = os.getenv('API_AUTH_KEY')

# STT (Speech-to-Text) CONFIG
STT_BASE_URL = os.getenv("STT_BASE_URL", "https://openrouter.ai/api/v1")
STT_API_KEY = os.getenv("STT_API_KEY")
STT_MODEL = os.getenv("STT_MODEL", "openai/whisper-1")
