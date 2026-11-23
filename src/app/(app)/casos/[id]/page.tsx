"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Bot, CalendarPlus, Check, ChevronRight, FileText, Lock, MessageCircle, Paperclip, Plus, Scale, ShieldAlert, BotMessageSquare, StickyNote, Upload, X,
} from "lucide-react";
import { useCurrent, useLookups, useRecord, useScoped } from "@/hooks/use-data";
import { addCaseNote, changeCaseStatus, createTask, toggleTask, updateCase } from "@/services/cases";
import { approveAIAction, createAIAction, rejectAIAction } from "@/services/ai-actions";
import { draftReplyForCase, updateClaimStatus } from "@/services/insurance";
import { audit, getCtx, repo } from "@/services/core";
import { AI_STATUS, CASE_CATEGORY, CASE_STATUS, CLAIM_STATUS, POLICY_STATUS, PRIORITY } from "@/domain/constants";
import type { CaseStatus, Claim, Task } from "@/domain/types";
import { Guard, NotFoundInTenant } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState, Stat, Tabs, Timeline } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ChannelLabel, ClientLink, InsurerChip, LineName, UserChip } from "@/components/domain/chips";
import { SlaCell } from "@/components/domain/sla";
import { cn, addHours, fmtDate, fmtDateTime, fromNow, money, nowISO, uid } from "@/lib/utils";

type Tab = "resumen" | "actividades" | "documentos" | "timeline" | "ia";

export default function CaseDetailPage() {
  return (
    <Guard perm="cases.view">
      <CaseDetail />
    </Guard>
  );
}

