import math
from agents.trader.client import get_binance_client
from binance.enums import SIDE_SELL, ORDER_TYPE_MARKET
from binance.exceptions import BinanceAPIException

# Satılmayacak olan (elde tutulacak) coin ve hisselerin listesi
KEEP_LIST = [
    # Top Kriptolar
    "USDT", "USDC", "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK",
    # Top Hisseler (Testnet versiyonları)
    "AAPLB", "TSLAB", "MSFTB", "GOOGLB", "AMZNB", "NVDAB", "METAB", "NFLXB", "GMEB", "COINB", "PLTRB", "MSTRB"
]

def clean_account():
    client = get_binance_client()
    print("Borsa bilgileri çekiliyor...")
    info = client.get_exchange_info()
    
    # Hangi sembolün hangi çiftlerle işlem gördüğünü ve step_size (virgülden sonra kaç hane) bilgisini bir dict'te toplayalım
    symbols_info = {}
    for s in info['symbols']:
        if s['status'] == 'TRADING':
            step_size = "1"
            for f in s['filters']:
                if f['filterType'] == 'LOT_SIZE':
                    step_size = f['stepSize']
                    break
            symbols_info[s['symbol']] = step_size
            
    print("Hesap bakiyeleri çekiliyor...")
    account_info = client.get_account()
    
    sold_count = 0
    failed_count = 0
    
    for balance in account_info['balances']:
        asset = balance['asset']
        free = float(balance['free'])
        
        if free > 0 and asset not in KEEP_LIST:
            pair = f"{asset}USDT"
            
            if pair in symbols_info:
                # Lot size'a (adım büyüklüğüne) göre miktarı formatla
                step_size = float(symbols_info[pair])
                precision = int(round(-math.log(step_size, 10), 0))
                
                # Hassasiyete göre miktarı aşağı yuvarla
                if precision > 0:
                    qty_str = f"{{:.{precision}f}}".format(free)
                else:
                    qty_str = str(int(free))
                    
                qty = float(qty_str)
                
                if qty > 0:
                    try:
                        client.create_order(
                            symbol=pair,
                            side=SIDE_SELL,
                            type=ORDER_TYPE_MARKET,
                            quantity=qty_str
                        )
                        print(f"✅ SATILDI: {qty_str} {asset} ({pair})")
                        sold_count += 1
                    except BinanceAPIException as e:
                        print(f"❌ HATA ({asset}): {e.message}")
                        failed_count += 1
            else:
                print(f"⚠️ ATLANDI: {asset} için USDT işlem çifti bulunamadı.")
                
    print(f"\n--- İŞLEM TAMAMLANDI ---")
    print(f"Başarıyla Satılan Coin Sayısı: {sold_count}")
    print(f"Hata Veren/Satılamayan Sayısı: {failed_count}")

if __name__ == "__main__":
    clean_account()
