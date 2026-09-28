"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
}

export function AudioVisualizer({ audioLevel, isActive }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    if (!isActive) {
      setBars([0.1, 0.2, 0.1, 0.2, 0.1, 0.2, 0.1]);
      return;
    }

    // Generate pseudo-random heights based on audio level
    const baseHeight = audioLevel;
    const newBars = bars.map((_, i) => {
      // Create some variation for each bar
      const randomVariation = Math.random() * 0.4 + 0.8; 
      const height = Math.min(1, Math.max(0.05, baseHeight * randomVariation));
      return height;
    });
    
    setBars(newBars);
  }, [audioLevel, isActive]);

  return (
    <div className="flex items-end justify-center h-16 gap-1 w-full overflow-hidden">
      {bars.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-2 rounded-full transition-all duration-75",
            isActive ? "bg-indigo-500" : "bg-muted-foreground/30"
          )}
          style={{
            height: `${height * 100}%`,
            minHeight: "4px"
          }}
        />
      ))}
    </div>
  );
}
