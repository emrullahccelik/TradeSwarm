"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";

/**
 * Cümle cümle gelen TTS seslerini sırasına göre boşluksuz çalar.
 * Sesler farklı sürelerde hazırlandığı için index ile sıralanır; başarısız olan index atlanır (null).
 */
export function useGaplessAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sampleBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const pendingRef = useRef<Map<number, AudioBuffer | null>>(new Map());
  const nextIndexRef = useRef(0);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const onIdleRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    audioContextRef.current?.close().catch(() => {});
  }, []);

  /** Kullanıcı etkileşimi içinde çağrılmalı (tarayıcı otomatik ses çalmayı engeller) */
  const initContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.connect(ctx.destination);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sampleBufferRef.current = new Float32Array(analyser.fftSize);
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  const isIdle = useCallback(
    () => activeSourcesRef.current.length === 0 && pendingRef.current.size === 0,
    []
  );

  const playAvailable = useCallback(() => {
    const ctx = audioContextRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    while (pendingRef.current.has(nextIndexRef.current)) {
      const buffer = pendingRef.current.get(nextIndexRef.current)!;
      pendingRef.current.delete(nextIndexRef.current);
      nextIndexRef.current += 1;
      if (!buffer) continue;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      activeSourcesRef.current.push(source);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (isIdle()) onIdleRef.current?.();
      };
    }
    if (isIdle()) onIdleRef.current?.();
  }, [isIdle]);

  const enqueueBase64Audio = useCallback(
    async (base64Audio: string, index: number) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      try {
        const binary = window.atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        pendingRef.current.set(index, await ctx.decodeAudioData(bytes.buffer));
      } catch (err) {
        console.error(`Failed to decode audio at index ${index}`, err);
        pendingRef.current.set(index, null);
      }
      playAvailable();
    },
    [playAvailable]
  );

  /** TTS isteği başarısız olan cümleyi atlar ki sıradakiler beklemede kalmasın */
  const skipIndex = useCallback(
    (index: number) => {
      pendingRef.current.set(index, null);
      playAvailable();
    },
    [playAvailable]
  );

  /** Çalanı durdurur ve sırayı yeni bir cevap için sıfırlar */
  const stopAll = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      source.onended = null;
      try {
        source.stop();
      } catch {}
    });
    activeSourcesRef.current = [];
    pendingRef.current.clear();
    nextIndexRef.current = 0;
    nextStartTimeRef.current = 0;
  }, []);

  /** Çalınan sesin RMS seviyesi */
  const getLevel = useCallback(() => {
    const analyser = analyserRef.current;
    const buffer = sampleBufferRef.current;
    if (!analyser || !buffer || activeSourcesRef.current.length === 0) return 0;
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    return Math.sqrt(sum / buffer.length);
  }, []);

  const onIdle = useCallback((cb: (() => void) | null) => {
    onIdleRef.current = cb;
  }, []);

  return useMemo(
    () => ({ initContext, enqueueBase64Audio, skipIndex, stopAll, isIdle, getLevel, onIdle }),
    [initContext, enqueueBase64Audio, skipIndex, stopAll, isIdle, getLevel, onIdle]
  );
}
