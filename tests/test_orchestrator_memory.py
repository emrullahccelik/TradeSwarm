from backend.agents.orchestrator.agent import create_orchestrator_agent


def test_orchestrator_has_no_checkpointer():
    # Geçmiş her istekte DB'den gönderildiği için checkpointer mesajları her turda çoğaltırdı
    assert create_orchestrator_agent().checkpointer is None
