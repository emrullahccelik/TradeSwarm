from backend.config import BINANCE_SPOT_API_KEY, BINANCE_SPOT_SECRET_KEY

import time

from binance.client import Client



_client_instance = None

def get_binance_client() -> Client:
    global _client_instance
    if _client_instance is not None:
        return _client_instance
        
    api_key = BINANCE_SPOT_API_KEY
    secret_key = BINANCE_SPOT_SECRET_KEY
    
    # Testnet üzerinden çalışıyoruz
    client = Client(api_key, secret_key, testnet=True)
    
    # Zaman senkronizasyonu
    try:
        server_time = client.get_server_time()
        client.timestamp_offset = server_time['serverTime'] - int(time.time() * 1000)
    except Exception as e:
        print(f"Zaman senkronizasyonu hatası (Client başlatılırken): {e}")
        
    _client_instance = client
    return _client_instance
