"use client";

import { AlarmClock } from "lucide-react";
import type { Case } from "@/domain/types";
import { cn, fromNow } from "@/lib/utils";

export function SlaCell({ c }: { c: Case }) {
  const closed = ["resuelto", "cerrado"].includes(c.status);
  if (closed) return <span className="text-xs text-fg-subtle">Cumplido</span>;
  const late = new Date(c.dueAt) < new Date();
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", late ? "text-rose-600" : "text-fg-muted")}>
      <AlarmClock className="size-3.5" />
      {late ? `Vencido ${fromNow(c.dueAt)}` : `Vence ${fromNow(c.dueAt)}`}
    </span>
  );
}

