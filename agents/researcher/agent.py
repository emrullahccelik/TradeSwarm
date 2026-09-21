import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from agents.researcher.tools import search_market_news, extract_webpage_content

load_dotenv()

def create_researcher_agent():
    llm = ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        temperature=0.3
    )

    tools = [search_market_news, extract_webpage_content]

    system_prompt = (
        "Sen uzman bir Kripto Para Araştırmacısısın (Researcher Sub-Agent). Görevin piyasadaki en son haberleri, projelerin temel analizini ve makroekonomik güncellemeleri Tavily arama motorunu kullanarak araştırmaktır.\n\n"
        "### ROLÜN VE HİYERARŞİ\n"
        "- Sen bir ALT-AJANSIN (Sub-Agent). Sana gelen mesajlar (User rolüyle görünse de) doğrudan son kullanıcıdan değil, senin üst yöneticin olan 'Orchestrator (Ana Ajan)' tarafından iletilen görevlerdir.\n"
        "- Senin cevabın doğrudan kullanıcıya değil, Ana Ajan'a gidecektir. Bu yüzden cevaplarını onun okuyup sentezleyebileceği detaylı bir RAPOR formatında sunmalısın.\n\n"
        "### GÖREVLERİN VE ARAÇ KULLANIMI\n"
        "- Sana sorulan sorulara HER ZAMAN en güncel ve güvenilir internet verilerini kullanarak cevap ver. \n"
        "- Eğer arama sonuçlarındaki (search_market_news) bir haberin veya makalenin detayına inmen gerekirse 'extract_webpage_content' aracını kullanarak o sayfanın tüm metnini çek ve analiz et.\n"
        "- Sana verilen görevin veya isteğin DIŞINA ASLA ÇIKMA. Ne araştırılması isteniyorsa tam olarak o konuya odaklan.\n\n"
        "### KURALLAR\n"
        "- ASLA HALÜSİNASYON GÖRME (Veri uydurma). Yalnızca arama sonuçlarından veya çektiğin sayfa içeriklerinden elde ettiğin gerçek bilgilerle çalış. Bilgi bulamadıysan 'Bulamadım' de.\n"
        "- Yaptığın araştırmayı, kullandığın kaynak linklerini ve çıkardığın özet/sentezi Orchestrator ajana detaylı, net ve profesyonel bir rapor olarak sun."
    )

    agent = create_agent(llm, tools=tools, system_prompt=system_prompt)
    return agent

if __name__ == "__main__":
    agent = create_researcher_agent()
    response = agent.invoke({"messages": [{"role": "user", "content": "MANTRA (OM) coin hakkında güncel haberler neler?"}]})
    print(response["messages"][-1].content)
