from langchain.tools import tool
from pycoingecko import CoinGeckoAPI
from backend.config import COINGECKO_API_KEY, COINGECKO_API_PLAN

_cg_client = None

def get_cg_client() -> CoinGeckoAPI:
    global _cg_client
    if _cg_client is None:
        # Anahtar yoksa herkese açık (düşük limitli) API kullanılır
        if COINGECKO_API_KEY and COINGECKO_API_PLAN == "pro":
            _cg_client = CoinGeckoAPI(api_key=COINGECKO_API_KEY)
        else:
            _cg_client = CoinGeckoAPI(demo_api_key=COINGECKO_API_KEY or "")
    return _cg_client

@tool
def get_simple_price(coin_ids: str, vs_currencies: str = 'usd') -> str:
    """Belirtilen coinlerin anlık fiyatını çeker. 
    Örnek coin_ids: 'bitcoin,ethereum,mantra-dao'. vs_currencies: 'usd,eur'."""
    cg = get_cg_client()
    try:
        data = cg.get_price(ids=coin_ids, vs_currencies=vs_currencies, include_24hr_vol=True, include_24hr_change=True)
        if not data:
            return "Veri bulunamadı. Coin ID'lerini doğru yazdığınızdan emin olun (ör: 'bitcoin')."
            
        result = []
        for coin, info in data.items():
            price = info.get(vs_currencies.lower(), 0)
            change = info.get(f"{vs_currencies.lower()}_24h_change", 0)
            vol = info.get(f"{vs_currencies.lower()}_24h_vol", 0)
            result.append(f"{coin.upper()} -> Fiyat: {price} {vs_currencies.upper()} | 24s Değişim: %{change:.2f} | 24s Hacim: {vol:,.0f}")
        return "\n".join(result)
    except Exception as e:
        return f"Hata: {str(e)}"

@tool
def get_coin_details(coin_id: str) -> str:
    """Bir coinin tüm temel detaylarını (piyasa değeri, Github aktifliği, topluluk verileri) çeker."""
    cg = get_cg_client()
    try:
        data = cg.get_coin_by_id(
            id=coin_id.lower(), localization=False, tickers=False, 
            market_data=True, community_data=True, developer_data=True, sparkline=False
        )
        
        name = data.get('name', coin_id)
        symbol = data.get('symbol', '').upper()
        market_cap = data['market_data']['market_cap'].get('usd', 0)
        twitter = data['community_data'].get('twitter_followers', 0)
        dev_commits = data['developer_data'].get('commit_count_4_weeks', 0)
        desc = data.get('description', {}).get('en', '')[:200]
        
        return (f"🪙 {name} ({symbol}) Detayları:\n"
                f"- Piyasa Değeri: ${market_cap:,.0f}\n"
                f"- Twitter(X) Takipçisi: {twitter:,}\n"
                f"- Son 4 Haftalık Github Commits: {dev_commits}\n"
                f"- Kısa Açıklama: {desc}...")
    except Exception as e:
        return f"Hata: {str(e)}"

@tool
def get_coin_exchanges(coin_id: str, limit: int = 5) -> str:
    """Bir coinin hangi borsalarda (Binance, Kraken vb.) ve hangi paritelerle (USDT, BTC) işlem gördüğünü ve hacimlerini listeler."""
    cg = get_cg_client()
    try:
        data = cg.get_coin_ticker_by_id(id=coin_id.lower())
        tickers = data.get('tickers', [])[:limit]
        
        if not tickers:
            return "Borsa listesi bulunamadı."
            
        result = [f"📊 {coin_id.upper()} Borsa Listelenmeleri (İlk {limit}):"]
        for t in tickers:
            market = t['market']['name']
            pair = f"{t['base']}/{t['target']}"
            vol = t['volume']
            result.append(f"- {market}: {pair} (Hacim: {vol:,.2f})")
        return "\n".join(result)
    except Exception as e:
        return f"Hata: {str(e)}"

