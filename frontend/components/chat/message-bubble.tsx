"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { MessageGroup, UIEvent } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageContent } from "./message-content";
import { ThinkingBlock } from "./thinking-block";
import { ToolBadge } from "./tool-badge";
import { SubAgentCard } from "./sub-agent-card";
import { MessageActions } from "./message-actions";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageGroup;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { uiEvents = [], isStreaming } = message;

  const elements: React.ReactNode[] = [];
  
  if (isUser) {
    elements.push(<MessageContent key="content" content={message.content} />);
  } else {
    let currentReasoning = "";
    let reasoningCount = 0;
    
    const toolStates: Record<string, { name: string; status: "running" | "completed" }> = {};
    const subAgentStates: Record<string, { name: string; status: "running" | "completed"; content: string; innerTools: UIEvent[] }> = {};
    
    uiEvents.forEach((event, index) => {
      if (event.type === "reasoning" && event.text) {
        currentReasoning += event.text;
        const nextEvent = uiEvents[index + 1];
        if (!nextEvent || nextEvent.type !== "reasoning") {
          elements.push(
            <ThinkingBlock 
              key={`reasoning-${reasoningCount++}`} 
              content={currentReasoning} 
              isStreaming={isStreaming && index === uiEvents.length - 1} 
            />
          );
          currentReasoning = "";
        }
      } else if (event.type === "tool_start" && event.tool && event.run_id && !event.parent_ids?.length) {
        toolStates[event.run_id] = { name: event.tool, status: "running" };
      } else if (event.type === "tool_end" && event.run_id && toolStates[event.run_id]) {
        toolStates[event.run_id].status = "completed";
      } else if (event.type === "sub_agent_start" && event.tool && event.run_id) {
        subAgentStates[event.run_id] = { name: event.tool, status: "running", content: "", innerTools: [] };
      } else if (event.type === "sub_agent_end" && event.run_id && subAgentStates[event.run_id]) {
        subAgentStates[event.run_id].status = "completed";
      } else if (event.parent_ids?.length && subAgentStates[event.parent_ids[0]]) {
        const agentId = event.parent_ids[0];
        if (event.type === "content" && event.text) {
          subAgentStates[agentId].content += event.text;
        } else {
          subAgentStates[agentId].innerTools.push(event);
        }
      }
    });

    Object.entries(toolStates).forEach(([runId, state]) => {
      elements.push(<ToolBadge key={`tool-${runId}`} toolName={state.name} status={state.status} runId={runId} />);
    });

    Object.entries(subAgentStates).forEach(([runId, state]) => {
      elements.push(
        <SubAgentCard 
          key={`agent-${runId}`} 
          agentName={state.name} 
          status={state.status} 
          content={state.content}
          innerTools={state.innerTools}
          runId={runId}
        />
      );
    });

    if (message.content) {
      elements.push(<MessageContent key="main-content" content={message.content} />);
    }

    if (isStreaming && !message.content && elements.length === 0) {
      elements.push(
        <div key="typing" className="flex space-x-1 items-center h-6">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        </div>
      );
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full group py-4", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("flex max-w-[85%] gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className={cn(isUser ? "bg-primary text-primary-foreground" : "bg-agent text-white")}>
            {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>

        <div className={cn("flex flex-col space-y-2", isUser ? "items-end" : "items-start")}>
          <div
            className={cn(
              "px-4 py-3 rounded-2xl",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border border-border rounded-tl-sm w-full"
            )}
          >
            {elements}
          </div>
          {!isUser && message.content && (
            <MessageActions content={message.content} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
