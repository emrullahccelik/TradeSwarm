"use client";

import { useEffect, useRef } from "react";

interface DictationWaveformProps {
  getLevel: () => number;
}

const BAR_WIDTH = 2;
const BAR_GAP = 3;
const SAMPLE_MS = 70;

/** Sağdan akan ses dalgası; henüz ses gelmeyen kısım noktalı çizgi olarak görünür */
export function DictationWaveform({ getLevel }: DictationWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const levels: number[] = [];
    let frame: number;
    let lastSample = 0;

    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maxBars = Math.floor(width / (BAR_WIDTH + BAR_GAP));
      if (now - lastSample >= SAMPLE_MS) {
        levels.push(Math.min(1, getLevel() * 10));
        if (levels.length > maxBars) levels.splice(0, levels.length - maxBars);
        lastSample = now;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = getComputedStyle(canvas).color;
      const mid = height / 2;
      for (let i = 0; i < maxBars; i++) {
        const x = width - (maxBars - i) * (BAR_WIDTH + BAR_GAP);
        const level = levels[levels.length - (maxBars - i)];
        if (level === undefined) {
          ctx.globalAlpha = 0.35;
          ctx.fillRect(x, mid - 0.75, BAR_WIDTH, 1.5);
        } else {
          ctx.globalAlpha = 0.9;
          const barHeight = Math.max(2, level * height);
          ctx.fillRect(x, mid - barHeight / 2, BAR_WIDTH, barHeight);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [getLevel]);

  return <canvas ref={canvasRef} className="w-full h-8 text-foreground" />;
}
