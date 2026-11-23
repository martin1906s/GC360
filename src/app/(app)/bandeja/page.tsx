"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Bot, Briefcase, Check, PanelRight, ChevronDown, FileText, Image as ImageIcon, MessageSquarePlus, Paperclip, Send, BotMessageSquare, UserRound, Wand2, X, Zap,
} from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { classifyConversation, createCaseFromConversation, handoffToHuman, markRead, returnToAI, sendMessage, simulateInbound, SCENARIOS } from "@/services/inbox";
import { approveAIAction, rejectAIAction } from "@/services/ai-actions";
import { suggestReply } from "@/ai/engine";
import { AI_STATUS, CASE_CATEGORY, CASE_STATUS, CHANNEL_META, PRIORITY } from "@/domain/constants";
import type { CaseCategory, CasePriority, Conversation } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Button } from "@/components/ui/button";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Avatar, EmptyState, Progress } from "@/components/ui/misc";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { Modal, Sheet } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ChannelIcon, UserChip } from "@/components/domain/chips";
import { cn, fmtTime, fromNow } from "@/lib/utils";

export default function InboxPage() {
  return (
    <Guard perm="inbox.view">
      <Suspense>
        <Inbox />
      </Suspense>
    </Guard>
  );
}

type Filter = "todas" | "sin_leer" | "ia" | "humano" | "mias";

