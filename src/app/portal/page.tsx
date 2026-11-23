"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, FileText, LogOut, Send, ShieldCheck, UserRound } from "lucide-react";
import { useCurrent, useHydrated, useLookups, useScoped } from "@/hooks/use-data";
import { useSession } from "@/store/session";
import { clientPortalMessage } from "@/services/inbox";
import { CASE_STATUS, POLICY_STATUS } from "@/domain/constants";
import { FullscreenLoader } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, Progress, Tabs } from "@/components/ui/misc";
import { Input } from "@/components/ui/form";
import { cn, daysUntil, fmtDate, fmtTime, money } from "@/lib/utils";

export default function PortalPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { user } = useCurrent();
  useEffect(() => {
    if (hydrated && (!user || user.role !== "cliente")) router.replace(user ? "/" : "/login");
  }, [hydrated, user, router]);
  if (!hydrated || !user || user.role !== "cliente") return <FullscreenLoader />;
  return <Portal />;
}

type Tab = "polizas" | "solicitudes" | "documentos";

function Portal() {
  const router = useRouter();
  const { user, tenant } = useCurrent();
  const logout = useSession((s) => s.logout);
  const { insurers, lines } = useLookups();
  const policies = useScoped("policies");
  const cases = useScoped("cases");
  const docs = useScoped("documents");
  const installments = useScoped("installments");
  const offers = useScoped("offers");
  const [tab, setTab] = useState<Tab>("polizas");

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="grid size-8 place-items-center rounded-md text-[11px] font-bold text-white" style={{ background: tenant?.brandColor }}>{tenant?.initials}</span>
          <div className="leading-tight"><p className="text-sm font-semibold">{tenant?.name}</p><p className="text-[11px] text-fg-muted">Portal de clientes</p></div>
          <div className="ml-auto flex items-center gap-3">
            <Avatar name={user!.name} color={user!.color} size="sm" />
            <span className="hidden text-sm sm:block">{user!.name}</span>
            <Button size="sm" variant="ghost" onClick={() => { logout(); router.push("/login"); }}><LogOut /> Salir</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {user!.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-fg-muted">Consulta tus pólizas, el estado de tus solicitudes y escríbenos cuando lo necesites.</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-muted"><ShieldCheck className="size-3.5 text-emerald-600" /> Solo ves información propia y de tus pólizas autorizadas.</p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
          <Card className="min-w-0">
            <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "polizas", label: "Mis pólizas", count: policies.length }, { key: "solicitudes", label: "Mis solicitudes", count: cases.length }, { key: "documentos", label: "Documentos", count: docs.length }]} />
            <CardContent>
              {tab === "polizas" && (
                <div className="space-y-4">
                  {policies.length === 0 && <EmptyState title="Aún no tienes pólizas" />}
                  {policies.map((p) => {
                    const inst = installments.filter((i) => i.policyId === p.id);
                    const paid = inst.filter((i) => i.paid).length;
                    const d = daysUntil(p.endDate);
                    return (
                      <div key={p.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div><p className="font-medium">{p.insuredItem}</p><p className="text-xs text-fg-muted">{lines.get(p.lineId)?.name} · {insurers.get(p.insurerId)?.name} · {p.number}</p></div>
                          <MetaBadge map={POLICY_STATUS} value={p.status} />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                          <div><p className="text-[11px] text-fg-muted">Vigencia</p><p>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</p></div>
                          <div><p className="text-[11px] text-fg-muted">Prima</p><p>{money(p.premium)}</p></div>
                          <div><p className="text-[11px] text-fg-muted">Deducible</p><p>{p.deductible}</p></div>
                          <div><p className="text-[11px] text-fg-muted">Cuotas pagadas</p><p>{paid} de {inst.length}</p><Progress value={(paid / Math.max(1, inst.length)) * 100} tone="green" className="mt-1" /></div>
                        </div>
                        {d <= 30 && d >= 0 && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Tu póliza vence en {d} días. Tu asesor está preparando opciones de renovación.</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              {tab === "solicitudes" && (
                <ul className="divide-y rounded-lg border">
                  {cases.length === 0 && <EmptyState title="Sin solicitudes" />}
                  {cases.map((c) => {
                    const of = offers.filter((o) => o.caseId === c.id && o.status !== "descartada");
                    return (
                      <li key={c.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] text-fg-muted">{c.code}</span><MetaBadge map={CASE_STATUS} value={c.status} /></div>
                        <p className="mt-1 text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-fg-muted">Actualizado {fmtDate(c.updatedAt)}{of.length ? ` · ${of.length} ofertas en evaluación` : ""}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              {tab === "documentos" && (
                <ul className="divide-y rounded-lg border">
                  {docs.length === 0 && <EmptyState title="Sin documentos" />}
                  {docs.map((d) => <li key={d.id} className="flex items-center gap-3 px-4 py-3"><FileText className="size-4 text-fg-subtle" /><span className="flex-1 truncate text-[13px]">{d.name}</span><Button size="xs" variant="ghost" onClick={() => toast("Descargando documento…")}>Descargar</Button></li>)}
                </ul>
              )}
            </CardContent>
          </Card>
          <HelpChat />
        </div>
      </main>
    </div>
  );
}

function HelpChat() {
  const convs = useScoped("conversations");
  const messages = useScoped("messages");
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const conv = convs.find((c) => c.channel === "portal" && c.status === "abierta");
  const thread = useMemo(() => messages.filter((m) => m.conversationId === conv?.id).sort((a, b) => a.at.localeCompare(b.at)), [messages, conv]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length]);
  const send = (t = text) => {
    if (!t.trim()) return;
    clientPortalMessage(t);
    setText("");
  };
  return (
    <Card className="flex h-[560px] flex-col">
      <CardHeader title="Ayuda y nuevas solicitudes" description={conv?.mode === "humano" ? "Te atiende un asesor" : "Asistente virtual 24/7 · puedes pedir un asesor en cualquier momento"} />
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4 scroll-thin">
        {thread.length === 0 && <p className="text-center text-sm text-fg-muted">Escríbenos: cotizaciones, certificados, siniestros o dudas sobre tu póliza.</p>}
        {thread.map((m) => (
          <div key={m.id} className={cn("flex", m.direction === "in" && "justify-end")}>
            <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-[13px]", m.direction === "in" ? "bg-brand-600 text-white" : "border bg-white")}>
              {m.direction === "out" && <p className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-fg-muted">{m.author === "ia" ? <Bot className="size-3" /> : <UserRound className="size-3" />}{m.authorName}</p>}
              {m.body}
              <p className={cn("mt-0.5 text-right text-[10px]", m.direction === "in" ? "text-white/70" : "text-fg-subtle")}>{fmtTime(m.at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="border-t p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {["Necesito un certificado de mi póliza", "Quiero cotizar seguro de hogar", "Quiero hablar con un asesor"].map((s) => <button key={s} onClick={() => send(s)} className="rounded-md border px-2 py-1 text-[11px] text-fg-muted hover:bg-slate-50">{s}</button>)}
        </div>
        <div className="flex gap-2"><Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Escribe tu mensaje…" /><Button onClick={() => send()}><Send /></Button></div>
        {conv?.mode === "humano" && <Badge tone="blue" className="mt-2">Transferido a asesor humano · historial conservado</Badge>}
      </div>
    </Card>
  );
}
