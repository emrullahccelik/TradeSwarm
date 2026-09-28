"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatProvider, useChatContext } from "@/hooks/use-chat-context";

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { 
    sessions, 
    activeSessionId, 
    setActiveSession, 
    refreshSessions 
  } = useChatContext();

  useEffect(() => {
    // Basic auth check
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });
      await refreshSessions();
      if (activeSessionId === id) {
        setActiveSession(null);
      }
    } catch (error) {
      console.error("Failed to delete session", error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId || undefined}
        onSelectSession={(id) => setActiveSession(id)}
        onNewChat={() => setActiveSession(null)}
        onDeleteSession={handleDeleteSession}
      />
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </ChatProvider>
  );
}
