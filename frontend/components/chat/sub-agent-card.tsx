"use client";

import { Bot, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { MessageContent } from "./message-content";
import { ToolBadge } from "./tool-badge";
import { UIEvent } from "@/types";
import { cn } from "@/lib/utils";

interface SubAgentCardProps {
  agentName: string;
  status: "running" | "completed";
  content?: string;
  innerTools?: UIEvent[];
  runId?: string;
}

const AGENT_NAMES: Record<string, string> = {
  ask_trader: "Trader Ajanı",
  ask_researcher: "Araştırmacı Ajan",
  ask_market_analyzer: "Piyasa Analisti",
};

export function SubAgentCard({ agentName, status, content, innerTools = [] }: SubAgentCardProps) {
  const displayName = AGENT_NAMES[agentName] || agentName;
  const isRunning = status === "running";

  const tools = innerTools.reduce((acc, event) => {
    if (event.type === "tool_start" && event.tool && event.run_id) {
      acc[event.run_id] = { name: event.tool, status: "running" };
    } else if (event.type === "tool_end" && event.run_id && acc[event.run_id]) {
      acc[event.run_id].status = "completed";
    }
    return acc;
  }, {} as Record<string, { name: string; status: "running" | "completed" }>);

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
        {Object.entries(tools).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.entries(tools).map(([runId, tool]) => (
              <ToolBadge key={runId} toolName={tool.name} status={tool.status} runId={runId} />
            ))}
          </div>
        )}
        
        {content && (
          <div className="text-sm">
            <MessageContent content={content} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
