"use client";

import { useState, useCallback } from "react";
import { useAudioRecorder } from "./use-audio-recorder";
import { transcribe } from "@/lib/audio-utils";

export type DictationState = "idle" | "recording" | "transcribing";

/** Mesaj kutusunda konuşmayı yazıya döker (gönderme kararı kullanıcıda kalır) */
export function useDictation(onText: (text: string) => void) {
  const [state, setState] = useState<DictationState>("idle");
  const { close, getLevel, startRecording, stopRecording } = useAudioRecorder();

  const start = useCallback(async () => {
    try {
      setState("recording");
      await startRecording();
    } catch (err) {
      console.error("Mikrofon açılamadı", err);
      close();
      setState("idle");
    }
  }, [startRecording, close]);

  const cancel = useCallback(() => {
    close();
    setState("idle");
  }, [close]);

  const confirm = useCallback(async () => {
    const blob = await stopRecording();
    close();
    if (!blob || blob.size === 0) {
      setState("idle");
      return;
    }
    setState("transcribing");
    try {
      const text = await transcribe(blob);
      if (text) onText(text);
    } catch (err) {
      console.error("STT Error", err);
    } finally {
      setState("idle");
    }
  }, [stopRecording, close, onText]);

  return { state, getLevel, start, cancel, confirm };
}
