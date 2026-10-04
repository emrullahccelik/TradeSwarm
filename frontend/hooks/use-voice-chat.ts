"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { VoiceChatState } from "@/types";
import { useAudioRecorder } from "./use-audio-recorder";
import { useGaplessAudio } from "./use-gapless-audio";
import { transcribe } from "@/lib/audio-utils";
import { StreamingSentenceSplitter } from "@/lib/sentence-splitter";
import { apiPost } from "@/lib/api";

// Konuşma algılama (VAD) ayarları
const TICK_MS = 50;
const MIN_SPEECH_MS = 250; // bu kadar konuşma duyulmadan tur başlamış sayılmaz
const END_SILENCE_MS = 1100; // konuşmadan sonra bu kadar sessizlik olunca tur biter
const MAX_TURN_MS = 60_000;
const MIN_SPEECH_LEVEL = 0.015;

/**
 * ChatGPT tarzı eller serbest sesli mod: dinle → yazıya dök → gönder → cevabı seslendir → tekrar dinle.
 * `send`, mesaj gönderip cevap akışı bitince resolve olmalı.
 */
export function useVoiceChat(send: (text: string, onContentChunk: (chunk: string) => void) => Promise<void>) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [state, setStateValue] = useState<VoiceChatState>("idle");

  const recorder = useAudioRecorder();
  const player = useGaplessAudio();

  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const stateRef = useRef<VoiceChatState>("idle");
  const turnRef = useRef(0); // her yeni tur/kesintide artar, eski async işler kendini iptal eder
  const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const responseDoneRef = useRef(true);
  const ttsInFlightRef = useRef(0);

  const setState = (next: VoiceChatState) => {
    stateRef.current = next;
    setStateValue(next);
  };

  const stopVad = () => {
    if (vadTimerRef.current) clearInterval(vadTimerRef.current);
    vadTimerRef.current = null;
  };

  // Zamanlayıcı ve callback'ler her zaman en güncel fonksiyonları çağırsın diye ref üzerinden erişilir
  const fn = useRef({
    listen: async () => {},
    endTurn: async () => {},
    checkResponseFinished: (_turn: number) => {},
  });

  fn.current.listen = async () => {
    if (!activeRef.current) return;
    stopVad();
    if (mutedRef.current) {
      recorder.discardRecording();
      setState("muted");
      return;
    }
    setState("listening");
    try {
      await recorder.startRecording();
    } catch (err) {
      console.error("Mikrofon açılamadı", err);
      stop();
      return;
    }

    let startedAt = Date.now();
    let speechMs = 0;
    let silenceMs = 0;
    let heardSpeech = false;
    let noiseFloor = 0.005;

    vadTimerRef.current = setInterval(() => {
      const level = recorder.getLevel();
      const threshold = Math.max(MIN_SPEECH_LEVEL, noiseFloor * 3);

      if (level > threshold) {
        speechMs += TICK_MS;
        silenceMs = 0;
        if (speechMs >= MIN_SPEECH_MS) heardSpeech = true;
      } else {
        silenceMs += TICK_MS;
        if (!heardSpeech) {
          speechMs = Math.max(0, speechMs - TICK_MS);
          noiseFloor = noiseFloor * 0.95 + level * 0.05;
        }
      }

      const elapsed = Date.now() - startedAt;
      if (heardSpeech && (silenceMs >= END_SILENCE_MS || elapsed >= MAX_TURN_MS)) {
        fn.current.endTurn();
      } else if (!heardSpeech && elapsed >= MAX_TURN_MS) {
        // Uzun süre kimse konuşmadıysa kaydı yenile ki dosya şişmesin
        recorder.discardRecording();
        recorder.startRecording().catch(() => {});
        startedAt = Date.now();
      }
    }, TICK_MS);
  };

  fn.current.endTurn = async () => {
    stopVad();
    const turn = ++turnRef.current;
    setState("transcribing");

    const blob = await recorder.stopRecording();
    let text = "";
    try {
      if (blob && blob.size > 0) text = await transcribe(blob);
    } catch (err) {
      console.error("STT Error", err);
    }
    if (!activeRef.current || turn !== turnRef.current) return;
    if (!text) {
      fn.current.listen();
      return;
    }

    setState("thinking");
    player.stopAll();
    responseDoneRef.current = false;
    ttsInFlightRef.current = 0;

    const splitter = new StreamingSentenceSplitter((sentence, index) => {
      ttsInFlightRef.current += 1;
      apiPost<{ audio: string }>("/api/tts", { text: sentence })
        .then(async (resp) => {
          if (turn !== turnRef.current) return;
          if (stateRef.current === "thinking") setState("speaking");
          await player.enqueueBase64Audio(resp.audio, index);
        })
        .catch((err) => {
          console.error("TTS Error", err);
          if (turn === turnRef.current) player.skipIndex(index);
        })
        .finally(() => {
          ttsInFlightRef.current -= 1;
          fn.current.checkResponseFinished(turn);
        });
    });

    try {
      await send(text, (chunk) => {
        if (turn === turnRef.current) splitter.feed(chunk);
      });
    } catch (err) {
      console.error("Voice send error", err);
    } finally {
      if (turn === turnRef.current) {
        splitter.flush();
        responseDoneRef.current = true;
        fn.current.checkResponseFinished(turn);
      }
    }
  };

  // Cevap akışı bitti, bekleyen TTS kalmadı ve ses çalması tamamlandıysa tekrar dinlemeye geç
  fn.current.checkResponseFinished = (turn: number) => {
    if (!activeRef.current || turn !== turnRef.current) return;
    if (responseDoneRef.current && ttsInFlightRef.current === 0 && player.isIdle()) {
      fn.current.listen();
    }
  };

  useEffect(() => {
    player.onIdle(() => fn.current.checkResponseFinished(turnRef.current));
    return () => player.onIdle(null);
  }, [player]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsActive(true);
    player.initContext(); // kullanıcı tıklaması içinde açılmalı
    fn.current.listen();
  }, [player]);

  const stop = useCallback(() => {
    activeRef.current = false;
    turnRef.current += 1;
    stopVad();
    recorder.close();
    player.stopAll();
    setIsActive(false);
    setState("idle");
  }, [recorder, player]);

  useEffect(() => () => {
    activeRef.current = false;
    stopVad();
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setIsMuted(mutedRef.current);
    if (!activeRef.current) return;
    if (mutedRef.current && stateRef.current === "listening") {
      stopVad();
      recorder.discardRecording();
      setState("muted");
    } else if (!mutedRef.current && stateRef.current === "muted") {
      fn.current.listen();
    }
  }, [recorder]);

  /** Asistan konuşurken/düşünürken sözünü kes ve dinlemeye geç */
  const interrupt = useCallback(() => {
    if (!activeRef.current) return;
    if (stateRef.current === "speaking" || stateRef.current === "thinking") {
      turnRef.current += 1;
      player.stopAll();
      fn.current.listen();
    }
  }, [player]);

  /** Küre animasyonu için anlık ses seviyesi (0-1) */
  const getLevel = useCallback(() => {
    const raw = stateRef.current === "speaking" ? player.getLevel() : stateRef.current === "listening" ? recorder.getLevel() : 0;
    return Math.min(1, raw * 8);
  }, [player, recorder]);

  return { isActive, isMuted, state, start, stop, toggleMute, interrupt, getLevel };
}
