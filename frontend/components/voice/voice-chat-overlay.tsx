"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Bot } from "lucide-react";
import { VoiceStatus } from "./voice-status";
import { AudioVisualizer } from "./audio-visualizer";
import { MicButton } from "./mic-button";
import type { VoiceChatState } from "@/types";
import { cn } from "@/lib/utils";

interface VoiceChatOverlayProps {
  state: VoiceChatState;
  audioLevel: number;
  autoListenEnabled: boolean;
  onToggleAutoListen: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClose: () => void;
}

export function VoiceChatOverlay({
  state,
  audioLevel,
  autoListenEnabled,
  onToggleAutoListen,
  onStartRecording,
  onStopRecording,
  onClose
}: VoiceChatOverlayProps) {
  const handleMicPress = () => {
    if (state === "idle" || state === "speaking") {
      onStartRecording();
    } else if (state === "recording") {
      onStopRecording();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-sm p-6 overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Bot className="w-8 h-8" />
          </div>

          <div className="w-full space-y-2">
            <VoiceStatus state={state} />
            <div className="h-20 flex items-center justify-center">
              <AudioVisualizer 
                audioLevel={audioLevel} 
                isActive={state === "recording" || state === "speaking"} 
              />
            </div>
          </div>

          <div className="flex justify-center w-full my-4">
            <MicButton
              state={state}
              audioLevel={audioLevel}
              onPress={handleMicPress}
            />
          </div>

          <button
            onClick={onToggleAutoListen}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              autoListenEnabled
                ? "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {autoListenEnabled ? "Otomatik Dinleme: Açık" : "Otomatik Dinleme: Kapalı"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
