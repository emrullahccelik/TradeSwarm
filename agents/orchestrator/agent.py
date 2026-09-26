from backend.config import OPENROUTER_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, BINANCE_SPOT_API_KEY, BINANCE_SPOT_SECRET_KEY, TAVILY_API_KEY


from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain.tools import tool

from agents.trader.agent import create_trader_agent
from agents.researcher.agent import create_researcher_agent
from agents.market_analyzer.agent import create_market_analyzer_agent



# Alt ajanları oluştur (Lazy-loading de yapılabilir ama basitlik için başlatıyoruz)
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

from langgraph.checkpoint.memory import MemorySaver
from langchain.chat_models import init_chat_model

memory = MemorySaver()

def create_orchestrator_agent():
    llm = init_chat_model(
        model=OPENROUTER_MODEL,
        model_provider="openai",
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        temperature=0.2,
        model_kwargs={"extra_body": {"include_reasoning": True}}
    )

    tools = [ask_trader, ask_researcher, ask_market_analyzer]

    system_prompt = (
        "Sen bu sistemin Yöneticisi ve Ana Ajanısın (Orchestrator Agent). Sistemin adı: TradeSwarm.\n"
        "Kullanıcı seninle iletişim kurar, sen de kullanıcıdan gelen istekleri parçalara ayırarak alt ajanlarına dağıtırsın.\n\n"
        "### EMRİNDEKİ ALT AJANLAR\n"
        "1. Trader Agent (ask_trader): Binance bakiye, alım-satım ve emir işlemleri.\n"
        "2. Researcher Agent (ask_researcher): İnternet araması, güncel haberler ve projelerin temel analizi.\n"
        "3. Market Analyzer Agent (ask_market_analyzer): CoinGecko üzerinden sayısal veriler, fiyatlar, trendler ve borsa verileri.\n\n"
        "### GÖREVİN\n"
        "- Kullanıcının sorusunu analiz et. Hangi alt ajanın veya ajanların verisine ihtiyacın olduğuna karar ver.\n"
        "- İhtiyacın olan veriyi alt ajanlardan çek (tools kullanarak onlara emir ver).\n"
        "- Alt ajanlardan gelen detaylı raporları sentezle ve kullanıcıya nihai, akıcı ve profesyonel bir cevap sun.\n"
        "- Eğer bir işlem yapılacaksa (örneğin 'Bitcoin al' denmişse) önce fiyat ve piyasa durumunu Market Analyzer'a sorabilir, "
        "haberlerini Researcher'a kontrol ettirebilir, son kararı verip işlemi Trader'a yaptırabilirsin.\n\n"
        "### KURALLAR\n"
        "- Alt ajanların raporlarındaki gereksiz teknik detayları filtrele, sadece kullanıcının bilmesi gerekenleri aktar.\n"
        "- Mümkün olduğunca detaylı ve karar destekleyici bir üslup kullan."
    )

    agent = create_agent(llm, tools=tools, system_prompt=system_prompt, checkpointer=memory)
    return agent

if __name__ == "__main__":
    agent = create_orchestrator_agent()
    user_query = "Kaç tane bnb var"
    response = agent.invoke({"messages": [{"role": "user", "content": user_query}]})
    print(response["messages"][-1].content)
