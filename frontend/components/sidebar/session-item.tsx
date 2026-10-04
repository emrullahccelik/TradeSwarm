"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { Session } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function SessionItem({ session, isActive, onClick, onDelete }: SessionItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bu sohbeti silmek istediğinize emin misiniz?")) {
      onDelete(session.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between w-full p-3 mb-1 rounded-lg cursor-pointer transition-colors relative overflow-hidden",
        isActive 
          ? "bg-muted font-medium text-foreground" 
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      )}
      
      <div className="flex flex-1 min-w-0 items-center space-x-3 overflow-hidden">
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="truncate text-sm">
          {session.title || "İsimsiz Sohbet"}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        title="Sil"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
