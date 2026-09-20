import os
from agents.trader.tools import (
    get_exchange_info, get_symbol_price, get_klines, get_order_book,
    get_account_balance, get_my_trades, get_open_orders, create_market_order
)

def run_tests():
    print("--- 1. EXCHANGE INFO (BTCUSDT) ---")
    info = get_exchange_info.invoke({"symbol": "BTCUSDT"})
    print(str(info)[:300] + "...\n")

    print("--- 2. SYMBOL PRICE (BTCUSDT) ---")
    print(get_symbol_price.invoke({"symbol": "BTCUSDT"}) + "\n")

    print("--- 3. KLINES (BTCUSDT 1h, limit=2) ---")
    print(get_klines.invoke({"symbol": "BTCUSDT", "interval": "1h", "limit": 2}) + "\n")

    print("--- 4. ORDER BOOK (BTCUSDT, limit=2) ---")
    print(get_order_book.invoke({"symbol": "BTCUSDT", "limit": 2}) + "\n")

    print("--- 5. ACCOUNT BALANCE (USDT) ---")
    print(get_account_balance.invoke({"asset": "USDT"}) + "\n")

    print("--- 6. MY TRADES (BTCUSDT) ---")
    print(get_my_trades.invoke({"symbol": "BTCUSDT", "limit": 2}) + "\n")

    print("--- 7. OPEN ORDERS (BTCUSDT) ---")
    print(get_open_orders.invoke({"symbol": "BTCUSDT"}) + "\n")

if __name__ == "__main__":
    run_tests()
