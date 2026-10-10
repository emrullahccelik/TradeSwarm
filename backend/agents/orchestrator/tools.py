from langchain.tools import tool
from backend.db import AsyncSessionLocal, ChatSession
from langchain_core.runnables.config import RunnableConfig

from backend.agents.trader.agent import create_trader_agent
from backend.agents.researcher.agent import create_researcher_agent
from backend.agents.market_analyzer.agent import create_market_analyzer_agent

# Alt ajanları oluştur
trader_agent = create_trader_agent()
researcher_agent = create_researcher_agent()
market_analyzer_agent = create_market_analyzer_agent()

@tool
def ask_trader(query: str) -> str:
    """Binance Spot piyasasında işlem yapmak, emir vermek, fiyat sorgulamak veya bakiye kontrol etmek için bu aracı kullan.
    Sana gelen alım/satım taleplerini veya cüzdan sorularını doğrudan bu ajana ilet."""
    try:
        response = trader_agent.invoke({"messages": [{"role": "user", "content": query}]})
        return response["messages"][-1].content
    except Exception as e:
        return f"Trader Agent Hatası: {str(e)}"

@tool
def ask_researcher(query: str) -> str:
    """Genel kripto para haberleri, makroekonomik veriler, proje açıklamaları ve internet üzerindeki güncel gelişmeler için bu aracı kullan.
    Tavily arama motoru ile web'i tarayarak detaylı araştırma yapar."""
    try:
        response = researcher_agent.invoke({"messages": [{"role": "user", "content": query}]})
        return response["messages"][-1].content
    except Exception as e:
        return f"Researcher Agent Hatası: {str(e)}"

@tool
def ask_market_analyzer(query: str) -> str:
    """Kripto piyasasındaki istatistiksel veriler (CoinGecko), borsa listelenmeleri, anlık detaylı fiyat bilgileri, şirketlerin kripto rezervleri ve trend olan coinler için bu aracı kullan.
    Sayısal veri ve piyasa analizi istendiğinde buna başvur."""
    try:
        response = market_analyzer_agent.invoke({"messages": [{"role": "user", "content": query}]})
        return response["messages"][-1].content
    except Exception as e:
        return f"Market Analyzer Agent Hatası: {str(e)}"

@tool
async def update_chat_title(new_title: str, config: RunnableConfig) -> str:
    """Bu sohbetin başlığını (title) günceller. Kullanıcı sohbet konusunun tamamen değiştiğini belirtirse veya sohbet ismini değiştirmek isterse bu aracı kullan."""
    session_id = config.get("configurable", {}).get("thread_id")
    if not session_id:
        return "Hata: session_id bulunamadı."
    
    async with AsyncSessionLocal() as db:
        session = await db.get(ChatSession, session_id)
        if session:
            session.title = new_title
            await db.commit()
            return f"Sohbet başlığı başarıyla '{new_title}' olarak güncellendi."
        return "Sohbet bulunamadı."

import aiohttp
from backend.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

@tool
async def notify_user(message: str) -> str:
    """Yaptığın kritik analizleri, piyasa kararlarını veya gerçekleştirdiğin işlemleri (alım/satım vb.) kullanıcıya anında Telegram üzerinden bildirim olarak göndermek için bu aracı kullan. 
    Kullanıcıya sürecin kısa bir özetini sun."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return "Telegram bildirim ayarları (.env) eksik. Lütfen Telegram Bot Token ve Chat ID'yi yapılandırın."
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    return "Telegram bildirimi başarıyla gönderildi."
                else:
                    err_text = await response.text()
                    return f"Telegram bildirim hatası: {response.status} - {err_text}"
    except Exception as e:
        return f"Telegram'a gönderilirken bir hata oluştu: {str(e)}"
