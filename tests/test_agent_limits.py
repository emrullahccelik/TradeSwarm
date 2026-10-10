import importlib

import pytest

from backend import config


@pytest.mark.parametrize("module_name, factory_name, model_ctor, expected", [
    ("backend.agents.orchestrator.agent", "create_orchestrator_agent", "init_chat_model", config.ORCHESTRATOR_MAX_TOKENS),
    ("backend.agents.trader.agent", "create_trader_agent", "ChatOpenAI", config.SUB_AGENT_MAX_TOKENS),
    ("backend.agents.researcher.agent", "create_researcher_agent", "ChatOpenAI", config.SUB_AGENT_MAX_TOKENS),
    ("backend.agents.market_analyzer.agent", "create_market_analyzer_agent", "ChatOpenAI", config.SUB_AGENT_MAX_TOKENS),
])
def test_every_agent_caps_response_tokens(monkeypatch, module_name, factory_name, model_ctor, expected):
    # Sınır olmadan model bitmeyen bir çıktı döngüsüne girebiliyor (ör. yüz binlerce "." karakteri)
    module = importlib.import_module(module_name)
    real_ctor = getattr(module, model_ctor)
    captured = {}

    def capture(*args, **kwargs):
        captured.update(kwargs)
        return real_ctor(*args, **kwargs)

    monkeypatch.setattr(module, model_ctor, capture)
    getattr(module, factory_name)()

    assert captured["max_tokens"] == expected
