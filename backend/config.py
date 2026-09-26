import os
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "swarmuser")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "swarmpassword")
POSTGRES_DB = os.getenv("POSTGRES_DB", "tradeswarm")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{DB_HOST}:{DB_PORT}/{POSTGRES_DB}"

# OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash")
TITLE_GENERATOR_MODEL = os.getenv("TITLE_GENERATOR_MODEL", "meta-llama/llama-3.1-8b-instruct")

# Binance
BINANCE_SPOT_API_KEY = os.getenv("BINANCE_SPOT_API_KEY")
BINANCE_SPOT_SECRET_KEY = os.getenv("BINANCE_SPOT_SECRET_KEY")

# Tools
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY")

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
