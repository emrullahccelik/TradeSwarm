"use client";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useAuth } from "@/hooks/use-auth";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { ArtifactPanel } from "@/components/artifact/artifact-panel";
import { ArtifactPanelContext, SelectedArtifact } from "@/hooks/use-artifact-panel";
import { apiGet, apiPost } from "@/lib/api";
import { collectArtifactVersions } from "@/lib/artifact";
import type { Session } from "@/types";

interface ChatPanelProps {
  sessionId?: string;
  sessionTitle?: string;
  onSessionUpdate?: (id: string, title: string) => void;
  onResponseDone?: () => void;
}

export function ChatPanel({ sessionId, sessionTitle, onSessionUpdate, onResponseDone }: ChatPanelProps) {
  const { messages, setMessages, clearMessages, isGenerating, sendMessage, stopGeneration } = useChatStream();
  const { token } = useAuth();
  const [selectedArtifact, setSelectedArtifact] = useState<SelectedArtifact | null>(null);
  const lastOpenedArtifact = useRef<string | null>(null);

  const artifactVersions = useMemo(() => collectArtifactVersions(messages), [messages]);
  const selectedVersions = selectedArtifact ? artifactVersions[selectedArtifact.artifactId] : undefined;
  const artifactPanel = useMemo(
    () => ({ selected: selectedArtifact, openArtifact: setSelectedArtifact }),
    [selectedArtifact]
  );

  useEffect(() => {
    setSelectedArtifact(null);
  }, [sessionId]);

  // Cevap sırasında oluşturulan/güncellenen artifact panelde otomatik açılır
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last?.isStreaming) return;
    const event = last.uiEvents.findLast((e) => e.type === "artifact");
    if (!event?.artifact_id || !event.version) return;
    const key = `${event.artifact_id}-${event.version}`;
    if (lastOpenedArtifact.current === key) return;
    lastOpenedArtifact.current = key;
    setSelectedArtifact({ artifactId: event.artifact_id, version: event.version });
  }, [messages]);

  useEffect(() => {
    if (!sessionId) {
      clearMessages();
    } else if (token && !isGenerating) {
      apiGet<any[]>(`/api/sessions/${sessionId}/messages`)
      .then(data => {
         if (Array.isArray(data)) {
           setMessages(data.map((m: any) => ({
             id: String(m.id),
             role: m.role,
             content: m.content,
             uiEvents: m.ui_state || []
           })));
         }
      })
      .catch(err => console.error("Failed to load messages", err));
    }
  }, [sessionId, token, clearMessages, setMessages]);

  // Cevap bitince backend başlığı üretmiş/güncellemiş olur; sohbet listesi yenilenir
  const sendAndRefresh = useCallback(
    (text: string, sid: string, onDone?: () => void, onContentChunk?: (chunk: string) => void) =>
      sendMessage(
        text,
        sid,
        () => {
          onDone?.();
          onResponseDone?.();
        },
        onContentChunk
      ),
    [sendMessage, onResponseDone]
  );

  // Yazılı ve sesli mesajlar aynı yoldan gider; akış bitince resolve olur
  const handleSendMessage = async (text: string, onContentChunk?: (chunk: string) => void) => {
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      try {
        // Başlık verilmez: backend ilk cevaptan sonra LLM ile başlık üretir
        const session = await apiPost<Session>("/api/sessions", {});
        currentSessionId = session.id;
        onSessionUpdate?.(session.id, session.title);
      } catch (error) {
        console.error("Failed to create session", error);
        return;
      }
    }

    await sendAndRefresh(text, currentSessionId, undefined, onContentChunk);
  };

  const voice = useVoiceChat(handleSendMessage);

  return (
    <ArtifactPanelContext.Provider value={artifactPanel}>
      <div className="flex h-full w-full relative overflow-hidden">
        <div className="flex flex-col h-full flex-1 min-w-0 bg-background relative overflow-hidden">
          <ChatHeader sessionTitle={sessionTitle} />

          <ChatMessages messages={messages} onSendMessage={(text) => handleSendMessage(text)} />

          <ChatInput onSend={(text) => handleSendMessage(text)} onStop={stopGeneration} isGenerating={isGenerating} voice={voice} />
        </div>

        {selectedArtifact && selectedVersions && (
          <ArtifactPanel
            versions={selectedVersions}
            version={selectedArtifact.version}
            onSelectVersion={(version) => setSelectedArtifact({ ...selectedArtifact, version })}
            onClose={() => setSelectedArtifact(null)}
          />
        )}
      </div>
    </ArtifactPanelContext.Provider>
  );
}