function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { can, user } = useCurrent();
  const { users } = useLookups();
  const c = useRecord("cases", id);
  const tasks = useScoped("tasks");
  const docs = useScoped("documents");
  const events = useScoped("events");
  const actions = useScoped("aiActions");
  const offers = useScoped("offers");
  const quotes = useScoped("quoteRequests");
  const proposals = useScoped("proposals");
  const claims = useScoped("claims");
  const policy = useRecord("policies", c?.policyId);
  const conv = useRecord("conversations", c?.conversationId);
  const [tab, setTab] = useState<Tab>("resumen");
  const [closeModal, setCloseModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [note, setNote] = useState("");

  const caseTasks = useMemo(() => tasks.filter((t) => t.caseId === id).sort((a, b) => Number(a.done) - Number(b.done) || a.dueAt.localeCompare(b.dueAt)), [tasks, id]);
  const caseDocs = docs.filter((d) => d.caseId === id);
  const caseEvents = useMemo(() => events.filter((e) => e.caseId === id).sort((a, b) => b.at.localeCompare(a.at)), [events, id]);
  const caseActions = actions.filter((a) => a.caseId === id);
  const caseOffers = offers.filter((o) => o.caseId === id && o.status !== "descartada");
  const qr = quotes.find((q) => q.caseId === id);
  const proposal = proposals.filter((p) => p.caseId === id).sort((a, b) => b.version - a.version)[0];
  const claim = claims.find((cl) => cl.caseId === id);

  if (!c) return <NotFoundInTenant entity="caso" />;

  const closed = ["resuelto", "cerrado"].includes(c.status);
  const quoteFlow = ["cotizacion", "renovacion"].includes(c.category);
  const editable = can("cases.edit") && !closed;

  const setStatus = (s: CaseStatus) => {
    if (s === "cerrado" || s === "resuelto") return setCloseModal(true);
    try {
      changeCaseStatus(c.id, s);
      toast.success(`Estado: ${CASE_STATUS[s].label}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const proposeAI = () => {
    const body = draftReplyForCase(c.id);
    createAIAction({
      kind: "responder", title: `Responder al cliente — ${c.code}`, detail: "Respuesta fundamentada en el estado del caso y plantillas aprobadas.",
      payload: { conversationId: c.conversationId ?? "", body }, source: `Caso ${c.code} · base de conocimiento`, instruction: "Sugerir respuesta fundamentada en el caso",
      agent: "Asistente comercial virtual", caseId: c.id, conversationId: c.conversationId, sensitive: c.category === "siniestro" || c.category === "modificacion", confidence: 0.88,
    });
    createAIAction({
      kind: "crear_tarea", title: "Crear tarea: llamar al cliente para confirmar datos", detail: "Llamada de seguimiento en las próximas 24 h.",
      payload: { title: "Llamar al cliente para confirmar datos" }, source: `Caso ${c.code}`, instruction: "Proponer tareas y responsables", agent: "Agente de operaciones", caseId: c.id, sensitive: false, confidence: 0.9,
    });
    setTab("ia");
    toast("La IA propuso 2 acciones", { description: "Revisa la justificación antes de ejecutar.", icon: <BotMessageSquare className="size-4 text-brand-600" /> });
  };

  return (
    <div className="animate-fade-in">
      <Link href="/casos" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-3.5" /> Casos</Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">{c.code}</span>
            <MetaBadge map={CASE_CATEGORY} value={c.category} dot={false} />
            <MetaBadge map={CASE_STATUS} value={c.status} />
            <MetaBadge map={PRIORITY} value={c.priority} />
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{c.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">Creado {fmtDateTime(c.createdAt)} · <ChannelLabel channel={c.channel} /></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("ai.use") && !closed && <Button variant="ai" onClick={proposeAI}><BotMessageSquare /> Sugerir acciones IA</Button>}
          {quoteFlow && can("quotes.edit") && <Link href={`/casos/${c.id}/cotizacion`} className={buttonVariants()}><Scale /> {qr ? "Gestionar cotización" : "Solicitar cotización"}</Link>}
          {editable && <Button variant="secondary" onClick={() => setCloseModal(true)}><Check /> Resolver / cerrar</Button>}
        </div>
      </div>

      {quoteFlow && <QuoteStepper status={qr?.status} proposal={proposal?.status} hasPolicy={!!policy} />}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0">
          <Tabs
            className="px-3"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "resumen", label: "Resumen" },
              { key: "actividades", label: "Actividades", count: caseTasks.filter((t) => !t.done).length },
              { key: "documentos", label: "Documentos", count: caseDocs.length },
              { key: "timeline", label: "Línea de tiempo", count: caseEvents.length },
              { key: "ia", label: "Acciones IA", count: caseActions.filter((a) => a.status === "pendiente" || a.status === "sugerida").length },
            ]}
          />
          <CardContent>
            {tab === "resumen" && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Descripción</p>
                  <p className="mt-1.5 text-sm leading-relaxed">{c.description || "Sin descripción."}</p>
                </div>
                {claim && <ClaimPanel claim={claim} canEdit={can("claims.edit")} />}
                {quoteFlow && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Ofertas registradas</p>
                      <Link href={`/casos/${c.id}/cotizacion`} className="text-xs font-medium text-brand-700 hover:underline">Abrir comparador →</Link>
                    </div>
                    {caseOffers.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-fg-muted">Aún no hay ofertas. Solicita cotización a las aseguradoras.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-3">
                        {caseOffers.map((o) => (
                          <div key={o.id} className={cn("rounded-lg border p-3", o.status === "seleccionada" && "border-emerald-300 bg-emerald-50/50")}>
                            <InsurerChip id={o.insurerId} />
                            <p className="mt-2 text-lg font-semibold tabular-nums">{money(o.premium)}</p>
                            <p className="text-[11px] text-fg-muted">{o.productName} · v{o.version}</p>
                            {o.status === "seleccionada" && <Badge tone="green" className="mt-2">Elegida por el cliente</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {editable && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Nota interna</p>
                    <div className="mt-2 flex gap-2">
                      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar nota al historial…" />
                      <Button variant="secondary" disabled={!note} onClick={() => { addCaseNote(c.id, note); setNote(""); toast.success("Nota registrada en la línea de tiempo"); }}><StickyNote /> Guardar</Button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Actividad reciente</p>
                  <Timeline items={caseEvents.slice(0, 5).map((e) => ({ id: e.id, at: e.at, title: e.action, body: e.detail, actor: e.actorName, actorType: e.actorType }))} format={fromNow} />
                </div>
              </div>
            )}

            {tab === "actividades" && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-fg-muted">Las actividades obligatorias deben completarse antes de cerrar el caso.</p>
                  {editable && <Button size="sm" variant="secondary" onClick={() => setTaskModal(true)}><Plus /> Actividad</Button>}
                </div>
                {caseTasks.length === 0 ? <EmptyState title="Sin actividades" /> : (
                  <ul className="divide-y rounded-lg border">
                    {caseTasks.map((t) => <TaskRow key={t.id} t={t} />)}
                  </ul>
                )}
              </div>
            )}

            {tab === "documentos" && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-fg-muted">Documentos del caso con versión y estado de validación.</p>
                  {editable && (
                    <Button size="sm" variant="secondary" onClick={() => {
                      const ctx = getCtx();
                      repo.insert("documents", { id: uid("d"), tenantId: ctx.tenant.id, name: `soporte_${c.code}_${caseDocs.length + 1}.pdf`, kind: "otro", caseId: c.id, clientId: c.clientId, version: 1, uploadedBy: ctx.user.name, at: nowISO(), validation: "pendiente", restricted: false, size: "210 KB" });
                      audit({ entity: "case", entityId: c.id, caseId: c.id, action: "Documento adjuntado", detail: `soporte_${c.code}_${caseDocs.length + 1}.pdf ` });
                      toast.success("Documento cargado");
                    }}><Upload /> Cargar</Button>
                  )}
                </div>
                {caseDocs.length === 0 ? <EmptyState icon={<Paperclip />} title="Sin documentos" /> : (
                  <ul className="divide-y rounded-lg border">
                    {caseDocs.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-500"><FileText className="size-4" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{d.name}</p>
                          <p className="text-[11px] text-fg-muted">v{d.version} · {d.kind} · {d.size} · {d.uploadedBy} · {fromNow(d.at)}</p>
                        </div>
                        {d.restricted && <Badge tone="slate"><Lock className="size-3" /> Restringido</Badge>}
                        <Badge tone={d.validation === "validado" ? "green" : d.validation === "pendiente" ? "amber" : "red"}>{d.validation}</Badge>
                        {d.validation === "pendiente" && editable && (
                          <Button size="xs" variant="ghost" onClick={() => { repo.update("documents", d.id, { validation: "validado" }); audit({ entity: "case", entityId: c.id, caseId: c.id, action: "Documento validado", detail: d.name }); }}>Validar</Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "timeline" && (
              <div>
                <p className="mb-4 flex items-center gap-1.5 text-xs text-fg-muted"><Lock className="size-3.5" /> Historial completo del caso. Los registros no se pueden modificar.</p>
                <Timeline items={caseEvents.map((e) => ({ id: e.id, at: e.at, title: e.action, body: e.detail, actor: e.actorName, actorType: e.actorType }))} format={fmtDateTime} />
              </div>
            )}

            {tab === "ia" && (
              <div className="space-y-3">
                {caseActions.length === 0 && <EmptyState icon={<Bot />} title="Sin acciones de IA" description="Pide a la IA que sugiera respuestas y tareas para este caso." />}
                {caseActions.map((a) => (
                  <div key={a.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="text-xs text-fg-muted">{a.agent} · {fromNow(a.createdAt)} · confianza {Math.round(a.confidence * 100)}%</p>
                      </div>
                      <div className="flex gap-1.5">{a.sensitive && <Badge tone="red"><ShieldAlert className="size-3" /> Sensible</Badge>}<MetaBadge map={AI_STATUS} value={a.status} /></div>
                    </div>
                    <p className="mt-2 text-[13px] text-fg-muted"><b className="font-medium text-fg">Justificación:</b> {a.detail}</p>
                    {"body" in a.payload && <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[13px]">{String(a.payload.body)}</p>}
                    <p className="mt-2 text-[11px] text-fg-subtle">Fuente: {a.source} · Instrucción: {a.instruction}</p>
                    {(a.status === "pendiente" || a.status === "sugerida") && (
                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="xs" variant="ghost" onClick={() => { rejectAIAction(a.id, "Rechazada desde el caso"); toast("Acción rechazada"); }}><X /> Rechazar</Button>
                        <Button size="xs" variant="ai" disabled={a.sensitive && !can("ai.approve")} onClick={() => { approveAIAction(a.id); toast.success("Acción ejecutada"); }}>
                          <Check /> {a.sensitive && !can("ai.approve") ? "Requiere supervisor" : "Aprobar y ejecutar"}
                        </Button>
                      </div>
                    )}
                    {a.decidedBy && <p className="mt-2 text-[11px] text-fg-muted">Decisión: {a.decidedBy} · {a.decidedAt && fmtDateTime(a.decidedAt)}{a.decisionNote ? ` · «${a.decisionNote}»` : ""}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Gestión" />
            <CardContent className="space-y-4">
              <Field label="Estado">
                <Select value={c.status} disabled={!editable} onChange={(e) => setStatus(e.target.value as CaseStatus)}>
                  {Object.entries(CASE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </Field>
              <Field label="Responsable">
                <Select value={c.assigneeId} disabled={!editable} onChange={(e) => { updateCase(c.id, { assigneeId: e.target.value }); toast.success("Caso reasignado"); }}>
                  {[...users.values()].filter((u) => !["cliente", "afiliado"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
              <Field label="Prioridad">
                <Select value={c.priority} disabled={!editable} onChange={(e) => updateCase(c.id, { priority: e.target.value as never })}>
                  {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </Field>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs"><span className="text-fg-muted">SLA referencial</span><b>{c.slaHours} h</b></div>
                <div className="mt-1 flex items-center justify-between text-xs"><span className="text-fg-muted">Fecha objetivo</span><span>{fmtDateTime(c.dueAt)}</span></div>
                <div className="mt-2"><SlaCell c={c} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Relacionado" />
            <CardContent className="space-y-4">
              <Stat label="Cliente" value={<ClientLink id={c.clientId} sub />} />
              {c.lineId && <Stat label="Ramo" value={<LineName id={c.lineId} />} />}
              {conv && (
                <Link href={`/bandeja?c=${conv.id}`} className="flex items-center gap-2 rounded-lg border p-2.5 text-[13px] hover:border-brand-300">
                  <MessageCircle className="size-4 text-emerald-600" /> Conversación con {conv.contactName}
                  <ChevronRight className="ml-auto size-4 text-fg-subtle" />
                </Link>
              )}
              {policy && (
                <Link href={`/polizas/${policy.id}`} className="block rounded-lg border p-3 hover:border-brand-300">
                  <div className="flex items-center justify-between"><InsurerChip id={policy.insurerId} /><MetaBadge map={POLICY_STATUS} value={policy.status} /></div>
                  <p className="mt-1.5 font-mono text-xs">{policy.number}</p>
                  <p className="text-[11px] text-fg-muted">Vigente hasta {fmtDate(policy.endDate)}</p>
                </Link>
              )}
              {c.closeReason && <Stat label="Motivo de cierre" value={c.closeReason} />}
              <Stat label="Creado por" value={user && <UserChip id={c.assigneeId} />} />
            </CardContent>
          </Card>
        </div>
      </div>

      <CloseCaseModal open={closeModal} onClose={() => setCloseModal(false)} caseId={c.id} pending={caseTasks.filter((t) => t.mandatory && !t.done).length} />
      <TaskModal open={taskModal} onClose={() => setTaskModal(false)} caseId={c.id} clientId={c.clientId} assigneeId={c.assigneeId} />
    </div>
  );
}

function QuoteStepper({ status, proposal, hasPolicy }: { status?: string; proposal?: string; hasPolicy: boolean }) {
  const steps = ["Solicitud", "Ofertas", "Comparativo", "Aceptación", "Póliza"];
  const idx = hasPolicy ? 5 : proposal === "aceptada" ? 4 : proposal === "enviada" ? 3 : status === "ofertas_recibidas" ? 2 : status ? 1 : 0;
  return (
    <div className="mb-5 flex items-center gap-2 overflow-x-auto rounded-lg border bg-white px-4 py-3 scroll-thin">
      {steps.map((s, i) => (
        <div key={s} className="flex shrink-0 items-center gap-2">
          <span className={cn("grid size-6 place-items-center rounded-full text-[11px] font-semibold", i < idx ? "bg-emerald-500 text-white" : i === idx ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-slate-100 text-fg-subtle")}>
            {i < idx ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={cn("text-xs font-medium", i <= idx ? "text-fg" : "text-fg-subtle")}>{s}</span>
          {i < steps.length - 1 && <span className={cn("h-px w-8 sm:w-14", i < idx ? "bg-emerald-400" : "bg-border")} />}
        </div>
      ))}
    </div>
  );
}

function ClaimPanel({ claim, canEdit }: { claim: Claim; canEdit: boolean }) {
  const flow: Claim["status"][] = ["reportado", "documentacion", "en_aseguradora", "aprobado", "pagado"];
  const idx = flow.indexOf(claim.status);
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-900"><ShieldAlert className="size-4" /> Siniestro</p>
        <MetaBadge map={CLAIM_STATUS} value={claim.status} />
      </div>
      <p className="mt-2 text-[13px] text-rose-950/80">{claim.description}</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <Stat label="Ocurrencia" value={fmtDate(claim.occurredAt)} />
        <Stat label="Valor reclamado" value={claim.amountClaimed ? money(claim.amountClaimed) : "Por estimar"} />
        <Stat label="Radicado aseguradora" value={claim.claimNumber ?? "—"} />
      </div>
      {canEdit && idx < flow.length - 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-[11px] text-fg-muted">Actualiza el estado según la respuesta de la aseguradora.</span>
          <Button size="xs" onClick={() => { updateClaimStatus(claim.id, flow[idx + 1], flow[idx + 1] === "en_aseguradora" ? `SIN-${Math.floor(Math.random() * 90000 + 10000)}` : undefined); toast.success(`Siniestro: ${CLAIM_STATUS[flow[idx + 1]].label}`); }}>
            Avanzar a «{CLAIM_STATUS[flow[idx + 1]].label}»
          </Button>
        </div>
      )}
    </div>
  );
}

function TaskRow({ t }: { t: Task }) {
  const late = !t.done && new Date(t.dueAt) < new Date();
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="mt-0.5 size-4 cursor-pointer accent-brand-600" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] font-medium", t.done && "text-fg-subtle line-through")}>{t.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
          <span className={cn(late && "font-medium text-rose-600")}>{fmtDateTime(t.dueAt)}</span>
          <Badge tone="slate">{t.type}</Badge>
          {t.mandatory && <Badge tone="red">Obligatoria</Badge>}
          {t.origin !== "manual" && <Badge tone="teal">{t.origin === "ia" ? "IA" : "Automatización"}</Badge>}
        </div>
      </div>
      <UserChip id={t.assigneeId} showName={false} />
    </li>
  );
}

function CloseCaseModal({ open, onClose, caseId, pending }: { open: boolean; onClose: () => void; caseId: string; pending: number }) {
  const [status, setStatus] = useState<CaseStatus>("resuelto");
  const [reason, setReason] = useState("");
  const submit = () => {
    try {
      changeCaseStatus(caseId, status, reason || undefined);
      toast.success(`Caso ${status === "resuelto" ? "resuelto" : "cerrado"}`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Resolver o cerrar caso" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}>Confirmar</Button></>}>
      {pending > 0 && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay {pending} actividad(es) obligatoria(s) pendiente(s). Para cerrar, indica una justificación.</p>}
      <div className="space-y-4">
        <Field label="Resultado">
          <Select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus)}>
            <option value="resuelto">Resuelto</option>
            <option value="cerrado">Cerrado</option>
          </Select>
        </Field>
        <Field label={pending > 0 ? "Justificación (obligatoria)" : "Motivo de cierre"}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Cliente desistió de la cotización" />
        </Field>
      </div>
    </Modal>
  );
}

function TaskModal({ open, onClose, caseId, clientId, assigneeId }: { open: boolean; onClose: () => void; caseId: string; clientId: string; assigneeId: string }) {
  const { users } = useLookups();
  const [f, setF] = useState({ title: "", type: "tarea" as Task["type"], assigneeId, hours: "24", mandatory: false });
  const submit = () => {
    if (!f.title) return;
    createTask({ title: f.title, type: f.type, caseId, clientId, assigneeId: f.assigneeId, dueAt: addHours(Number(f.hours)), mandatory: f.mandatory, origin: "manual" });
    toast.success("Actividad creada");
    setF({ ...f, title: "" });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Nueva actividad" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}><CalendarPlus /> Crear</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Tipo">
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Task["type"] })}>
            {["tarea", "llamada", "reunion", "recordatorio", "seguimiento"].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Vence en">
          <Select value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })}>
            <option value="2">2 horas</option><option value="8">8 horas</option><option value="24">1 día</option><option value="72">3 días</option><option value="168">1 semana</option>
          </Select>
        </Field>
        <Field label="Responsable">
          <Select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
            {[...users.values()].filter((u) => !["cliente"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.mandatory} onChange={(e) => setF({ ...f, mandatory: e.target.checked })} className="accent-brand-600" /> Obligatoria para cierre</label>
      </div>
    </Modal>
  );
}