function Inbox() {
  const params = useSearchParams();
  const { user, can } = useCurrent();
  const conversations = useScoped("conversations");
  const [selected, setSelected] = useState<string | undefined>(params.get("c") ?? undefined);
  const [filter, setFilter] = useState<Filter>("todas");
  const [channel, setChannel] = useState<string>("all");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      [...conversations]
        .filter((c) => (channel === "all" ? true : c.channel === channel))
        .filter((c) => (filter === "sin_leer" ? c.unread > 0 : filter === "ia" ? c.mode === "ia" : filter === "humano" ? c.mode === "humano" : filter === "mias" ? c.assigneeId === user?.id : true))
        .filter((c) => !q || `${c.contactName} ${c.contactHandle} ${c.subject ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    [conversations, filter, channel, q, user],
  );

  useEffect(() => {
    if (!selected && list[0]) setSelected(list[0].id);
  }, [list, selected]);

  useEffect(() => {
    const cParam = params.get("c");
    if (cParam) setSelected(cParam);
  }, [params]);

  useEffect(() => {
    if (selected) markRead(selected);
  }, [selected]);

  const conv = conversations.find((c) => c.id === selected);

  const simulate = (key: string) => {
    const id = simulateInbound(key);
    if (id) {
      setSelected(id);
      setFilter("todas");
      setChannel("all");
      toast("Nuevo mensaje recibido", { description: "La IA lo clasificó y preparó una respuesta sugerida.", icon: <Zap className="size-4 text-amber-500" /> });
    }
  };

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-56px)] lg:-mx-8">
      {/* Lista */}
      <section className={cn("flex shrink-0 flex-col border-r bg-white w-full md:w-[300px] 2xl:w-[340px]", selected && "hidden md:flex")}>
        <div className="space-y-3 border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold">Bandeja omnicanal</h1>
            <Menu
              width="w-72"
              trigger={() => (
                <Button size="xs" variant="subtle">
                  <Zap /> Mensaje de prueba <ChevronDown className="size-3" />
                </Button>
              )}
            >
              {(close) => (
                <>
                  <MenuLabel>Mensaje entrante de prueba</MenuLabel>
                  {SCENARIOS.map((s) => (
                    <MenuItem key={s.key} icon={<ChannelIcon channel={s.channel} className="size-5 [&_svg]:size-3" />} onClick={() => { close(); simulate(s.key); }}>
                      {s.label}
                    </MenuItem>
                  ))}
                </>
              )}
            </Menu>
          </div>
          <Input placeholder="Buscar contacto, asunto…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
          <div className="flex items-center gap-2">
            <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-8 text-xs">
              <option value="all">Todos los canales</option>
              {(["whatsapp", "email", "outlook", "portal"] as const).map((c) => <option key={c} value={c}>{CHANNEL_META[c].label}</option>)}
            </Select>
          </div>
          <div className="flex flex-wrap gap-1">
            {([["todas", "Todas"], ["sin_leer", "Sin leer"], ["ia", "IA"], ["humano", "Humano"], ["mias", "Mías"]] as [Filter, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition", filter === k ? "bg-brand-600 text-white" : "bg-slate-100 text-fg-muted hover:bg-slate-200")}>{l}</button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto scroll-thin">
          {list.length === 0 && <EmptyState title="Sin conversaciones" description="Las conversaciones nuevas aparecerán aquí." />}
          {list.map((c) => <ConversationRow key={c.id} c={c} active={c.id === selected} onClick={() => setSelected(c.id)} />)}
        </ul>
      </section>

      <div className={cn("flex min-w-0 flex-1", !selected && "hidden md:flex")}>
        {conv ? <Thread key={conv.id} conv={conv} canReply={can("inbox.reply")} onBack={() => setSelected(undefined)} /> : <div className="grid flex-1 place-items-center"><EmptyState title="Selecciona una conversación" /></div>}
      </div>
    </div>
  );
}

function ConversationRow({ c, active, onClick }: { c: Conversation; active: boolean; onClick: () => void }) {
  const messages = useScoped("messages");
  const last = useMemo(() => messages.filter((m) => m.conversationId === c.id && m.direction !== "internal").sort((a, b) => b.at.localeCompare(a.at))[0], [messages, c.id]);
  return (
    <li>
      <button onClick={onClick} className={cn("flex w-full gap-3 border-b px-4 py-3 text-left transition", active ? "bg-brand-50/70" : "hover:bg-slate-50")}>
        <div className="relative">
          <Avatar name={c.contactName} color={c.clientId ? "#475569" : "#94a3b8"} />
          <ChannelIcon channel={c.channel} className="absolute -bottom-1 -right-1 size-4 ring-2 ring-white [&_svg]:size-2.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn("truncate text-[13px]", c.unread ? "font-semibold" : "font-medium")}>{c.contactName}</p>
            <span className="shrink-0 text-[10px] text-fg-subtle">{fromNow(c.lastMessageAt)}</span>
          </div>
          {c.subject && <p className="truncate text-[11px] font-medium text-fg-muted">{c.subject}</p>}
          <p className="truncate text-xs text-fg-muted">{last?.direction === "out" ? "Tú: " : ""}{last?.body}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {c.mode === "ia" ? <Badge tone="teal"><Bot className="size-3" /> IA</Badge> : <Badge tone="blue"><UserRound className="size-3" /> Humano</Badge>}
            {c.ai && <Badge tone={CASE_CATEGORY[c.ai.category].tone}>{CASE_CATEGORY[c.ai.category].label}</Badge>}
            {c.unread > 0 && <span className="ml-auto grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{c.unread}</span>}
          </div>
        </div>
      </button>
    </li>
  );
}

function Thread({ conv, canReply, onBack }: { conv: Conversation; canReply: boolean; onBack?: () => void }) {
  const { user } = useCurrent();
  const { users, clients, lines } = useLookups();
  const allMessages = useScoped("messages");
  const cases = useScoped("cases");
  const aiActions = useScoped("aiActions");
  const templates = useScoped("templates");
  const [draft, setDraft] = useState("");
  const [caseModal, setCaseModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = useMemo(() => allMessages.filter((m) => m.conversationId === conv.id).sort((a, b) => a.at.localeCompare(b.at)), [allMessages, conv.id]);
  const linkedCases = cases.filter((c) => conv.caseIds.includes(c.id));
  const pending = aiActions.filter((a) => a.conversationId === conv.id && (a.status === "pendiente" || a.status === "sugerida"));
  const client = conv.clientId ? clients.get(conv.clientId) : undefined;

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const analyze = async () => {
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 900));
    classifyConversation(conv.id);
    setAnalyzing(false);
    toast.success("Conversación analizada por IA");
  };

  const send = () => {
    if (!draft.trim()) return;
    try {
      sendMessage(conv.id, draft);
      setDraft("");
      toast.success("Mensaje enviado", { description: CHANNEL_META[conv.channel].label });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const suggest = () => {
    const ai = conv.ai;
    setDraft(suggestReply(ai?.category ?? "consulta", conv.contactName, linkedCases[0]?.code, ai?.lineId ? lines.get(ai.lineId)?.name : undefined));
    toast("Respuesta sugerida por IA", { description: "Revísala antes de enviar.", icon: <BotMessageSquare className="size-4 text-brand-600" /> });
  };

  const context = (
    <>
        <div className="border-b p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Contacto</p>
          {client ? (
            <Link href={`/crm/clientes/${client.id}`} className="mt-2 block rounded-lg border p-3 hover:border-brand-300">
              <p className="text-sm font-semibold">{client.name}</p>
              <p className="text-xs text-fg-muted">{client.status === "prospecto" ? "Prospecto" : "Cliente"} · {client.segment} · {client.city}</p>
            </Link>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed p-3 text-xs text-fg-muted">Remitente no identificado. Al crear el caso se registrará como prospecto.</p>
          )}
          {conv.assigneeId && <div className="mt-3 flex items-center justify-between text-xs"><span className="text-fg-muted">Responsable</span><UserChip id={conv.assigneeId} /></div>}
        </div>

        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700"><BotMessageSquare className="size-3.5" /> Análisis IA</p>
            <Button size="xs" variant="ghost" onClick={analyze} loading={analyzing}>{conv.ai ? "Reanalizar" : "Analizar"}</Button>
          </div>
          {conv.ai ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <MetaBadge map={CASE_CATEGORY} value={conv.ai.category} />
                <MetaBadge map={PRIORITY} value={conv.ai.priority} />
                {conv.ai.lineId && <Badge tone="indigo">{lines.get(conv.ai.lineId)?.name}</Badge>}
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-fg-muted"><span>Confianza</span><span className="font-medium tabular-nums text-fg">{Math.round(conv.ai.confidence * 100)}%</span></div>
                <Progress value={conv.ai.confidence * 100} tone={conv.ai.confidence > 0.8 ? "green" : "amber"} />
              </div>
              <p className="text-xs leading-relaxed text-fg-muted">{conv.ai.summary}</p>
              {Object.keys(conv.ai.extracted).length > 0 && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-fg-muted">Datos extraídos · requieren revisión</p>
                  <dl className="space-y-1">
                    {Object.entries(conv.ai.extracted).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 text-xs"><dt className="text-fg-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
              {conv.ai.wantsHuman && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">El cliente pidió hablar con un asesor.</p>}
            </div>
          ) : (
            <p className="mt-2 text-xs text-fg-muted">Ejecuta el análisis para clasificar la solicitud y extraer datos.</p>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Casos vinculados</p>
            <Button size="xs" variant="primary" onClick={() => setCaseModal(true)}><Briefcase /> Crear caso</Button>
          </div>
          <div className="mt-2 space-y-2">
            {linkedCases.length === 0 && <p className="text-xs text-fg-muted">Esta conversación aún no tiene casos.</p>}
            {linkedCases.map((c) => (
              <Link key={c.id} href={`/casos/${c.id}`} className="block rounded-lg border p-3 transition hover:border-brand-300">
                <div className="flex items-center justify-between"><span className="font-mono text-[11px] text-fg-muted">{c.code}</span><MetaBadge map={CASE_STATUS} value={c.status} /></div>
                <p className="mt-1 text-[13px] font-medium leading-snug">{c.title}</p>
                <p className="mt-1 text-[11px] text-fg-muted">{users.get(c.assigneeId)?.name}</p>
              </Link>
            ))}
          </div>
        </div>
    </>
  );

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="flex items-center gap-3 border-b bg-white px-5 py-3">
          {onBack && (
            <Button size="sm" variant="ghost" className="md:hidden -ml-2" onClick={onBack}>
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <Avatar name={conv.contactName} color="#475569" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{conv.contactName}</p>
            </div>
            <p className="truncate text-xs text-fg-muted">{conv.contactHandle}{conv.subject ? ` · ${conv.subject}` : ""}</p>
          </div>
          <Button size="sm" variant="ghost" className="2xl:hidden" onClick={() => setCtxOpen(true)}><PanelRight /> Detalles</Button>
          <Button size="sm" className="2xl:hidden" onClick={() => setCaseModal(true)}><Briefcase /> Crear caso</Button>
          {conv.mode === "ia" ? (
            <Button size="sm" variant="secondary" onClick={() => { handoffToHuman(conv.id, user!.id, `Tomada por ${user!.name}`); toast.success("Ahora atiendes esta conversación", { description: "La IA suspendió respuestas automáticas." }); }}>
              <UserRound /> Tomar conversación
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => { returnToAI(conv.id); toast("Atención devuelta a la IA"); }}>
              <Bot /> Devolver a IA
            </Button>
          )}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 scroll-thin">
          {messages.map((m) =>
            m.direction === "internal" ? (
              <div key={m.id} className="flex justify-center">
                <p className="max-w-lg rounded-full bg-slate-200/70 px-3 py-1 text-center text-[11px] text-fg-muted">{m.body}</p>
              </div>
            ) : (
              <div key={m.id} className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[72%] animate-fade-in rounded-xl px-3.5 py-2 shadow-sm", m.direction === "out" ? (m.author === "ia" ? "rounded-br-md bg-ink-800 text-white" : "rounded-br-md bg-brand-600 text-white") : "rounded-bl-md bg-white")}>
                  {m.direction === "out" && <p className="mb-0.5 flex items-center gap-1 text-[10px] font-medium opacity-80">{m.author === "ia" ? <Bot className="size-3" /> : <UserRound className="size-3" />}{m.authorName}</p>}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                  {m.attachments?.map((a) => (
                    <div key={a.name} className={cn("mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs", m.direction === "out" ? "bg-white/15" : "bg-slate-100")}>
                      {a.kind === "imagen" ? <ImageIcon className="size-3.5" /> : <FileText className="size-3.5" />}
                      <span className="truncate">{a.name}</span>
                      <span className="opacity-60">{a.size}</span>
                    </div>
                  ))}
                  <p className={cn("mt-1 text-right text-[10px]", m.direction === "out" ? "opacity-70" : "text-fg-subtle")}>
                    {fmtTime(m.at)} {m.direction === "out" && <Check className="inline size-3" />}
                  </p>
                </div>
              </div>
            ),
          )}
          <div ref={bottom} />
        </div>

        {pending.map((a) => <PendingReply key={a.id} actionId={a.id} />)}

        <div className="border-t bg-white p-3">
          {conv.mode === "ia" && <p className="mb-2 flex items-center gap-1.5 text-[11px] text-brand-700"><Bot className="size-3.5" /> El asistente virtual atiende esta conversación. Al escribir, la tomas como humano.</p>}
          <div className="rounded-lg border focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!canReply}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={canReply ? `Responder por ${CHANNEL_META[conv.channel].label}…` : "Tu perfil no puede responder"}
              className="min-h-[64px] resize-none border-0 focus:ring-0"
            />
            <div className="flex items-center gap-1 border-t px-2 py-1.5">
              <Button size="xs" variant="ghost" onClick={suggest} disabled={!canReply}><Wand2 /> Sugerir con IA</Button>
              <Menu
                align="left"
                width="w-80"
                trigger={() => <Button size="xs" variant="ghost" disabled={!canReply}><MessageSquarePlus /> Plantillas</Button>}
              >
                {(close) => (
                  <>
                    <MenuLabel>Plantillas</MenuLabel>
                    {templates.map((t) => (
                      <MenuItem key={t.id} hint={t.status === "aprobado" ? "✓" : "borrador"} onClick={() => { close(); setDraft(t.body.replace("{{nombre}}", conv.contactName.split(" ")[0]).replace("{{caso}}", linkedCases[0]?.code ?? "(por asignar)")); }}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </>
                )}
              </Menu>
              <Button size="xs" variant="ghost" onClick={() => toast("Selecciona el archivo a adjuntar")}><Paperclip /></Button>
              <Button size="sm" className="ml-auto" onClick={send} disabled={!draft.trim() || !canReply}><Send /> Enviar</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Panel de contexto */}
      <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-l bg-white scroll-thin 2xl:block">{context}</aside>
      <Sheet open={ctxOpen} onClose={() => setCtxOpen(false)} title="Detalles de la conversación" description={conv.contactName} width="max-w-sm"><div className="-m-5">{context}</div></Sheet>

      <CreateCaseModal open={caseModal} onClose={() => setCaseModal(false)} conv={conv} />
    </>
  );
}

function PendingReply({ actionId }: { actionId: string }) {
  const { can } = useCurrent();
  const actions = useScoped("aiActions");
  const a = actions.find((x) => x.id === actionId);
  const [text, setText] = useState(String(a?.payload.body ?? ""));
  if (!a) return null;
  const allowed = !a.sensitive || can("ai.approve");
  return (
    <div className="mx-4 mb-3 animate-fade-in rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-800"><BotMessageSquare className="size-3.5" /> {a.agent} propone una respuesta</p>
        <MetaBadge map={AI_STATUS} value={a.status} />
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-2 min-h-[60px] bg-white text-[13px]" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-fg-muted">Confianza {Math.round(a.confidence * 100)}% · {a.sensitive ? "Sensible: requiere supervisor" : "No sensible"}</span>
        <div className="ml-auto flex gap-1.5">
          <Button size="xs" variant="ghost" onClick={() => { rejectAIAction(a.id, "Descartada por el agente"); toast("Sugerencia descartada y registrada"); }}><X /> Descartar</Button>
          <Button size="xs" variant="ai" disabled={!allowed} title={allowed ? "" : "Requiere aprobación de un supervisor IA"} onClick={() => { approveAIAction(a.id, undefined, text !== a.payload.body ? text : undefined); toast.success("Aprobada y enviada"); }}>
            <Check /> {allowed ? "Aprobar y enviar" : "Espera supervisor"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateCaseModal({ open, onClose, conv }: { open: boolean; onClose: () => void; conv: Conversation }) {
  const { users } = useLookups();
  const ai = conv.ai;
  const [category, setCategory] = useState<CaseCategory>(ai?.category ?? "cotizacion");
  const [priority, setPriority] = useState<CasePriority>(ai?.priority ?? "media");
  const [assignee, setAssignee] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) {
      setCategory(conv.ai?.category ?? "cotizacion");
      setPriority(conv.ai?.priority ?? "media");
    }
  }, [open, conv.ai]);

  const submit = () => {
    try {
      const c = createCaseFromConversation(conv.id, { category, priority, assigneeId: assignee || undefined, title: title || undefined });
      toast.success(`Caso ${c.code} creado`, { description: "Se asignó responsable y se creó la tarea de respuesta.", action: { label: "Abrir", onClick: () => (window.location.href = `/casos/${c.id}`) } });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Crear caso desde conversación" description="La IA propone la clasificación; puedes ajustarla antes de confirmar." footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}><Briefcase /> Crear caso</Button></>}>
      {ai && (
        <div className="mb-4 flex gap-2 rounded-lg bg-brand-50 p-3 text-xs text-fg">
          <BotMessageSquare className="size-4 shrink-0 text-brand-600" />
          <p>{ai.summary}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título (opcional)" className="sm:col-span-2"><Input placeholder="Se genera automáticamente" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Clasificación">
          <Select value={category} onChange={(e) => setCategory(e.target.value as CaseCategory)}>
            {Object.entries(CASE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Prioridad" hint={`SLA referencial: ${PRIORITY[priority].sla} h`}>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as CasePriority)}>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Responsable" className="sm:col-span-2" hint="Vacío = asignación automática según tipo de solicitud">
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Automática</option>
            {[...users.values()].filter((u) => !["cliente", "afiliado"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
