"use client";

import { Bot } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onSendMessage: (text: string) => void;
}

const SUGGESTIONS = [
  "Bitcoin analiz et",
  "Portföyümü göster",
  "Piyasa haberleri",
  "ETH al"
];

export function EmptyState({ onSendMessage }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center max-w-md space-y-6"
      >
        <div className="rounded-full bg-agent/10 p-4">
          <Bot className="h-12 w-12 text-agent" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">TradeSwarm AI</h2>
          <p className="text-muted-foreground">
            Kripto piyasa analizi, alım-satım ve araştırma için hazırım.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              className="rounded-full"
              onClick={() => onSendMessage(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
