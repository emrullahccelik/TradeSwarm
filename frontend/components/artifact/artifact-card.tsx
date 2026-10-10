"use client";

import { motion } from "framer-motion";
import { ChevronRight, FileCode2, Loader2 } from "lucide-react";
import { useArtifactPanel } from "@/hooks/use-artifact-panel";
import { cn } from "@/lib/utils";

type ArtifactCardProps =
  | { status: "writing"; tool: string; chars: number }
  | { status: "ready"; artifactId: string; version: number; title: string };

export function ArtifactCard(props: ArtifactCardProps) {
  const { selected, openArtifact } = useArtifactPanel();

  if (props.status === "writing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-3 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/10 px-4 py-3"
      >
        <Loader2 className="h-5 w-5 shrink-0 text-indigo-500 animate-spin" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {props.tool === "update_artifact" ? "Artifact güncelleniyor…" : "Artifact yazılıyor…"}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {props.chars.toLocaleString("tr-TR")} karakter
          </span>
        </div>
      </motion.div>
    );
  }

  const isOpen = selected?.artifactId === props.artifactId && selected.version === props.version;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => openArtifact({ artifactId: props.artifactId, version: props.version })}
      className={cn(
        "my-3 flex w-full max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        isOpen ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-muted/50"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileCode2 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{props.title}</span>
        <span className="text-xs text-muted-foreground">
          HTML · v{props.version}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </motion.button>
  );
}
