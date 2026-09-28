"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  onMicClick: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, onMicClick, isGenerating, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !isGenerating && !disabled) {
      onSend(text.trim());
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full bg-background border-t border-border p-4">
      <div className="max-w-4xl mx-auto relative flex items-end space-x-2 bg-muted/50 rounded-xl border border-border p-2 focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mesajınızı yazın..."
          className="flex-1 max-h-[120px] min-h-[40px] bg-transparent resize-none border-0 focus:ring-0 px-2 py-2 text-sm"
          rows={1}
          disabled={disabled}
        />
        
        <div className="flex items-center space-x-1 pb-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMicClick}
            disabled={disabled || isGenerating}
            className="text-muted-foreground hover:text-foreground rounded-full"
            title="Sesli asistan"
          >
            <Mic className="h-5 w-5" />
          </Button>

          {isGenerating ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onStop}
              className="rounded-xl h-10 w-10 shrink-0"
              title="Durdur"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="icon"
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              className="rounded-xl h-10 w-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              title="Gönder"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="max-w-4xl mx-auto mt-2 text-center text-xs text-muted-foreground">
        Yapay zeka hata yapabilir. Önemli bilgileri kontrol edin.
      </div>
    </div>
  );
}
