from unittest.mock import MagicMock

from backend.agents.researcher import tools


def test_extract_truncates_long_pages_and_limits_url_count(monkeypatch):
    client = MagicMock()
    client.extract.return_value = {"results": [{"url": "https://a", "raw_content": "x" * 20000}]}
    monkeypatch.setattr(tools, "get_tavily_client", lambda: client)

    result = tools.extract_webpage_content.invoke({"urls": ["https://a", "https://b", "https://c", "https://d"]})

    client.extract.assert_called_once_with(["https://a", "https://b", "https://c"])
    assert result.count("x") == tools.MAX_PAGE_CHARS
    assert "kesildi" in result
