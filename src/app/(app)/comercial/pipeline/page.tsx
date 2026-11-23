"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, GripVertical, Plus } from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { createOpportunity, moveOpportunity } from "@/services/crm";
import { PIPELINE, TONE_CLASSES } from "@/domain/constants";
import type { PipelineStage } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Button } from "@/components/ui/button";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/form";
import { addDays, cn, fmtDate, money, moneyShort } from "@/lib/utils";

export default function PipelinePage() {
  return <Guard perm="crm.view"><Pipeline /></Guard>;
}

function Pipeline() {
  const { can, user } = useCurrent();
  const { clients, users, lines } = useLookups();
  const opps = useScoped("opportunities");
  const [owner, setOwner] = useState("all");
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<PipelineStage | null>(null);
  const [lost, setLost] = useState<{ id: string } | null>(null);
  const [reason, setReason] = useState("Precio");
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => opps.filter((o) => owner === "all" || o.ownerId === owner), [opps, owner]);
  const weighted = rows.reduce((s, o) => s + o.value * (PIPELINE.find((p) => p.key === o.stage)?.probability ?? 0), 0);

  const drop = (stage: PipelineStage) => {
    setOver(null);
    if (!drag) return;
    if (!can("crm.edit")) return toast.error("Tu perfil no puede mover oportunidades");
    if (stage === "perdido") return setLost({ id: drag });
    moveOpportunity(drag, stage);
    toast.success(`Movida a «${PIPELINE.find((p) => p.key === stage)?.label}»`);
    setDrag(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pipeline comercial"
        description="Arrastra las oportunidades entre etapas para actualizarlas."
        actions={
          <>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-48">
              <option value="all">Todo el equipo</option>
              {[...users.values()].filter((u) => u.role === "asesor").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            {can("crm.edit") && <Button onClick={() => setOpen(true)}><Plus /> Oportunidad</Button>}
          </>
        }
      >
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div><p className="text-xs text-fg-muted">Prima total en pipeline</p><p className="text-lg font-semibold tabular-nums">{money(rows.filter((o) => !["ganado", "perdido"].includes(o.stage)).reduce((s, o) => s + o.value, 0))}</p></div>
          <div><p className="text-xs text-fg-muted">Ponderado por probabilidad</p><p className="text-lg font-semibold tabular-nums">{money(weighted)}</p></div>
          <div><p className="text-xs text-fg-muted">Ganadas</p><p className="text-lg font-semibold tabular-nums text-emerald-700">{money(rows.filter((o) => o.stage === "ganado").reduce((s, o) => s + o.value, 0))}</p></div>
        </div>
      </PageHeader>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 scroll-thin lg:-mx-8 lg:px-8">
        {PIPELINE.map((stage) => {
          const items = rows.filter((o) => o.stage === stage.key);
          return (
            <div
              key={stage.key}
              onDragOver={(e) => { e.preventDefault(); setOver(stage.key); }}
              onDragLeave={() => setOver(null)}
              onDrop={() => drop(stage.key)}
              className={cn("flex w-[270px] shrink-0 flex-col rounded-lg bg-slate-100/70 transition", over === stage.key && "bg-brand-50 ring-2 ring-brand-300")}
            >
              <div className="flex items-center justify-between px-3 pb-2 pt-3">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", TONE_CLASSES[stage.tone].dot)} />
                  <p className="text-[13px] font-semibold">{stage.label}</p>
                  <span className="rounded-full bg-white px-1.5 text-[11px] font-medium text-fg-muted">{items.length}</span>
                </div>
                <span className="text-[11px] tabular-nums text-fg-muted">{moneyShort(items.reduce((s, o) => s + o.value, 0))}</span>
              </div>
              <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
                {items.map((o) => {
                  const owner = users.get(o.ownerId);
                  const late = new Date(o.nextActionDate) < new Date() && !["ganado", "perdido"].includes(o.stage);
                  return (
                    <div
                      key={o.id}
                      draggable={can("crm.edit")}
                      onDragStart={() => setDrag(o.id)}
                      onDragEnd={() => setDrag(null)}
                      className={cn("group cursor-grab rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing", drag === o.id && "opacity-50")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium leading-snug">{o.title}</p>
                        <GripVertical className="size-4 shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100" />
                      </div>
                      <Link href={`/crm/clientes/${o.clientId}`} className="mt-0.5 block truncate text-xs text-fg-muted hover:text-brand-700">{clients.get(o.clientId)?.name}</Link>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-sm font-semibold tabular-nums">{money(o.value)}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-fg-muted">{lines.get(o.lineId)?.name}</span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t pt-2">
                        <span className={cn("inline-flex items-center gap-1 text-[11px]", late ? "font-medium text-rose-600" : "text-fg-muted")}>
                          <CalendarClock className="size-3" /> {o.stage === "perdido" ? o.lostReason : `${o.nextAction} · ${fmtDate(o.nextActionDate)}`}
                        </span>
                        {owner && <Avatar name={owner.name} color={owner.color} size="xs" />}
                      </div>
                      {o.caseId && <Link href={`/casos/${o.caseId}`} className="mt-1.5 block text-[11px] font-medium text-brand-700 hover:underline">Ver caso →</Link>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!lost} onClose={() => setLost(null)} title="Marcar como perdida" footer={<><Button variant="secondary" onClick={() => setLost(null)}>Cancelar</Button><Button variant="danger" onClick={() => { moveOpportunity(lost!.id, "perdido", reason); setLost(null); toast("Oportunidad marcada como perdida"); }}>Confirmar</Button></>}>
        <Field label="Motivo de pérdida">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {["Precio", "Eligió otra agencia", "Sin respuesta del cliente", "No cumple requisitos de suscripción", "Pospuso la decisión"].map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
      </Modal>

      <NewOpp open={open} onClose={() => setOpen(false)} ownerId={user?.id ?? ""} />
    </div>
  );
}

function NewOpp({ open, onClose, ownerId }: { open: boolean; onClose: () => void; ownerId: string }) {
  const clients = useScoped("clients");
  const lines = useScoped("lines");
  const [f, setF] = useState({ clientId: "", title: "", lineId: "", value: "", channel: "WhatsApp", nextAction: "Primer contacto" });
  const submit = () => {
    if (!f.clientId || !f.title) return toast.error("Cliente y título son obligatorios");
    createOpportunity({ clientId: f.clientId, title: f.title, lineId: f.lineId || lines[0].id, stage: "nuevo", value: Number(f.value || 0), channel: f.channel, ownerId, nextAction: f.nextAction, nextActionDate: addDays(1) });
    toast.success("Oportunidad creada");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Nueva oportunidad" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}>Crear</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente / prospecto" className="sm:col-span-2"><Select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}><option value="">Seleccionar…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Título" className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Ramo"><Select value={f.lineId} onChange={(e) => setF({ ...f, lineId: e.target.value })}>{lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
        <Field label="Prima estimada (COP)"><Input type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
        <Field label="Canal"><Input value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} /></Field>
        <Field label="Próxima acción"><Input value={f.nextAction} onChange={(e) => setF({ ...f, nextAction: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
