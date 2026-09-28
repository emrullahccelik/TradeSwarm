"use client";

import { useState, useRef, useCallback } from "react";
import { MessageGroup, UIEvent, ActiveSubAgent } from "@/types";
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

      try {
        await fetchSSE(
          "/api/chat",
          { message: text, session_id: sessionId },
          (event: UIEvent) => {
            setMessages((prev) => {
              const msgs = [...prev];
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg.id !== newMessageId) return msgs;

              if (event.type === "sub_agent_start" && event.run_id) {
                activeSubAgents.add(event.run_id);
              } else if (event.type === "sub_agent_end" && event.run_id) {
                activeSubAgents.delete(event.run_id);
              }

              lastMsg.uiEvents.push(event);

              if (event.type === "content") {
                const isSubAgentStream = activeSubAgents.size > 0 && event.parent_ids && event.parent_ids.some(id => activeSubAgents.has(id));
                
                if (!isSubAgentStream && event.text) {
                  lastMsg.content += event.text;
                  onContentChunk?.(event.text);
                }
              }

              if (event.type === "done" || event.type === "error") {
                lastMsg.isStreaming = false;
                setIsGenerating(false);
                if (event.type === "done") onDone?.();
              }

              return msgs;
            });
          },
          abortController.signal
        );
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Chat error:", err);
          setIsGenerating(false);
          setMessages((prev) => {
            const msgs = [...prev];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.id === newMessageId) {
              lastMsg.isStreaming = false;
              lastMsg.uiEvents.push({ type: "error", text: err.message });
            }
            return msgs;
          });
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
