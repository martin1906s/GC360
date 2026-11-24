"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, FileText, Handshake, Mail, MapPin, MessageCircle, Phone, Plus, BotMessageSquare, User, Wallet } from "lucide-react";
import { useCurrent, useLookups, useRecord, useScoped } from "@/hooks/use-data";
import { useSession } from "@/store/session";
import { CASE_STATUS, PIPELINE, POLICY_STATUS } from "@/domain/constants";
import { Guard, NotFoundInTenant } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, Stat, Tabs, Timeline } from "@/components/ui/misc";
import { ChannelIcon, InsurerChip, LineName, UserChip } from "@/components/domain/chips";
import { NewCaseModal } from "@/components/domain/new-case-modal";
import { daysUntil, fmtDate, fmtDateTime, fromNow, money } from "@/lib/utils";

type Tab = "actividad" | "casos" | "polizas" | "oportunidades" | "comunicaciones" | "documentos";

export default function ClientDetailPage() {
  return <Guard perm="crm.view"><ClientDetail /></Guard>;
}

function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { can } = useCurrent();
  const { sellers } = useLookups();
  const setCopilot = useSession((s) => s.setCopilot);
  const client = useRecord("clients", id);
  const cases = useScoped("cases");
  const policies = useScoped("policies");
  const opps = useScoped("opportunities");
  const convs = useScoped("conversations");
  const docs = useScoped("documents");
  const events = useScoped("events");
  const installments = useScoped("installments");
  const offers = useScoped("offers");
  const [tab, setTab] = useState<Tab>("actividad");
  const [newCase, setNewCase] = useState(false);

  const my = useMemo(() => {
    const cs = cases.filter((c) => c.clientId === id);
    const caseIds = new Set(cs.map((c) => c.id));
    const pols = policies.filter((p) => p.clientId === id);
    const polIds = new Set(pols.map((p) => p.id));
    return {
      cases: cs,
      policies: pols,
      opps: opps.filter((o) => o.clientId === id),
      convs: convs.filter((c) => c.clientId === id),
      docs: docs.filter((d) => d.clientId === id || (d.caseId && caseIds.has(d.caseId))),
      events: events.filter((e) => e.entityId === id || (e.caseId && caseIds.has(e.caseId))).sort((a, b) => b.at.localeCompare(a.at)),
      balance: installments.filter((i) => polIds.has(i.policyId) && !i.paid).reduce((s, i) => s + i.amount, 0),
      late: installments.filter((i) => polIds.has(i.policyId) && !i.paid && new Date(i.dueDate) < new Date()).length,
      quotes: offers.filter((o) => caseIds.has(o.caseId)).length,
    };
  }, [cases, policies, opps, convs, docs, events, installments, offers, id]);

  if (!client) return <NotFoundInTenant entity="cliente" />;

  return (
    <div className="animate-fade-in">
      <Link href="/crm/clientes" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-3.5" /> Clientes</Link>

      <Card className="mb-5 overflow-hidden">
        <div className="h-20 bg-ink-900" />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <div className="-mt-9 grid size-[72px] place-items-center rounded-xl border-4 border-white bg-slate-900 text-white shadow-lg">
            {client.type === "empresa" ? <Building2 className="size-8" /> : <User className="size-8" />}
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
              <Badge tone={client.status === "cliente" ? "green" : "blue"} dot>{client.status === "cliente" ? "Cliente" : "Prospecto"}</Badge>
              <Badge tone="indigo">{client.segment}</Badge>
              {client.tags.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fg-muted">
              <span>{client.docType} {client.docNumber}</span>
              <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{client.email || "—"}</span>
              <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{client.phone || "—"}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{client.city}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {can("ai.use") && <Button variant="ai" onClick={() => setCopilot(true)}><BotMessageSquare /> Resumen IA</Button>}
            {can("cases.edit") && <Button onClick={() => setNewCase(true)}><Plus /> Nuevo caso</Button>}
          </div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <KpiCard label="Pólizas" value={my.policies.length} icon={<FileText />} tone="green" hint={my.policies.length ? money(my.policies.reduce((s, p) => s + p.premium, 0)) : undefined} />
        <KpiCard label="Casos" value={my.cases.length} icon={<Briefcase />} tone="blue" hint={`${my.cases.filter((c) => !["resuelto", "cerrado"].includes(c.status)).length} abiertos`} />
        <KpiCard label="Oportunidades" value={my.opps.length} icon={<Handshake />} tone="teal" />
        <KpiCard label="Cotizaciones" value={my.quotes} icon={<FileText />} tone="teal" />
        <KpiCard label="Saldo de cartera" value={money(my.balance)} icon={<Wallet />} tone={my.late ? "red" : "slate"} hint={my.late ? `${my.late} cuota(s) vencida(s)` : "al día"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0">
          <Tabs className="px-3" value={tab} onChange={setTab} tabs={[
            { key: "actividad", label: "Actividad" },
            { key: "casos", label: "Casos", count: my.cases.length },
            { key: "polizas", label: "Pólizas", count: my.policies.length },
            { key: "oportunidades", label: "Oportunidades", count: my.opps.length },
            { key: "comunicaciones", label: "Comunicaciones", count: my.convs.length },
            { key: "documentos", label: "Documentos", count: my.docs.length },
          ]} />
          <CardContent>
            {tab === "actividad" && (my.events.length ? <Timeline items={my.events.slice(0, 25).map((e) => ({ id: e.id, at: e.at, title: e.action, body: e.detail, actor: e.actorName, actorType: e.actorType }))} format={fmtDateTime} /> : <EmptyState title="Sin actividad registrada" />)}
            {tab === "casos" && (
              <ul className="divide-y rounded-lg border">
                {my.cases.length === 0 && <EmptyState title="Sin casos" />}
                {my.cases.map((c) => (
                  <li key={c.id}><Link href={`/casos/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <ChannelIcon channel={c.channel} />
                    <div className="min-w-0 flex-1"><p className="font-mono text-[11px] text-fg-muted">{c.code}</p><p className="truncate text-[13px] font-medium">{c.title}</p></div>
                    <MetaBadge map={CASE_STATUS} value={c.status} />
                  </Link></li>
                ))}
              </ul>
            )}
            {tab === "polizas" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {my.policies.length === 0 && <EmptyState title="Sin pólizas" />}
                {my.policies.map((p) => (
                  <Link key={p.id} href={`/polizas/${p.id}`} className="rounded-lg border p-4 transition hover:border-brand-300">
                    <div className="flex items-center justify-between"><InsurerChip id={p.insurerId} /><MetaBadge map={POLICY_STATUS} value={p.status} /></div>
                    <p className="mt-2 text-[13px] font-medium">{p.insuredItem}</p>
                    <p className="font-mono text-[11px] text-fg-muted">{p.number}</p>
                    <div className="mt-2 flex justify-between text-xs"><span className="text-fg-muted"><LineName id={p.lineId} /></span><span>Vence {fmtDate(p.endDate)} ({daysUntil(p.endDate)} d)</span></div>
                  </Link>
                ))}
              </div>
            )}
            {tab === "oportunidades" && (
              <ul className="divide-y rounded-lg border">
                {my.opps.length === 0 && <EmptyState title="Sin oportunidades" />}
                {my.opps.map((o) => { const st = PIPELINE.find((s) => s.key === o.stage)!; return (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{o.title}</p><p className="text-[11px] text-fg-muted">Próxima acción: {o.nextAction} · {fmtDate(o.nextActionDate)}</p></div>
                    <span className="text-[13px] tabular-nums">{money(o.value)}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </li>
                ); })}
              </ul>
            )}
            {tab === "comunicaciones" && (
              <ul className="divide-y rounded-lg border">
                {my.convs.length === 0 && <EmptyState icon={<MessageCircle />} title="Sin conversaciones" />}
                {my.convs.map((c) => (
                  <li key={c.id}><Link href={`/bandeja?c=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <ChannelIcon channel={c.channel} />
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{c.subject ?? c.contactHandle}</p><p className="text-[11px] text-fg-muted">Último mensaje {fromNow(c.lastMessageAt)} · {c.mode === "ia" ? "Atendida por IA" : "Atención humana"}</p></div>
                  </Link></li>
                ))}
              </ul>
            )}
            {tab === "documentos" && (
              <ul className="divide-y rounded-lg border">
                {my.docs.length === 0 && <EmptyState title="Sin documentos" />}
                {my.docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3"><FileText className="size-4 text-fg-subtle" /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{d.name}</p><p className="text-[11px] text-fg-muted">v{d.version} · {d.kind} · {fmtDate(d.at)}</p></div><Badge tone={d.validation === "validado" ? "green" : "amber"}>{d.validation}</Badge></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Información" />
            <CardContent className="grid grid-cols-2 gap-4">
              <Stat label="Ejecutivo" value={<UserChip id={client.ownerId} />} className="col-span-2" />
              <Stat label="Origen" value={client.source} />
              <Stat label="Alta" value={fmtDate(client.createdAt)} />
              {client.sellerId && <Stat label="Afiliado / vendedor" value={sellers.get(client.sellerId)?.name} className="col-span-2" />}
            </CardContent>
          </Card>
          {client.contacts && (
            <Card>
              <CardHeader title="Contactos" />
              <ul className="divide-y">
                {client.contacts.map((ct) => (
                  <li key={ct.email} className="px-5 py-3"><p className="text-[13px] font-medium">{ct.name}</p><p className="text-[11px] text-fg-muted">{ct.role} · {ct.phone}</p><p className="text-[11px] text-fg-muted">{ct.email}</p></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
      <NewCaseModal open={newCase} onClose={() => setNewCase(false)} clientId={client.id} />
    </div>
  );
}
