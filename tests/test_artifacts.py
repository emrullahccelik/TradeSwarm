import asyncio

import pytest

from backend import artifacts
from backend.agents.orchestrator.agent import create_orchestrator_agent

CONFIG = {"configurable": {"thread_id": "session-1"}}


@pytest.fixture
def store(monkeypatch):
    # DB yerine bellekteki liste; yayınlanan olaylar da burada toplanır
    saved, events = [], []

    async def load_latest(session_id, artifact_id):
        matches = [a for a in saved if a.session_id == session_id and a.artifact_id == artifact_id]
        return max(matches, key=lambda a: a.version, default=None)

    async def save(artifact):
        saved.append(artifact)

    async def dispatch(name, data, config=None):
        events.append((name, data))

    monkeypatch.setattr(artifacts, "_load_latest", load_latest)
    monkeypatch.setattr(artifacts, "_save", save)
    monkeypatch.setattr(artifacts, "adispatch_custom_event", dispatch)
    return saved, events


def run(tool, **args):
    return asyncio.run(tool.coroutine(**args, config=CONFIG))


def test_create_saves_first_version_and_publishes_it(store):
    saved, events = store

    result = run(artifacts.create_artifact, title="BTC Raporu", content="<h1>BTC</h1>")

    assert len(saved) == 1 and saved[0].version == 1 and saved[0].session_id == "session-1"
    artifact_id = saved[0].artifact_id
    assert artifact_id in result
    assert events == [("artifact", {"artifact_id": artifact_id, "version": 1, "title": "BTC Raporu", "content": "<h1>BTC</h1>"})]


def test_update_adds_new_version_and_keeps_title(store):
    saved, events = store
    run(artifacts.create_artifact, title="BTC Raporu", content="<h1>v1</h1>")
    artifact_id = saved[0].artifact_id

    run(artifacts.update_artifact, artifact_id=artifact_id, content="<h1>v2</h1>")

    assert [a.version for a in saved] == [1, 2]
    assert events[-1][1] == {"artifact_id": artifact_id, "version": 2, "title": "BTC Raporu", "content": "<h1>v2</h1>"}
    assert "<h1>v2</h1>" in run(artifacts.get_artifact, artifact_id=artifact_id)


def test_update_of_unknown_artifact_publishes_nothing(store):
    saved, events = store

    result = run(artifacts.update_artifact, artifact_id="missing", content="<h1>x</h1>")

    assert result.startswith("Hata")
    assert saved == [] and events == []


@pytest.mark.parametrize("content", ["   ", "x" * (artifacts.MAX_ARTIFACT_CHARS + 1)])
def test_empty_or_oversized_content_is_rejected(store, content):
    saved, events = store

    assert run(artifacts.create_artifact, title="t", content=content).startswith("Hata")
    assert saved == [] and events == []


def test_context_lists_latest_versions():
    assert artifacts.artifacts_context([]) is None
    note = artifacts.artifacts_context([("abc12345", "BTC Raporu", 3)])
    assert "abc12345: BTC Raporu (v3)" in note


def test_orchestrator_has_artifact_tools():
    tool_names = set(create_orchestrator_agent().get_graph().nodes["tools"].data.tools_by_name)
    assert {"create_artifact", "update_artifact", "get_artifact"} <= tool_names
