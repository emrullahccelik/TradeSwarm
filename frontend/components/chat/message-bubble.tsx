"use client";

import { motion } from "framer-motion";
import { AlertCircle, Bot, User } from "lucide-react";
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

export interface ToolItem {
  runId: string;
  name: string;
  status: "running" | "completed";
}

interface SubAgentItem {
  kind: "agent";
  runId: string;
  name: string;
  status: "running" | "completed";
  reasoning: string;
  content: string;
  result: string;
  tools: ToolItem[];
}

type TimelineItem =
  | { kind: "reasoning"; text: string }
  | { kind: "content"; text: string }
  | { kind: "error"; text: string }
  | ({ kind: "tool" } & ToolItem)
  | SubAgentItem;

// SSE event'lerini geliş sırasına göre gösterilecek bloklara dönüştürür
function buildTimeline(uiEvents: UIEvent[], finalContent: string): TimelineItem[] {
  const timeline: TimelineItem[] = [];
  const agents: Record<string, SubAgentItem> = {};
  const tools: Record<string, ToolItem> = {};
  let hasMainContentEvents = false;

  const appendText = (kind: "reasoning" | "content", text: string) => {
    const last = timeline[timeline.length - 1];
    if (last && last.kind === kind) {
      last.text += text;
    } else {
      timeline.push({ kind, text });
    }
  };

  for (const event of uiEvents) {
    const agent = event.parent_ids?.map((id) => agents[id]).find(Boolean);

    switch (event.type) {
      case "sub_agent_start":
        if (event.run_id) {
          const item: SubAgentItem = {
            kind: "agent",
            runId: event.run_id,
            name: event.tool || "",
            status: "running",
            reasoning: "",
            content: "",
            result: "",
            tools: [],
          };
          agents[event.run_id] = item;
          timeline.push(item);
        }
        break;
      case "sub_agent_end":
        if (event.run_id && agents[event.run_id]) {
          agents[event.run_id].status = "completed";
          agents[event.run_id].result = event.text || "";
        }
        break;
      case "tool_start":
        if (event.run_id && event.tool) {
          const tool = { kind: "tool" as const, runId: event.run_id, name: event.tool, status: "running" as const };
          tools[event.run_id] = tool;
          if (agent) agent.tools.push(tool);
          else timeline.push(tool);
        }
        break;
      case "tool_end":
        if (event.run_id && tools[event.run_id]) {
          tools[event.run_id].status = "completed";
        }
        break;
      case "reasoning":
        if (!event.text) break;
        if (agent) agent.reasoning += event.text;
        else appendText("reasoning", event.text);
        break;
      case "content":
        if (!event.text) break;
        if (agent) {
          agent.content += event.text;
        } else {
          hasMainContentEvents = true;
          appendText("content", event.text);
        }
        break;
      case "error":
        timeline.push({ kind: "error", text: event.text || "Bilinmeyen hata" });
        break;
    }
  }

  // Geçmiş mesajlarda ana metin ui_state'te değil, content alanında saklanır
  if (!hasMainContentEvents && finalContent) {
    timeline.push({ kind: "content", text: finalContent });
  }

  return timeline;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { uiEvents = [], isStreaming } = message;

  const elements: React.ReactNode[] = [];

  if (isUser) {
    elements.push(<MessageContent key="content" content={message.content} isUser={true} />);
  } else {
    const timeline = buildTimeline(uiEvents, message.content);

    timeline.forEach((item, index) => {
      const isLast = index === timeline.length - 1;
      switch (item.kind) {
        case "reasoning":
          elements.push(
            <ThinkingBlock key={`reasoning-${index}`} content={item.text} isStreaming={isStreaming && isLast} />
          );
          break;
        case "content":
          elements.push(<MessageContent key={`content-${index}`} content={item.text} />);
          break;
        case "tool":
          elements.push(
            <div key={`tool-${item.runId}`}>
              <ToolBadge toolName={item.name} status={item.status} runId={item.runId} />
            </div>
          );
          break;
        case "agent":
          elements.push(
            <SubAgentCard
              key={`agent-${item.runId}`}
              agentName={item.name}
              status={item.status}
              reasoning={item.reasoning}
              content={item.result || item.content}
              tools={item.tools}
              runId={item.runId}
            />
          );
          break;
        case "error":
          elements.push(
            <div
              key={`error-${index}`}
              className="flex items-start gap-2 my-2 px-3 py-2 text-sm rounded-lg border border-destructive/30 bg-destructive/10 text-destructive"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="break-words">{item.text}</span>
            </div>
          );
          break;
      }
    });

    if (isStreaming && elements.length === 0) {
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
