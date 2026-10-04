"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full border border-border rounded-lg bg-muted/30 overflow-hidden my-2"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
          <Brain className={cn("h-4 w-4", isStreaming && "animate-pulse text-agent")} />
          <span>{isStreaming ? "Düşünüyor..." : "Düşünce Süreci"}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <CollapsibleContent forceMount asChild>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3 text-sm font-mono text-muted-foreground border-t border-border whitespace-pre-wrap break-words">
                {content}
                {isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-muted-foreground animate-pulse align-middle" />}
              </div>
            </motion.div>
          </CollapsibleContent>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}
