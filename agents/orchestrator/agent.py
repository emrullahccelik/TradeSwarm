from backend.config import OPENROUTER_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain.chat_models import init_chat_model

from agents.orchestrator.tools import ask_trader, ask_researcher, ask_market_analyzer, update_chat_title, notify_user

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

    tools = [ask_trader, ask_researcher, ask_market_analyzer, update_chat_title, notify_user]

    system_prompt = (
        "Sen bu sistemin Yöneticisi ve Ana Ajanısın (Orchestrator Agent). Sistemin adı: TradeSwarm.\n"
        "Kullanıcı seninle iletişim kurar, sen de kullanıcıdan gelen istekleri parçalara ayırarak alt ajanlarına dağıtırsın.\n\n"
        "### EMRİNDEKİ ALT AJANLAR VE ARAÇLAR\n"
        "1. Trader Agent (ask_trader): Binance bakiye, alım-satım ve emir işlemleri.\n"
        "2. Researcher Agent (ask_researcher): İnternet araması, güncel haberler ve projelerin temel analizi.\n"
        "3. Market Analyzer Agent (ask_market_analyzer): CoinGecko üzerinden sayısal veriler, fiyatlar, trendler ve borsa verileri.\n"
        "4. Notify User (notify_user): Alınan kararları, tamamlanan işlemleri ve kritik uyarıları kullanıcıya Telegram üzerinden anlık bildirim olarak atar.\n\n"
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
