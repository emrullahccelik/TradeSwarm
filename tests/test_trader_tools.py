from unittest.mock import MagicMock

import pytest

from backend.agents.trader import tools


@pytest.mark.parametrize("value, expected", [
    (1e-05, "0.00001"),
    (0.1, "0.1"),
    (100.0, "100"),
    (42000.50, "42000.5"),
])
def test_to_decimal_str_never_uses_scientific_notation(value, expected):
    assert tools.to_decimal_str(value) == expected


def test_average_fill_price_is_quantity_weighted():
    fills = [{"price": "100", "qty": "1"}, {"price": "110", "qty": "3"}]
    assert tools.average_fill_price(fills) == "107.5"


@pytest.fixture
def approve_all(monkeypatch):
    monkeypatch.setattr(tools, "request_approval", lambda action, details: None)


@pytest.mark.parametrize("fills", [None, []])
def test_market_order_without_fills_does_not_crash(monkeypatch, approve_all, fills):
    client = MagicMock()
    client.order_market_buy.return_value = {"orderId": 7, "status": "FILLED", "fills": fills}
    monkeypatch.setattr(tools, "get_binance_client", lambda: client)

    result = tools.create_market_order.invoke({"symbol": "btcusdt", "side": "buy", "quantity": 1e-05})

    assert "Emir ID: 7" in result
    assert "Bilinmiyor" in result
    client.order_market_buy.assert_called_once_with(symbol="BTCUSDT", quantity="0.00001")


def test_order_tools_refuse_when_trading_disabled(monkeypatch):
    monkeypatch.setattr(tools, "TRADING_ENABLED", False)
    client = MagicMock()
    monkeypatch.setattr(tools, "get_binance_client", lambda: client)

    result = tools.create_market_order.invoke({"symbol": "BTCUSDT", "side": "BUY", "quantity": 1})

    assert result == tools.TRADING_DISABLED_MSG
    client.order_market_buy.assert_not_called()


@pytest.mark.parametrize("tool, args, client_method", [
    (tools.create_market_order, {"symbol": "btcusdt", "side": "buy", "quantity": 0.5}, "order_market_buy"),
    (tools.create_limit_order, {"symbol": "btcusdt", "side": "sell", "quantity": 1, "price": 70000}, "create_order"),
    (tools.create_oco_order, {"symbol": "btcusdt", "side": "sell", "quantity": 1, "price": 75000,
                              "stop_price": 65000, "stop_limit_price": 64900}, "create_oco_order"),
    (tools.cancel_open_order, {"symbol": "btcusdt", "order_id": 42}, "cancel_order"),
])
def test_order_tools_do_nothing_when_user_refuses(monkeypatch, tool, args, client_method):
    requested = []

    def refuse(action, details):
        requested.append((action, details))
        return "İşlem yapılmadı: kullanıcı bu emri REDDETTİ."

    monkeypatch.setattr(tools, "request_approval", refuse)
    client = MagicMock()
    monkeypatch.setattr(tools, "get_binance_client", lambda: client)

    result = tool.invoke(args)

    assert "REDDETTİ" in result
    getattr(client, client_method).assert_not_called()
    # Kullanıcıya gösterilen detaylar Binance'e gidecek normalize edilmiş değerlerdir
    assert requested[0][0] == tool.name
    assert requested[0][1]["symbol"] == "BTCUSDT"
