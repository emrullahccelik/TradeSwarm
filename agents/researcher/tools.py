from backend.config import OPENROUTER_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, BINANCE_SPOT_API_KEY, BINANCE_SPOT_SECRET_KEY, TAVILY_API_KEY

from langchain.tools import tool
from tavily import TavilyClient

def get_tavily_client():
    return TavilyClient(api_key=TAVILY_API_KEY)

@tool
def search_market_news(query: str) -> str:
    """Kripto para piyasası, projeler, teknik gelişmeler ve genel haberler hakkında güncel bilgileri internetten arar.
    Kullanım: Arama yapmak istediğiniz metni (query) girin."""
    client = get_tavily_client()
    try:
        response = client.search(query, max_results=5)
        results = response.get('results', [])
        
        formatted = []
        for i, res in enumerate(results, 1):
            title = res.get('title', 'Başlıksız')
            content = res.get('content', 'İçerik yok')
            url = res.get('url', '#')
            formatted.append(f"{i}. {title}\n   Özet: {content}\n   Kaynak: {url}")
        
        if not formatted:
            return "Arama sonucu bulunamadı."
            
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Arama sırasında hata oluştu: {str(e)}"

@tool
def extract_webpage_content(urls: list[str]) -> str:
    """Verilen URL veya URL'lerin (en fazla 3) içerisindeki ham metni (makale, haber vb.) çeker ve döndürür.
    Kullanım: Okumak istediğiniz web sayfalarının linklerini liste formatında verin. (ör: ['https://example.com'])"""
    client = get_tavily_client()
    try:
        response = client.extract(urls)
        results = response.get('results', [])
        
        formatted = []
        for res in results:
            url = res.get('url', 'Bilinmeyen URL')
            content = res.get('raw_content', res.get('content', 'İçerik çekilemedi'))
            formatted.append(f"--- KAYNAK: {url} ---\n{content}\n")
            
        if not formatted:
            return "İçerik çıkarılamadı veya desteklenmeyen URL."
            
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Sayfa içeriği çekilirken hata oluştu: {str(e)}"
