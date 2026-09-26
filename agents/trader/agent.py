from backend.config import OPENROUTER_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, BINANCE_SPOT_API_KEY, BINANCE_SPOT_SECRET_KEY, TAVILY_API_KEY


from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from agents.trader.tools import (
    get_exchange_info,
    get_symbol_price,
    get_klines,
    get_order_book,
    get_account_balance,
    get_my_trades,
    get_open_orders,
    create_market_order,
    create_limit_order,
    create_oco_order,
    cancel_open_order
)



def create_trader_agent():
    llm = ChatOpenAI(
        model=OPENROUTER_MODEL,
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        temperature=0
    )

    tools = [
        get_exchange_info,
        get_symbol_price,
        get_klines,
        get_order_book,
        get_account_balance,
        get_my_trades,
        get_open_orders,
        create_market_order,
        create_limit_order,
        create_oco_order,
        cancel_open_order
    ]

    system_prompt = (
        "Sen uzman bir kripto para alım-satım asistanısın (Trader Sub-Agent). Binance Spot Testnet üzerinden işlem yapıyorsun.\n\n"
        "### ROLÜN VE HİYERARŞİ\n"
        "- Sen bir ALT-AJANSIN (Sub-Agent). Sana gelen mesajlar (User rolüyle görünse de) doğrudan son kullanıcıdan değil, senin üst yöneticin olan 'Orchestrator (Ana Ajan)' tarafından iletilen görevlerdir.\n"
        "- Senin cevabın da doğrudan kullanıcıya değil, Ana Ajan'a gidecektir. Ana Ajan senin raporunu değerlendirip kullanıcıya nihai cevabı sunacaktır.\n\n"
        "### GÖREVLERİN\n"
        "- Orchestrator ajan senden fiyat sorgulamanı, bakiyeye bakmanı, emir vermeni (Market/Limit/OCO) veya açık emirleri iptal etmeni isteyebilir.\n"
        "- Sana verilen görevin veya isteğin DIŞINA ASLA ÇIKMA. Ne isteniyorsa tam olarak onu yerine getir.\n\n"
        "### KURALLAR\n"
        "- ASLA HALÜSİNASYON GÖRME (Veri uydurma). Sadece elindeki araçların (tools) döndürdüğü somut verilere göre hareket et.\n"
        "- Yaptığın her işlemi, kullandığın araçları ve elde ettiğin sonuçları detaylı ve yapılandırılmış bir RAPOR olarak Orchestrator ajana sun.\n"
        "- İşlem başarılı olduysa işlem numaralarını (ID), fiyatlarını veya bakiye değişimlerini raporuna mutlaka ekle."
    )

    agent = create_agent(llm, tools=tools, system_prompt=system_prompt)
    return agent

if __name__ == "__main__":
    agent = create_trader_agent()
    response = agent.invoke({"messages": [{"role": "user", "content": "USDT bakiyemi kontrol eder misin?"}]})
    print(response["messages"][-1].content)
