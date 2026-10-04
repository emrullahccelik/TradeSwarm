"use client";

import { Session } from "@/types";
import { NewChatButton } from "./new-chat-button";
import { SessionItem } from "./session-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";

interface SidebarProps {
  sessions: Session[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export function Sidebar({ sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession }: SidebarProps) {
  return (
    <div className="flex flex-col h-full w-[260px] border-r border-border bg-card">
      <div className="p-4 flex items-center space-x-2 border-b border-border">
        <div className="bg-agent rounded-md p-1.5">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">TradeSwarm</span>
      </div>
      
      <div className="p-3">
        <NewChatButton onClick={onNewChat} />
      </div>
      
      <div className="px-4 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Son Sohbetler
        </h3>
      </div>
      
      {/* Radix viewport içeriği display:table ile sarar; uzun başlıklar satırı genişletip sil butonunu taşırmasın */}
      <ScrollArea className="flex-1 px-3 [&_[data-radix-scroll-area-viewport]>div]:!block">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onClick={() => onSelectSession(session.id)}
            onDelete={onDeleteSession}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
