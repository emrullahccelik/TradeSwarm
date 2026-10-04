"use client";

import { Moon, Sun, Settings, Mic } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  sessionTitle?: string;
  onVoiceToggle: () => void;
  isVoiceEnabled?: boolean;
}

export function ChatHeader({ sessionTitle, onVoiceToggle, isVoiceEnabled }: ChatHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center space-x-2 truncate">
        <div className="font-semibold text-lg truncate">
          {sessionTitle || "Yeni Sohbet"}
        </div>
      </div>
      
      <div className="flex items-center space-x-1 shrink-0">
        <Button
          variant={isVoiceEnabled ? "default" : "ghost"}
          size="icon"
          onClick={onVoiceToggle}
          className="rounded-full"
          title="Sesli Mod"
        >
          <Mic className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full"
          title="Temayı Değiştir"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Tema değiştir</span>
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-full">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
