"use client";

import { useState, useRef, useCallback } from "react";
import { MessageGroup, UIEvent } from "@/types";
import { fetchSSE } from "@/lib/api";

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export function useChatStream() {
  const [messages, setMessages] = useState<MessageGroup[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => setMessages([]), []);
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (
      text: string,
      sessionId: string,
      onDone?: () => void,
      onContentChunk?: (chunk: string) => void
    ) => {
      stopGeneration();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsGenerating(true);

      const newMessageId = generateId();
      const userMessage: MessageGroup = {
        id: generateId(),
        role: "user",
        content: text,
        uiEvents: [],
      };
      const assistantMessage: MessageGroup = {
        id: newMessageId,
        role: "assistant",
        content: "",
        uiEvents: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      const activeSubAgents = new Set<string>();
      let finished = false;

      const failStream = (text: string) => {
        setIsGenerating(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id !== newMessageId
              ? msg
              : { ...msg, isStreaming: false, uiEvents: [...msg.uiEvents, { type: "error", text }] }
          )
        );
      };

      try {
        await fetchSSE(
          "/api/chat",
          { message: text, session_id: sessionId },
          (event: UIEvent) => {
            if (event.type === "sub_agent_start" && event.run_id) {
              activeSubAgents.add(event.run_id);
            } else if (event.type === "sub_agent_end" && event.run_id) {
              activeSubAgents.delete(event.run_id);
            }

            // Alt ajan metinleri ana cevaba (ve TTS'e) eklenmez, sadece kartında gösterilir
            const isSubAgentStream = !!event.parent_ids?.some((id) => activeSubAgents.has(id));
            const mainText = event.type === "content" && !isSubAgentStream ? event.text || "" : "";
            if (mainText) onContentChunk?.(mainText);

            if (event.type === "done" || event.type === "error") {
              finished = true;
              setIsGenerating(false);
              if (event.type === "done") onDone?.();
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id !== newMessageId
                  ? msg
                  : {
                      ...msg,
                      content: msg.content + mainText,
                      uiEvents: [...msg.uiEvents, event],
                      isStreaming: event.type === "done" || event.type === "error" ? false : msg.isStreaming,
                    }
              )
            );
          },
          abortController.signal
        );
        // Bağlantı "done" gelmeden kapandıysa arayüz kilitli kalmasın
        if (!finished) failStream("Bağlantı yanıt tamamlanmadan kesildi.");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Chat error:", err);
          failStream(err.message);
        } else {
          setMessages((prev) =>
            prev.map((msg) => (msg.id !== newMessageId ? msg : { ...msg, isStreaming: false }))
          );
        }
      }
    },
    [stopGeneration]
  );

  return {
    messages,
    setMessages,
    clearMessages,
    isGenerating,
    sendMessage,
    stopGeneration,
  };
}