@tool
def get_historical_price(coin_id: str, date_dd_mm_yyyy: str) -> str:
    """Geçmiş spesifik bir tarihteki (ör: '30-12-2023') fiyat ve piyasa değeri verilerini çeker."""
    cg = get_cg_client()
    try:
        data = cg.get_coin_history_by_id(id=coin_id.lower(), date=date_dd_mm_yyyy)
        price = data['market_data']['current_price'].get('usd', 0)
        mcap = data['market_data']['market_cap'].get('usd', 0)
        return f"📅 {date_dd_mm_yyyy} Tarihinde {coin_id.upper()}:\nFiyat: ${price:,.4f}\nPiyasa Değeri: ${mcap:,.0f}"
    except Exception as e:
        return f"Hata: {str(e)}"

@tool
def get_category_coins(category_id: str, limit: int = 5) -> str:
    """Belirli bir kategorideki (ör: 'artificial-intelligence', 'meme-token') en büyük coinleri sıralar."""
    cg = get_cg_client()
    try:
        coins = cg.get_coins_markets(vs_currency='usd', category=category_id.lower(), per_page=limit, page=1)
        if not coins:
            return f"'{category_id}' kategorisinde veri bulunamadı."
            
        result = [f"📂 Kategori: {category_id.upper()} (En Büyük {limit} Coin)"]
        for c in coins:
            result.append(f"{c['market_cap_rank']}. {c['name']} ({c['symbol'].upper()}) - Fiyat: ${c['current_price']} | 24s Değişim: %{c.get('price_change_percentage_24h', 0):.2f}")
        return "\n".join(result)
    except Exception as e:
        return f"Hata: {str(e)}"

@tool
def get_global_market_data() -> str:
    """Kripto piyasasının makro verilerini (Toplam Market Değeri, BTC Dominansı vb.) döndürür."""
    cg = get_cg_client()
    try:
        global_data = cg.get_global()
        total_mcap = global_data.get('total_market_cap', {}).get('usd', 0)
        total_volume = global_data.get('total_volume', {}).get('usd', 0)
        btc_d = global_data.get('market_cap_percentage', {}).get('btc', 0)
        eth_d = global_data.get('market_cap_percentage', {}).get('eth', 0)
        
        return (f"🌍 Global Piyasa Özeti:\n"
                f"- Toplam Piyasa Değeri: ${total_mcap:,.0f}\n"
                f"- 24s Toplam Hacim: ${total_volume:,.0f}\n"
                f"- BTC Dominansı: %{btc_d:.2f}\n"
                f"- ETH Dominansı: %{eth_d:.2f}")
    except Exception as e:
        return f"Hata: {str(e)}"

@tool
def get_trending_search() -> str:
    """CoinGecko'da şu an en çok aratılan (trend olan) ilk 7 coini döndürür."""
    cg = get_cg_client()
    try:
        trending = cg.get_search_trending()
        coins = trending.get('coins', [])
        
        result = ["🔥 CoinGecko Trend Olanlar:"]
        for c in coins:
            item = c['item']
            result.append(f"{item['market_cap_rank']}. {item['name']} ({item['symbol']})")
        return "\n".join(result)
    except Exception as e:
        return f"Hata: {str(e)}"

@tool
def get_public_treasury(coin_id: str = 'bitcoin') -> str:
    """Halka açık şirketlerin (Tesla, MicroStrategy vb.) elinde tuttukları belirtilen coinin (bitcoin veya ethereum) miktarını ve listesini döndürür."""
    cg = get_cg_client()
    try:
        data = cg.get_companies_public_treasury_by_coin_id(coin_id=coin_id.lower())
        companies = data.get('companies', [])[:5]
        
        result = [f"🏢 {coin_id.upper()} Tutan Halka Açık Şirketler (İlk 5):"]
        for c in companies:
            result.append(f"- {c['name']} | Tutar: {c['total_holdings']} {coin_id.upper()} | Toplam Arz Yüzdesi: %{c['percentage_of_total_supply']}")
        return "\n".join(result)
    except Exception as e:
        return f"Hata: Sadece 'bitcoin' veya 'ethereum' desteklenir. {str(e)}"
