import os
import time
from dotenv import load_dotenv
from binance.client import Client
from binance.exceptions import BinanceAPIException

load_dotenv()

API_KEY = os.getenv("BINANCE_SPOT_API_KEY")
SECRET_KEY = os.getenv("BINANCE_SPOT_SECRET_KEY")

# Uyarı: Eğer verdiğiniz API key'ler gerçek hesaba (mainnet) aitse testnet=False olmalıdır.
# Sizin verdiğiniz anahtarları test edeceğimiz için şimdilik testnet=False yapıyorum.
client = Client(API_KEY, SECRET_KEY, testnet=True)


# Zaman senkronizasyonu hatasını önlemek için otomatik offset hesaplama:
server_time = client.get_server_time()
client.timestamp_offset = server_time['serverTime'] - int(time.time() * 1000)

try:
    # 1. Tüm hesap detaylarını çekme
    account_info = client.get_account()

    print(f"Hesap İzinleri: {account_info.get('permissions')}")
    print(f"İşlem Yapabilir mi?: {account_info.get('canTrade')}\n")
    print("--- SIFIRDAN BÜYÜK BAKİYELER ---")

    # Bakiyesi 0'dan büyük olanları listeleme
    has_balance = False
    for balance in account_info['balances']:
        free = float(balance['free'])      # Kullanılabilir bakiye
        locked = float(balance['locked'])  # Açık emirlerde kilitli bakiye
        total = free + locked

        if total > 0:
            has_balance = True
            print(f"Varlık: {balance['asset']:<6} | Kullanılabilir: {free:<12} | Kilitli: {locked:<12} | Toplam: {total}")

    if not has_balance:
        print("Hesapta pozitif bakiye bulunamadı.")

    # 2. Belirli tek bir varlığı (örneğin USDT) sorgulama
    usdt_balance = client.get_asset_balance(asset="USDT")
    print(f"\nÖzel Sorgu (USDT Serbest Bakiye): {usdt_balance['free']}")

except BinanceAPIException as e:
    print(f"Binance API Hatası: {e.status_code} - {e.message}")
except Exception as e:
    print(f"Hata: {e}")
