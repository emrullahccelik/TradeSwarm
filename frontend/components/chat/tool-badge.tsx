"use client";

import { Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolBadgeProps {
  toolName: string;
  status: "running" | "completed";
  runId?: string;
}

export function ToolBadge({ toolName, status }: ToolBadgeProps) {
  const isRunning = status === "running";

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-1 space-x-1.5 text-xs font-medium rounded-full border mb-2",
        isRunning
          ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
          : "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400"
      )}
    >
      {isRunning ? (
        <Settings className="h-3 w-3 animate-spin" />
      ) : (
        <Check className="h-3 w-3" />
      )}
      <span>
        {isRunning ? `Araç çalışıyor: ${toolName}...` : `Tamamlandı: ${toolName}`}
      </span>
    </div>
  );
}
