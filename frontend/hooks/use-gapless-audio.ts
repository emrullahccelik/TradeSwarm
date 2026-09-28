"use client";

import { useState, useRef, useCallback } from "react";

export function useGaplessAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const pendingBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const nextExpectedIndexRef = useRef(0);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const onAllFinishedRef = useRef<(() => void) | null>(null);
  
  const initContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  const playNextIfAvailable = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const nextIndex = nextExpectedIndexRef.current;
    const buffer = pendingBuffersRef.current.get(nextIndex);
    
    if (buffer) {
      pendingBuffersRef.current.delete(nextIndex);
      nextExpectedIndexRef.current = nextIndex + 1;
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      activeSourcesRef.current.push(source);
      
      const currentTime = ctx.currentTime;
      let startTime = nextStartTimeRef.current;
      if (startTime < currentTime) startTime = currentTime;
      
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      setIsPlaying(true);
      
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0 && pendingBuffersRef.current.size === 0) {
          setIsPlaying(false);
          onAllFinishedRef.current?.();
        }
      };
      
      playNextIfAvailable();
    }
  }, []);

  const enqueueBase64Audio = useCallback(async (base64Wav: string, index: number) => {
    try {
      if (!audioContextRef.current) return;
      
      const binaryStr = window.atob(base64Wav);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      pendingBuffersRef.current.set(index, audioBuffer);
      playNextIfAvailable();
    } catch (err) {
      console.error(`Failed to decode audio at index ${index}`, err);
      if (nextExpectedIndexRef.current === index) {
        nextExpectedIndexRef.current += 1;
        playNextIfAvailable();
      }
    }
  }, [playNextIfAvailable]);

  const stopAll = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    pendingBuffersRef.current.clear();
    nextExpectedIndexRef.current = 0;
    nextStartTimeRef.current = 0;
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    initContext,
    enqueueBase64Audio,
    stopAll,
    onAllFinished: (cb: () => void) => { onAllFinishedRef.current = cb; }
  };
}
