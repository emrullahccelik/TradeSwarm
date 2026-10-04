"use client";

import { useEffect, useRef } from "react";
import { MessageGroup } from "@/types";
import { MessageBubble } from "./message-bubble";
import { EmptyState } from "./empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessagesProps {
  messages: MessageGroup[];
  onSendMessage: (text: string) => void;
}

export function ChatMessages({ messages, onSendMessage }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return <EmptyState onSendMessage={onSendMessage} />;
  }

  return (
    <ScrollArea className="flex-1 w-full px-4 md:px-8" ref={scrollRef}>
      <div className="max-w-4xl mx-auto flex flex-col pb-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </ScrollArea>
  );
}
