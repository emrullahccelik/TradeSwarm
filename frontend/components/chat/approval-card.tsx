"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ban, CheckCircle2, Clock, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@/types";

interface ApprovalCardProps {
  approvalId: string;
  action: string;
  details: Record<string, string | number>;
  status: ApprovalStatus;
  timeout?: number;
}

const ACTION_NAMES: Record<string, string> = {
  create_market_order: "Market emri",
  create_limit_order: "Limit emri",
  create_oco_order: "OCO emri",
  cancel_open_order: "Emir iptali",
};

const DETAIL_LABELS: Record<string, string> = {
  symbol: "Parite",
  side: "Yön",
  quantity: "Miktar",
  price: "Fiyat",
  stop_price: "Stop fiyatı",
  stop_limit_price: "Stop-limit fiyatı",
  order_id: "Emir ID",
};

const SIDE_NAMES: Record<string, string> = { BUY: "ALIŞ", SELL: "SATIŞ" };

const STATUS_VIEW: Record<Exclude<ApprovalStatus, "pending">, { label: string; icon: typeof CheckCircle2; className: string }> = {
  approved: { label: "Onaylandı", icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
  rejected: { label: "Reddedildi", icon: XCircle, className: "text-destructive" },
  expired: { label: "Süre doldu, işlem yapılmadı", icon: Clock, className: "text-muted-foreground" },
  cancelled: { label: "İstek iptal edildi, işlem yapılmadı", icon: Ban, className: "text-muted-foreground" },
};

export function ApprovalCard({ approvalId, action, details, status, timeout }: ApprovalCardProps) {
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(timeout ?? 0);
  const isPending = status === "pending";

  useEffect(() => {
    if (!isPending || !timeout) return;
    const deadline = Date.now() + timeout * 1000;
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPending, timeout]);

  const decide = async (approved: boolean) => {
    setSubmitting(approved ? "approve" : "reject");
    setError(null);
    try {
      await apiPost(`/api/approvals/${approvalId}`, { approved });
      // Kesin sonuç backend'den approval_resolved olayı ile gelir
    } catch {
      setError("Karar iletilemedi; onayın süresi dolmuş olabilir.");
      setSubmitting(null);
    }
  };

  const resolved = isPending ? null : STATUS_VIEW[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "my-3 overflow-hidden rounded-xl border",
        isPending ? "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10" : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/20">
        <ShieldAlert className={cn("h-4 w-4", isPending ? "text-amber-500" : "text-muted-foreground")} />
        <span className="font-semibold text-sm">Onay gerekiyor: {ACTION_NAMES[action] || action}</span>
        {isPending && timeout ? (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{secondsLeft} sn</span>
        ) : null}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{DETAIL_LABELS[key] || key}</dt>
              <dd className="font-medium tabular-nums">
                {key === "side" ? SIDE_NAMES[String(value)] || value : value}
              </dd>
            </div>
          ))}
        </dl>

        {isPending ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => decide(true)} disabled={!!submitting}>
              {submitting === "approve" && <Loader2 className="animate-spin" />}
              Onayla
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide(false)} disabled={!!submitting}>
              {submitting === "reject" && <Loader2 className="animate-spin" />}
              Reddet
            </Button>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        ) : (
          resolved && (
            <div className={cn("flex items-center gap-2 text-sm font-medium", resolved.className)}>
              <resolved.icon className="h-4 w-4" />
              {resolved.label}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
