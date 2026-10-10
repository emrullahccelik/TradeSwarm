"use client";

import { useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import { Check, ChevronLeft, ChevronRight, Code2, Copy, Download, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildArtifactDocument, downloadArtifact } from "@/lib/artifact";
import { cn } from "@/lib/utils";
import type { ArtifactVersion } from "@/types";

// HTML içindeki <style> ve <script> blokları da renklendirilsin diye css ve javascript de kaydedilir
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);

interface ArtifactPanelProps {
  versions: ArtifactVersion[];
  version: number;
  onSelectVersion: (version: number) => void;
  onClose: () => void;
}

export function ArtifactPanel({ versions, version, onSelectVersion, onClose }: ArtifactPanelProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const index = Math.max(0, versions.findIndex((v) => v.version === version));
  const artifact = versions[index];

  const highlighted = useMemo(
    () => (tab === "code" ? hljs.highlight(artifact.content, { language: "xml" }).value : ""),
    [tab, artifact.content]
  );

  const onCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="absolute inset-0 z-20 flex flex-col bg-background md:static md:z-auto md:w-1/2 md:min-w-[380px] md:border-l md:border-border">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{artifact.title}</div>
        </div>

        {versions.length > 1 && (
          <div className="flex items-center text-xs text-muted-foreground tabular-nums">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === 0}
              onClick={() => onSelectVersion(versions[index - 1].version)}
              title="Önceki versiyon"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            v{artifact.version}/{versions[versions.length - 1].version}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === versions.length - 1}
              onClick={() => onSelectVersion(versions[index + 1].version)}
              title="Sonraki versiyon"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex rounded-lg bg-muted p-0.5">
          {([
            ["preview", Eye, "Önizleme"],
            ["code", Code2, "Kod"],
          ] as const).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                tab === key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy} title="Kodu kopyala">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadArtifact(artifact)} title="HTML olarak indir">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Kapat">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        {tab === "preview" ? (
          // allow-same-origin verilmez: sayfa uygulamanın origin'ine, localStorage'daki token'a ve üst pencereye erişemez
          <iframe
            key={`${artifact.artifactId}-${artifact.version}`}
            title={artifact.title}
            sandbox="allow-scripts"
            srcDoc={buildArtifactDocument(artifact.content)}
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <pre className="h-full overflow-auto bg-zinc-950 p-4 text-sm text-zinc-50">
            <code className="hljs language-xml" dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        )}
      </div>
    </aside>
  );
}
