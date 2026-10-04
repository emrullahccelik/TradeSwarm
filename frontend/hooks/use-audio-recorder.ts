"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import { getSupportedAudioMimeType } from "@/lib/audio-utils";

/**
 * Mikrofon akışını açık tutar ve üzerinde art arda kayıt alınmasını sağlar.
 * Ses seviyesi state yerine ref ile okunur (getLevel), böylece her karede yeniden render olmaz.
 */
export function useAudioRecorder() {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const sampleBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const close = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => close, [close]);

  const open = useCallback(async () => {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = stream;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    audioContextRef.current = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    analyserRef.current = analyser;
    sampleBufferRef.current = new Float32Array(analyser.fftSize);
  }, []);

  /** Ham RMS seviyesi (sessizlik ~0.005, normal konuşma ~0.03-0.2) */
  const getLevel = useCallback(() => {
    const analyser = analyserRef.current;
    const buffer = sampleBufferRef.current;
    if (!analyser || !buffer) return 0;
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    return Math.sqrt(sum / buffer.length);
  }, []);

  const startRecording = useCallback(async () => {
    await open();
    const recorder = new MediaRecorder(streamRef.current!, { mimeType: getSupportedAudioMimeType() });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start();
  }, [open]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        recorderRef.current = null;
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.stop();
    });
  }, []);

  /** Kaydı sonuç üretmeden bırakır, mikrofon açık kalır */
  const discardRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  return useMemo(
    () => ({ open, close, getLevel, startRecording, stopRecording, discardRecording }),
    [open, close, getLevel, startRecording, stopRecording, discardRecording]
  );
}
