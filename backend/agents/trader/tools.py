from decimal import Decimal
import json

from langchain.tools import tool
from binance.exceptions import BinanceAPIException
from binance.enums import ORDER_TYPE_LIMIT, TIME_IN_FORCE_GTC
from backend.agents.trader.client import get_binance_client
from backend.approvals import request_approval
from backend.config import TRADING_ENABLED

TRADING_DISABLED_MSG = "İşlem yapılmadı: emir gönderme/iptal etme devre dışı (TRADING_ENABLED=false)."

def to_decimal_str(value: float) -> str:
    """Float'ı Binance'in kabul ettiği düz ondalık metne çevirir (1e-05 -> '0.00001')."""
    return format(Decimal(str(value)).normalize(), "f")

def average_fill_price(fills: list) -> str:
    """Market emrinin parçalı dolumlarından ağırlıklı ortalama fiyatı hesaplar."""
    total_qty = sum(Decimal(f["qty"]) for f in fills)
    if not total_qty:
        return "Bilinmiyor"
    total_cost = sum(Decimal(f["price"]) * Decimal(f["qty"]) for f in fills)
    return to_decimal_str(total_cost / total_qty)

@tool
def get_exchange_info(symbol: str) -> str:
    """Belirli bir işlem çiftinin (ör. BTCUSDT) alım-satım kurallarını (minimum miktar, fiyat adımları vb.) döndürür."""
    client = get_binance_client()
    try:
        info = client.get_symbol_info(symbol.upper())
        if not info:
            return f"Hata: {symbol} için bilgi bulunamadı."
        return json.dumps(info['filters'], indent=2)
    except BinanceAPIException as e:
        return f"Hata: {e.message}"

@tool
def get_symbol_price(symbol: str) -> str:
    """Belirli bir işlem çiftinin (ör. BTCUSDT) veya tüm piyasanın güncel fiyatını döndürür. Tüm piyasa için symbol='ALL' gönderin."""
    client = get_binance_client()
    try:
        if symbol.upper() == 'ALL':
            prices = client.get_all_tickers()
            return f"Piyasadaki toplam çift sayısı: {len(prices)}. Çok fazla olduğu için sadece sayıyı döndürüyorum."
        ticker = client.get_symbol_ticker(symbol=symbol.upper())
        return f"{symbol.upper()} güncel fiyatı: {ticker['price']}"
    except BinanceAPIException as e:
        return f"Hata: {e.message}"

@tool
def get_klines(symbol: str, interval: str, limit: int = 5) -> str:
    """Geçmiş fiyat mum grafiklerini (Klines) çeker. interval: '1m', '1h', '1d' vb. limit: kaç adet mum getirileceği."""
    client = get_binance_client()
    try:
        klines = client.get_klines(symbol=symbol.upper(), interval=interval, limit=limit)
        result = []
        for k in klines:
            result.append(f"Açılış: {k[1]}, Yüksek: {k[2]}, Düşük: {k[3]}, Kapanış: {k[4]}")
        return "\n".join(result)
    except BinanceAPIException as e:
        return f"Hata: {e.message}"

@tool
def get_order_book(symbol: str, limit: int = 5) -> str:
    """Emir defterindeki (Derinlik) alıcı (bids) ve satıcı (asks) tekliflerini listeler."""
    client = get_binance_client()
    try:
        depth = client.get_order_book(symbol=symbol.upper(), limit=limit)
        bids = [f"Fiyat: {b[0]} Miktar: {b[1]}" for b in depth['bids']]
        asks = [f"Fiyat: {a[0]} Miktar: {a[1]}" for a in depth['asks']]
        return "ALICILAR (Bids):\n" + "\n".join(bids) + "\n\nSATICILAR (Asks):\n" + "\n".join(asks)
    except BinanceAPIException as e:
        return f"Hata: {e.message}"

@tool
def get_account_balance(asset: str = None) -> str:
    """Hesaptaki varlıkların bakiyesini döndürür. İsteğe bağlı olarak sadece belirli bir varlığı (ör. USDT) sorgulayabilirsiniz."""
    client = get_binance_client()
    try:
        account_info = client.get_account()
        balances = account_info.get("balances", [])
        if asset:
            for balance in balances:
                if balance["asset"].upper() == asset.upper():
                    return f"{asset.upper()} - Kullanılabilir: {balance['free']}, Kilitli: {balance['locked']}"
            return f"Hesapta {asset.upper()} bulunamadı."
        
        result = []
        for balance in balances:
            free = float(balance["free"])
            locked = float(balance["locked"])
            if free > 0 or locked > 0:
                result.append(f"{balance['asset']} - Kullanılabilir: {free}, Kilitli: {locked}")
        
        if not result:
            return "Hesapta 0'dan büyük bakiye bulunamadı."
        return "\n".join(result)
    except BinanceAPIException as e:
        return f"Hata: {e.message}"

@tool
def get_my_trades(symbol: str, limit: int = 5) -> str:
    """Belirli bir coindeki (ör. BTCUSDT) geçmiş alım-satım işlemlerinizi listeler."""
    client = get_binance_client()
    try:
        trades = client.get_my_trades(symbol=symbol.upper(), limit=limit)
        if not trades:
            return "Geçmiş işlem bulunamadı."
        result = []
        for t in trades:
            side = "ALIM" if t['isBuyer'] else "SATIM"
            result.append(f"{side} | Fiyat: {t['price']} | Miktar: {t['qty']} | Komisyon: {t['commission']} {t['commissionAsset']}")
        return "\n".join(result)
    except BinanceAPIException as e:
        return f"Hata: {e.message}"

