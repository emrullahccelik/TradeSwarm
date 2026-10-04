"use client";
import { useEffect, useCallback } from "react";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useAuth } from "@/hooks/use-auth";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { apiGet, apiPost } from "@/lib/api";
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
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      <ChatHeader sessionTitle={sessionTitle} />

      <ChatMessages messages={messages} onSendMessage={(text) => handleSendMessage(text)} />

      <ChatInput onSend={(text) => handleSendMessage(text)} onStop={stopGeneration} isGenerating={isGenerating} voice={voice} />
    </div>
  );
}
