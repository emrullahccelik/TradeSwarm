"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: string;
  isUser?: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="prose prose-chat dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = !inline && match;
            
            return isBlock ? (
              <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />
            ) : (
              <code className={cn("bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono", className)} {...props}>
                {children}
              </code>
            );
          },
          a({ node, children, ...props }: any) {
            return (
              <a target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...props}>
                {children}
              </a>
            );
          },
          table({ node, children, ...props }: any) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse border border-border" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ node, children, ...props }: any) {
            return (
              <th className="border border-border bg-muted/50 px-4 py-2 text-left font-semibold" {...props}>
                {children}
              </th>
            );
          },
          td({ node, children, ...props }: any) {
            return (
              <td className="border border-border px-4 py-2" {...props}>
                {children}
              </td>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg bg-zinc-950 my-4 overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-zinc-400 border-b border-zinc-800">
        <span>{language}</span>
        <button
          onClick={onCopy}
          className="hover:text-zinc-100 transition-colors"
          title="Kodu kopyala"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono text-zinc-50">
        <pre>
          <code className={`language-${language}`}>{value}</code>
        </pre>
      </div>
    </div>
  );
}
