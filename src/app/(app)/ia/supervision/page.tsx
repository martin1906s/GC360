"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bot, Check, FileSearch, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useScoped } from "@/hooks/use-data";
import { approveAIAction, rejectAIAction } from "@/services/ai-actions";
import { AI_STATUS } from "@/domain/constants";
import type { AIAction, AIActionStatus } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, PageHeader, Tabs } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Textarea } from "@/components/ui/form";
import { fmtDateTime, fromNow } from "@/lib/utils";

export default function SupervisionPage() {
  return <Guard perm="ai.approve"><Supervision /></Guard>;
}

type Tab = "pendiente" | "sugerida" | "historial";

function Supervision() {
  const actions = useScoped("aiActions");
  const cases = useScoped("cases");
  const [tab, setTab] = useState<Tab>("pendiente");
  const [selected, setSelected] = useState<AIAction | null>(null);

  const rows = useMemo(() => [...actions].filter((a) => (tab === "historial" ? !["pendiente", "sugerida"].includes(a.status) : a.status === tab)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [actions, tab]);
  const count = (s: AIActionStatus) => actions.filter((a) => a.status === s).length;
  const decided = actions.filter((a) => ["ejecutada", "rechazada"].includes(a.status));
  const approvalRate = decided.length ? Math.round((count("ejecutada") / decided.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Centro de supervisión IA" description="Acciones propuestas por la IA que esperan tu aprobación." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <KpiCard label="Pendientes de aprobación" value={count("pendiente")} tone="amber" icon={<ShieldAlert />} />
        <KpiCard label="Sugeridas (no sensibles)" value={count("sugerida")} tone="blue" icon={<Bot />} />
        <KpiCard label="Ejecutadas" value={count("ejecutada")} tone="green" icon={<ShieldCheck />} />
        <KpiCard label="Tasa de aprobación" value={`${approvalRate}%`} tone="teal" hint={`${count("rechazada")} rechazadas`} />
      </div>
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "pendiente", label: "Por aprobar", count: count("pendiente") }, { key: "sugerida", label: "Sugeridas", count: count("sugerida") }, { key: "historial", label: "Bitácora de decisiones", count: decided.length }]} />
        <CardContent className="space-y-3">
          {rows.length === 0 && <EmptyState icon={<ShieldCheck />} title="Nada por revisar" description="Las acciones que requieran tu aprobación aparecerán aquí." />}
          {rows.map((a) => {
            const c = cases.find((x) => x.id === a.caseId);
            return (
              <div key={a.id} className="rounded-lg border p-4 transition hover:border-slate-300">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-900 text-white"><Bot className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{a.title}</p>
                      {a.sensitive && <Badge tone="red"><ShieldAlert className="size-3" /> Sensible</Badge>}
                      <MetaBadge map={AI_STATUS} value={a.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-fg-muted">{a.agent} · {fromNow(a.createdAt)} · confianza {Math.round(a.confidence * 100)}%{c && <> · <Link href={`/casos/${c.id}`} className="font-medium text-brand-700 hover:underline">{c.code}</Link></>}</p>
                    <p className="mt-2 text-[13px]">{a.detail}</p>
                    {"body" in a.payload && <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[13px] text-fg-muted">«{String(a.payload.body)}»</p>}
                    {a.decidedBy && <p className="mt-2 text-xs text-fg-muted">Decisión de <b>{a.decidedBy}</b> · {a.decidedAt && fmtDateTime(a.decidedAt)}{a.decisionNote ? ` · «${a.decisionNote}»` : ""}</p>}
                  </div>
                  <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(a)}><FileSearch /> Revisar</Button>
                    {["pendiente", "sugerida"].includes(a.status) && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setSelected(a)}><X /> Rechazar</Button>
                        <Button size="sm" variant="success" onClick={() => { approveAIAction(a.id); toast.success("Acción aprobada y ejecutada", { description: "La decisión quedó registrada en auditoría." }); }}><Check /> Aprobar</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      {selected && <ReviewModal a={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ReviewModal({ a, onClose }: { a: AIAction; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [body, setBody] = useState(String(a.payload.body ?? ""));
  const open = ["pendiente", "sugerida"].includes(a.status);
  return (
    <Modal open onClose={onClose} size="lg" title="Revisión de acción IA" description="Fuente, instrucción y justificación de la acción propuesta."
      footer={open ? <>
        <Button variant="danger" disabled={!note} onClick={() => { rejectAIAction(a.id, note); toast("Acción rechazada y registrada"); onClose(); }}><X /> Rechazar</Button>
        <Button variant="success" onClick={() => { approveAIAction(a.id, note || undefined, body !== a.payload.body ? body : undefined); toast.success("Acción aprobada y ejecutada"); onClose(); }}><Check /> Aprobar{body !== a.payload.body ? " con cambios" : ""}</Button>
      </> : <Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      <dl className="grid grid-cols-2 gap-4 text-[13px]">
        <div><dt className="text-[11px] uppercase text-fg-subtle">Agente</dt><dd className="font-medium">{a.agent}</dd></div>
        <div><dt className="text-[11px] uppercase text-fg-subtle">Tipo</dt><dd className="font-medium">{a.kind}</dd></div>
        <div className="col-span-2"><dt className="text-[11px] uppercase text-fg-subtle">Instrucción que la originó</dt><dd>{a.instruction}</dd></div>
        <div className="col-span-2"><dt className="text-[11px] uppercase text-fg-subtle">Fuente de datos</dt><dd>{a.source}</dd></div>
        <div className="col-span-2"><dt className="text-[11px] uppercase text-fg-subtle">Justificación</dt><dd>{a.detail}</dd></div>
      </dl>
      {"body" in a.payload && (
        <Field label="Contenido propuesto (editable antes de aprobar)" className="mt-4"><Textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={!open} /></Field>
      )}
      {open && <Field label="Nota de decisión (obligatoria para rechazar)" className="mt-4"><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[60px]" /></Field>}
    </Modal>
  );
}
