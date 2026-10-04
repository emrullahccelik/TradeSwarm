"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, AudioLines, Check, Loader2, Mic, MicOff, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DictationWaveform } from "@/components/voice/dictation-waveform";
import { VoiceOrb } from "@/components/voice/voice-orb";
import { useDictation } from "@/hooks/use-dictation";
import type { VoiceChatState } from "@/types";
import { cn } from "@/lib/utils";

export interface VoiceModeControls {
  isActive: boolean;
  isMuted: boolean;
  state: VoiceChatState;
  start: () => void;
  stop: () => void;
  toggleMute: () => void;
  interrupt: () => void;
  getLevel: () => number;
}

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  voice: VoiceModeControls;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isGenerating, voice, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const appendDictation = useCallback((spoken: string) => {
    setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${spoken}` : spoken));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);
  const dictation = useDictation(appendDictation);
  const isDictating = dictation.state !== "idle";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !isGenerating && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const iconButton = "h-9 w-9 rounded-full shrink-0 text-muted-foreground hover:text-foreground";
  const primaryButton = "h-9 w-9 rounded-full shrink-0 bg-foreground text-background hover:bg-foreground/80";

  return (
    <div className="w-full bg-background px-4 pb-3 pt-2">
      {voice.isActive && <VoiceOrb state={voice.state} getLevel={voice.getLevel} onClick={voice.interrupt} />}

      <div className="max-w-3xl mx-auto flex items-end gap-1 rounded-[28px] bg-muted px-2 py-2 border border-border/50 focus-within:border-border transition-colors">
        <div className="flex-1 min-w-0 flex items-center min-h-9">
          {isDictating ? (
            <div className="w-full px-3">
              {dictation.state === "recording" ? (
                <DictationWaveform getLevel={dictation.getLevel} />
              ) : (
                <div className="h-8 flex items-center text-sm text-muted-foreground">Yazıya dökülüyor…</div>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voice.isActive ? "Yazabilir ya da konuşabilirsin" : "Mesajınızı yazın..."}
              className="w-full max-h-[200px] bg-transparent resize-none border-0 outline-none focus:ring-0 px-3 py-1.5 text-sm placeholder:text-muted-foreground"
              rows={1}
              disabled={disabled}
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {isDictating ? (
            <>
              <Button type="button" variant="ghost" size="icon" onClick={dictation.cancel} className={iconButton} title="İptal">
                <X className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={dictation.confirm}
                disabled={dictation.state === "transcribing"}
                className={iconButton}
                title="Yazıya dök"
              >
                {dictation.state === "transcribing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              </Button>
            </>
          ) : voice.isActive ? (
            <>
              {text.trim() && !isGenerating && (
                <Button type="button" size="icon" onClick={handleSend} className={primaryButton} title="Gönder">
                  <ArrowUp className="h-5 w-5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={voice.toggleMute}
                className={cn(iconButton, voice.isMuted && "text-destructive hover:text-destructive")}
                title={voice.isMuted ? "Mikrofonu aç" : "Mikrofonu kapat"}
              >
                {voice.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button type="button" size="icon" onClick={voice.stop} className={primaryButton} title="Sesli modu bitir">
                <X className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={dictation.start}
                disabled={disabled}
                className={iconButton}
                title="Dikte et"
              >
                <Mic className="h-5 w-5" />
              </Button>
              {isGenerating ? (
                <Button type="button" size="icon" onClick={onStop} className={primaryButton} title="Durdur">
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : text.trim() ? (
                <Button type="button" size="icon" onClick={handleSend} disabled={disabled} className={primaryButton} title="Gönder">
                  <ArrowUp className="h-5 w-5" />
                </Button>
              ) : (
                <Button type="button" size="icon" onClick={voice.start} disabled={disabled} className={primaryButton} title="Sesli mod">
                  <AudioLines className="h-5 w-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="max-w-3xl mx-auto mt-2 text-center text-xs text-muted-foreground">
        Yapay zeka hata yapabilir. Önemli bilgileri kontrol edin.
      </div>
    </div>
  );
}
