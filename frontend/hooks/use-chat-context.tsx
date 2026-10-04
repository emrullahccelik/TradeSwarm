"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Session } from "@/types";
import { apiGet } from "@/lib/api";

interface ChatContextType {
  activeSessionId: string | null;
  activeSessionTitle: string | null;
  sessions: Session[];
  refreshSessions: () => Promise<void>;
  setActiveSession: (id: string | null, title?: string | null) => void;
  createAndSetSession: (id: string, title: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);
  const [activeSessionTitle, setActiveSessionTitleState] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await apiGet<Session[]>("/api/sessions"));
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const setActiveSession = useCallback((id: string | null, title?: string | null) => {
    setActiveSessionIdState(id);
    if (title !== undefined) {
      setActiveSessionTitleState(title);
    } else if (id) {
      const session = sessions.find(s => s.id === id);
      setActiveSessionTitleState(session?.title || null);
    } else {
      setActiveSessionTitleState(null);
    }
  }, [sessions]);

  const createAndSetSession = useCallback((id: string, title: string) => {
    setActiveSessionIdState(id);
    setActiveSessionTitleState(title);
    refreshSessions();
  }, [refreshSessions]);

  return (
    <ChatContext.Provider
      value={{
        activeSessionId,
        activeSessionTitle,
        sessions,
        refreshSessions,
        setActiveSession,
        createAndSetSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
