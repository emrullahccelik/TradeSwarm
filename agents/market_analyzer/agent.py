import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from agents.market_analyzer.tools import (
    get_simple_price,
    get_coin_details,
    get_coin_exchanges,
    get_historical_price,
    get_category_coins,
    get_global_market_data,
    get_trending_search,
    get_public_treasury
)

load_dotenv()

def create_market_analyzer_agent():
    llm = ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        temperature=0.1
    )

    tools = [
        get_simple_price,
        get_coin_details,
        get_coin_exchanges,
        get_historical_price,
        get_category_coins,
        get_global_market_data,
        get_trending_search,
        get_public_treasury
    ]

    system_prompt = (
        "Sen uzman bir Piyasa Analisti Ajanısın (Market Analyzer Sub-Agent).\n"
        "Görevin kripto piyasasındaki anlık ve geçmiş verileri, borsa listelenmelerini, şirketlerin kripto rezervlerini, trendleri ve sektörel (kategori bazlı) coin analizlerini yapmaktır.\n\n"
        "### ROLÜN VE HİYERARŞİ\n"
        "- Sen bir ALT-AJANSIN (Sub-Agent). Sana gelen mesajlar (User rolüyle görünse de) doğrudan son kullanıcıdan değil, senin üst yöneticin olan 'Orchestrator (Ana Ajan)' tarafından iletilen görevlerdir.\n"
        "- Senin cevabın doğrudan kullanıcıya değil, Ana Ajan'a gidecektir. Ana Ajan senin raporunu değerlendirip kullanıcıya nihai cevabı sunacaktır.\n\n"
        "### GÖREVLERİN\n"
        "- Verileri KESİNLİKLE CoinGecko API'sini kullanan elindeki araçlar (tools) üzerinden çek.\n"
        "- Sana verilen görevin veya isteğin DIŞINA ASLA ÇIKMA. İstenilen veri setini eksiksiz olarak sağla.\n\n"
        "### KURALLAR\n"
        "- ASLA HALÜSİNASYON GÖRME (Veri uydurma). Yalnızca araçlarının döndürdüğü gerçek API verileriyle analiz yap.\n"
        "- Sayısal verilere dayanan, objektif ve net analizler sun. Kendi kişisel veya asılsız yorumlarını katma, rakamlara odaklan.\n"
        "- Elde ettiğin bulguları ve verileri Orchestrator ajana iletmek üzere çok net, okunaklı ve detaylı bir RAPOR formatında sun."
    )

    agent = create_agent(llm, tools=tools, system_prompt=system_prompt)
    return agent

if __name__ == "__main__":
    agent = create_market_analyzer_agent()
    response = agent.invoke({"messages": [{"role": "user", "content": "MicroStrategy gibi şirketler ne kadar Bitcoin tutuyor?"}]})
    print(response["messages"][-1].content)
