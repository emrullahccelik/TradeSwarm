"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { VoiceChatState } from "@/types";

interface VoiceStatusProps {
  state: VoiceChatState;
}

export function VoiceStatus({ state }: VoiceStatusProps) {
  const getStatusContent = () => {
    switch (state) {
      case "recording":
        return (
          <div className="flex items-center text-red-500 gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            🎙️ Dinliyorum...
          </div>
        );
      case "transcribing":
        return (
          <div className="flex items-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            ✍️ Yazıya çevriliyor...
          </div>
        );
      case "thinking":
        return (
          <div className="flex items-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            🧠 Düşünüyor...
          </div>
        );
      case "speaking":
        return (
          <div className="flex items-center text-indigo-500 gap-2 font-medium">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🔊
            </motion.div>
            Konuşuyor...
          </div>
        );
      case "auto-listening":
        return (
          <div className="flex items-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            ⏳ Hazırlanıyor...
          </div>
        );
      case "idle":
      default:
        return null;
    }
  };

  return (
    <div className="h-8 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="text-sm"
        >
          {getStatusContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
