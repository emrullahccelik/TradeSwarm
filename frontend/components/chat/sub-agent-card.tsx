"use client";

import { Bot, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { MessageContent } from "./message-content";
import { ToolBadge } from "./tool-badge";
import { ThinkingBlock } from "./thinking-block";
import type { ToolItem } from "./message-bubble";
import { cn } from "@/lib/utils";

interface SubAgentCardProps {
  agentName: string;
  status: "running" | "completed";
  reasoning?: string;
  content?: string;
  tools?: ToolItem[];
  runId?: string;
}

const AGENT_NAMES: Record<string, string> = {
  ask_trader: "Trader Ajanı",
  ask_researcher: "Araştırmacı Ajan",
  ask_market_analyzer: "Piyasa Analisti",
};

export function SubAgentCard({ agentName, status, reasoning, content, tools = [] }: SubAgentCardProps) {
  const displayName = AGENT_NAMES[agentName] || agentName;
  const isRunning = status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "my-3 overflow-hidden rounded-xl border",
        isRunning ? "border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/10" : "border-border bg-card"
      )}
    >
      <div className="flex items-center px-4 py-2 border-b border-border/50 bg-muted/20">
        {isRunning ? (
          <Loader2 className="h-4 w-4 text-indigo-500 animate-spin mr-2" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
        )}
        <Bot className="h-4 w-4 text-muted-foreground mr-2" />
        <span className="font-semibold text-sm">{displayName}</span>
      </div>
      
      <div className="p-4 flex flex-col gap-2">
        {reasoning && <ThinkingBlock content={reasoning} isStreaming={isRunning && !content} />}

        {tools.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <ToolBadge key={tool.runId} toolName={tool.name} status={tool.status} runId={tool.runId} />
            ))}
          </div>
        )}

        {content ? (
          <div className="text-sm">
            <MessageContent content={content} />
          </div>
        ) : (
          isRunning && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              Analiz ediliyor...
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
