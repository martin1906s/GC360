"use client";

import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface ExpansionModule {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
  features: string[];
}

/** Tarjetas de módulos de expansión (P2): visibles en la navegación, sin operación productiva. */
export function ExpansionGrid({ modules }: { modules: ExpansionModule[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((m) => (
        <Card key={m.title} className="flex flex-col p-5">
          <div className="flex items-start justify-between">
            <div className="grid size-10 place-items-center rounded-md border bg-slate-50 text-slate-600"><m.icon className="size-5" /></div>
            <Badge tone="slate">Próximamente</Badge>
          </div>
          <p className="mt-4 font-semibold">{m.title}</p>
          <p className="mt-1 text-[13px] text-fg-muted">{m.description}</p>
          <ul className="mt-3 flex-1 space-y-1.5 border-t pt-3">
            {m.features.map((f) => <li key={f} className="flex gap-2 text-[13px] text-fg-muted"><span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />{f}</li>)}
          </ul>
          <button onClick={() => toast(`${m.title}`, { description: "Este módulo estará disponible próximamente." })} className="mt-4 text-left text-xs font-medium text-brand-700 hover:underline">Más información →</button>
        </Card>
      ))}
    </div>
  );
}
