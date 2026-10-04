"use client";

import { ChatPanel } from "@/components/chat/chat-panel";
import { useChatContext } from "@/hooks/use-chat-context";

export default function ChatPage() {
  const { activeSessionId, activeSessionTitle, createAndSetSession, refreshSessions } = useChatContext();

  const handleSessionUpdate = (id: string, title: string) => {
    if (!activeSessionId) {
      createAndSetSession(id, title);
    }
  };

  return (
    <div className="h-full w-full">
      <ChatPanel
        sessionId={activeSessionId || undefined}
        sessionTitle={activeSessionTitle || undefined}
        onSessionUpdate={handleSessionUpdate}
        onResponseDone={refreshSessions}
      />
    </div>
  );
}
