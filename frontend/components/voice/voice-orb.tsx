"use client";

import { useEffect, useRef } from "react";
import type { VoiceChatState } from "@/types";
import { cn } from "@/lib/utils";

interface VoiceOrbProps {
  state: VoiceChatState;
  getLevel: () => number;
  onClick?: () => void;
}

const STATUS_TEXT: Record<VoiceChatState, string> = {
  idle: "",
  listening: "Dinliyorum",
  muted: "Mikrofon kapalı",
  transcribing: "Anlıyorum…",
  thinking: "Düşünüyor…",
  speaking: "Durdurmak için dokun",
};

export function VoiceOrb({ state, getLevel, onClick }: VoiceOrbProps) {
  const orbRef = useRef<HTMLButtonElement>(null);

  // Ses seviyesine göre küreyi büyüt; React render'ı yerine doğrudan stil güncellenir
  useEffect(() => {
    let frame: number;
    let smoothed = 0;
    const tick = () => {
      const level = getLevel();
      smoothed += (level - smoothed) * 0.25;
      if (orbRef.current) orbRef.current.style.transform = `scale(${1 + smoothed * 0.35})`;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [getLevel]);

  const isWaiting = state === "thinking" || state === "transcribing";

  return (
    <div className="flex flex-col items-center gap-3 pb-4">
      <button
        ref={orbRef}
        type="button"
        onClick={onClick}
        aria-label={STATUS_TEXT[state]}
        className={cn(
          "voice-orb relative h-20 w-20 rounded-full overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.35)] transition-[filter,opacity] duration-300",
          state === "speaking" && "cursor-pointer",
          state !== "speaking" && "cursor-default",
          state === "muted" && "grayscale opacity-60",
          isWaiting && "animate-orb-breathe"
        )}
      >
        <span className="voice-orb-clouds absolute inset-0" />
      </button>
      <span className="text-xs text-muted-foreground h-4">{STATUS_TEXT[state]}</span>
    </div>
  );
}