@tool
def get_open_orders(symbol: str = None) -> str:
    """Açıkta bekleyen emirleri listeler. İsteğe bağlı olarak 'symbol' (ör. BTCUSDT) verilerek filtrelenebilir."""
    client = get_binance_client()
    try:
        if symbol:
            orders = client.get_open_orders(symbol=symbol.upper())
        else:
            orders = client.get_open_orders()
            
        if not orders:
            return "Açıkta bekleyen emir bulunmuyor."
            
        result = []
        for order in orders:
            result.append(f"Emir ID: {order['orderId']} | {order['symbol']} | {order['side']} | Miktar: {order['origQty']} | Fiyat: {order['price']}")
        return "\n".join(result)
    except BinanceAPIException as e:
        return f"Hata: {e.message}"

@tool
def create_market_order(symbol: str, side: str, quantity: float) -> str:
    """Piyasa emri (Market Order) gönderir. side: 'BUY' veya 'SELL'. quantity: alınacak/satılacak miktar."""
    if not TRADING_ENABLED:
        return TRADING_DISABLED_MSG
    side = side.upper()
    if side not in ("BUY", "SELL"):
        return "Hata: Geçersiz işlem yönü (side). 'BUY' veya 'SELL' olmalıdır."
    qty = to_decimal_str(quantity)
    refusal = request_approval("create_market_order", {"symbol": symbol.upper(), "side": side, "quantity": qty})
    if refusal:
        return refusal
    client = get_binance_client()
    try:
        if side == "BUY":
            order = client.order_market_buy(symbol=symbol.upper(), quantity=qty)
        else:
            order = client.order_market_sell(symbol=symbol.upper(), quantity=qty)

        avg_price = average_fill_price(order.get("fills") or [])
        return f"İşlem başarılı! Emir ID: {order['orderId']}, Durum: {order['status']}, Ortalama Gerçekleşen Fiyat: {avg_price}"
    except BinanceAPIException as e:
        return f"İşlem başarısız: {e.message}"

@tool
def create_limit_order(symbol: str, side: str, quantity: float, price: float) -> str:
    """Limit emri gönderir. side: 'BUY' veya 'SELL'. Belirlenen fiyattan (price) işleme girer."""
    if not TRADING_ENABLED:
        return TRADING_DISABLED_MSG
    details = {"symbol": symbol.upper(), "side": side.upper(), "quantity": to_decimal_str(quantity), "price": to_decimal_str(price)}
    refusal = request_approval("create_limit_order", details)
    if refusal:
        return refusal
    client = get_binance_client()
    try:
        order = client.create_order(
            symbol=details["symbol"],
            side=details["side"],
            type=ORDER_TYPE_LIMIT,
            timeInForce=TIME_IN_FORCE_GTC,
            quantity=details["quantity"],
            price=details["price"]
        )
        return f"Limit emir başarıyla oluşturuldu! Emir ID: {order['orderId']}, Durum: {order['status']}"
    except BinanceAPIException as e:
        return f"İşlem başarısız: {e.message}"

@tool
def create_oco_order(symbol: str, side: str, quantity: float, price: float, stop_price: float, stop_limit_price: float) -> str:
    """OCO (Biri Diğerini İptal Eden) emir gönderir. Hem kâr al (price) hem zarar kes (stop_price) noktası belirlenir."""
    if not TRADING_ENABLED:
        return TRADING_DISABLED_MSG
    details = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "quantity": to_decimal_str(quantity),
        "price": to_decimal_str(price),
        "stop_price": to_decimal_str(stop_price),
        "stop_limit_price": to_decimal_str(stop_limit_price),
    }
    refusal = request_approval("create_oco_order", details)
    if refusal:
        return refusal
    client = get_binance_client()
    try:
        order = client.create_oco_order(
            symbol=details["symbol"],
            side=details["side"],
            quantity=details["quantity"],
            price=details["price"],
            stopPrice=details["stop_price"],
            stopLimitPrice=details["stop_limit_price"],
            stopLimitTimeInForce=TIME_IN_FORCE_GTC
        )
        return f"OCO Emir başarıyla oluşturuldu! Emir Listesi ID: {order['orderListId']}"
    except BinanceAPIException as e:
        return f"İşlem başarısız: {e.message}"

@tool
def cancel_open_order(symbol: str, order_id: int) -> str:
    """Belirli bir işlem çiftindeki açık emri ID'sine göre iptal eder."""
    if not TRADING_ENABLED:
        return TRADING_DISABLED_MSG
    refusal = request_approval("cancel_open_order", {"symbol": symbol.upper(), "order_id": order_id})
    if refusal:
        return refusal
    client = get_binance_client()
    try:
        result = client.cancel_order(symbol=symbol.upper(), orderId=order_id)
        return f"Emir iptal edildi. Emir ID: {result['orderId']}, Durum: {result['status']}"
    except BinanceAPIException as e:
        return f"İptal işlemi başarısız: {e.message}"

