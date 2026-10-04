"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { VoiceChatState } from "@/types";
import { useAudioRecorder } from "./use-audio-recorder";
import { useGaplessAudio } from "./use-gapless-audio";
import { blobToBase64, getSupportedAudioMimeType, getAudioFormat } from "@/lib/audio-utils";
import { StreamingSentenceSplitter } from "@/lib/sentence-splitter";
import { apiPost } from "@/lib/api";

interface TTSResponse { audio: string; }
interface STTResponse { text: string; }

export function useVoiceChat(
  sessionId: string,
  sendMessage: (text: string, sessionId: string, onDone?: () => void, onContentChunk?: (chunk: string) => void) => void,
  token: string | null
) {
  const [state, setState] = useState<VoiceChatState>("idle");
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  
  const { isRecording, audioLevel, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const { isPlaying, initContext, enqueueBase64Audio, stopAll, onAllFinished } = useGaplessAudio();
  
  const splitterRef = useRef<StreamingSentenceSplitter | null>(null);
  
  const toggleAutoListen = useCallback(() => {
    setAutoListenEnabled((prev) => !prev);
  }, []);

  const handleAudioFinished = useCallback(() => {
    if (autoListenEnabled) {
      setState("auto-listening");
      setTimeout(() => {
        if (state !== "idle") startVoiceChat();
      }, 500);
    } else {
      setState("idle");
    }
  }, [autoListenEnabled, state]);

  useEffect(() => {
    onAllFinished(handleAudioFinished);
  }, [onAllFinished, handleAudioFinished]);

  const startVoiceChat = useCallback(async () => {
    if (state === "speaking") {
      stopAll();
    }
    initContext();
    setState("recording");
    await startRecording();
  }, [state, stopAll, initContext, startRecording]);

  const stopVoiceChat = useCallback(async () => {
    if (state === "recording" || state === "auto-listening") {
      const blob = await stopRecording();
      if (blob && blob.size > 0 && state === "recording") {
        setState("transcribing");
        try {
          const base64 = await blobToBase64(blob);
          const format = getAudioFormat(getSupportedAudioMimeType());
          
          const sttResp = await apiPost<STTResponse>("/api/stt", { audio_base64: base64, format });
          
          if (sttResp.text && sttResp.text.trim()) {
            setState("thinking");
            
            splitterRef.current = new StreamingSentenceSplitter(async (sentence, index) => {
              try {
                const ttsResp = await apiPost<TTSResponse>("/api/tts", { text: sentence });
                enqueueBase64Audio(ttsResp.audio, index);
              } catch (e) {
                console.error("TTS Error", e);
              }
            });
            
            sendMessage(
              sttResp.text,
              sessionId,
              () => {
                splitterRef.current?.flush();
                if (!isPlaying) setState("speaking");
              },
              (chunk) => {
                setState((prev) => prev !== "speaking" ? "speaking" : prev);
                splitterRef.current?.feed(chunk);
              }
            );
          } else {
            setState("idle");
          }
        } catch (e) {
          console.error("STT Error", e);
          setState("idle");
        }
      } else {
        setState("idle");
      }
    } else {
      cancelRecording();
      stopAll();
      setState("idle");
    }
  }, [state, stopRecording, cancelRecording, stopAll, sessionId, sendMessage, isPlaying, enqueueBase64Audio]);

  const forceStopAll = useCallback(() => {
    cancelRecording();
    stopAll();
    setState("idle");
  }, [cancelRecording, stopAll]);

  return {
    state,
    audioLevel,
    autoListenEnabled,
    toggleAutoListen,
    startVoiceChat,
    stopVoiceChat: forceStopAll,
    stopRecording: stopVoiceChat,
    isActive: state !== "idle",
  };
}
