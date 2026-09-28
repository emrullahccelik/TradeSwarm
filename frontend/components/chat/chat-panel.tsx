"use client";
import { useState } from "react";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChatStream } from "@/hooks/use-chat-stream";
import { VoiceChatOverlay } from "@/components/voice/voice-chat-overlay";
import { useAuth } from "@/hooks/use-auth";
import { useVoiceChat } from "@/hooks/use-voice-chat";

interface ChatPanelProps {
  sessionId?: string;
  sessionTitle?: string;
  onSessionUpdate?: (id: string, title: string) => void;
}

export function ChatPanel({ sessionId, sessionTitle, onSessionUpdate }: ChatPanelProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const { messages, isGenerating, sendMessage, stopGeneration } = useChatStream();
  const { token } = useAuth();

  const {
    state: voiceState,
    audioLevel,
    autoListenEnabled,
    toggleAutoListen,
    startVoiceChat,
    stopVoiceChat,
    stopRecording
  } = useVoiceChat(sessionId || "", sendMessage as any, token);

  const handleSendMessage = async (text: string) => {
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.slice(0, 30) }),
        });
        if (res.ok) {
          const session = await res.json();
          currentSessionId = session.id;
          onSessionUpdate?.(session.id, session.title);
        }
      } catch (error) {
        console.error("Failed to create session", error);
        return;
      }
    }

    if (currentSessionId) {
      sendMessage(text, currentSessionId);
    }
  };

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      setIsVoiceMode(false);
      stopVoiceChat();
    } else {
      setIsVoiceMode(true);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      <ChatHeader 
        sessionTitle={sessionTitle} 
        onVoiceToggle={toggleVoiceMode} 
        isVoiceEnabled={isVoiceMode} 
      />
      
      <ChatMessages 
        messages={messages} 
        onSendMessage={handleSendMessage} 
      />
      
      <ChatInput 
        onSend={handleSendMessage} 
        onStop={stopGeneration} 
        onMicClick={toggleVoiceMode} 
        isGenerating={isGenerating} 
      />
      
      {isVoiceMode && (
        <VoiceChatOverlay 
          state={voiceState}
          audioLevel={audioLevel}
          autoListenEnabled={autoListenEnabled}
          onToggleAutoListen={toggleAutoListen}
          onStartRecording={startVoiceChat}
          onStopRecording={stopRecording}
          onClose={toggleVoiceMode}
        />
      )}
    </div>
  );
}
