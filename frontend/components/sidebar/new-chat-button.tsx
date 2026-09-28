"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewChatButtonProps {
  onClick: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full justify-start space-x-2 border-dashed border-2 hover:border-primary hover:text-primary transition-colors"
    >
      <Plus className="h-4 w-4" />
      <span>Yeni Sohbet</span>
    </Button>
  );
}
