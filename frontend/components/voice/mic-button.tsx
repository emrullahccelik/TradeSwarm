"use client";

import { motion } from "framer-motion";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceChatState } from "@/types";

interface MicButtonProps {
  state: VoiceChatState;
  audioLevel: number;
  onPress: () => void;
  onRelease?: () => void;
}

export function MicButton({ state, audioLevel, onPress, onRelease }: MicButtonProps) {
  const isRecording = state === "recording";
  const isProcessing = state === "transcribing" || state === "thinking" || state === "auto-listening";
  const isSpeaking = state === "speaking";
  const isIdle = state === "idle";

  const getIcon = () => {
    if (isProcessing) return <Loader2 className="w-8 h-8 animate-spin" />;
    if (isSpeaking) return <Volume2 className="w-8 h-8" />;
    return <Mic className="w-8 h-8" />;
  };

  const getBgClass = () => {
    if (isRecording) return "bg-red-500 text-white shadow-lg shadow-red-500/20";
    if (isSpeaking) return "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20";
    if (isProcessing) return "bg-muted text-muted-foreground cursor-not-allowed";
    return "bg-muted text-foreground hover:bg-muted/80";
  };

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      {isRecording && (
        <div 
          className="absolute inset-0 rounded-full bg-red-500 opacity-20 pointer-events-none transition-transform duration-75"
          style={{
            transform: `scale(${1 + audioLevel * 0.5})`
          }}
        />
      )}
      
      {isRecording && (
        <div className="absolute inset-2 rounded-full border-2 border-red-500 opacity-30 animate-ping pointer-events-none" />
      )}

      <motion.button
        whileHover={!isProcessing ? { scale: 1.05 } : {}}
        whileTap={!isProcessing ? { scale: 0.95 } : {}}
        onClick={onPress}
        onMouseUp={onRelease}
        onMouseLeave={onRelease}
        onTouchEnd={onRelease}
        disabled={isProcessing}
        className={cn(
          "relative flex items-center justify-center w-20 h-20 rounded-full transition-colors z-10",
          getBgClass()
        )}
      >
        {getIcon()}
      </motion.button>
    </div>
  );
}
