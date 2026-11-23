"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowRight, Bot, Briefcase, CalendarClock, CheckCircle2, Clock, FileText, Handshake, Inbox, RefreshCcw, ShieldAlert, BotMessageSquare, Wallet,
} from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { useSession } from "@/store/session";
import { toggleTask } from "@/services/cases";
import { CASE_CATEGORY, CASE_STATUS, PIPELINE, PRIORITY, ROLE_META } from "@/domain/constants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KpiCard, PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { UserChip } from "@/components/domain/chips";
import { AXIS, ChartTooltip, GRID, SERIES } from "@/components/charts/chart-kit";
import { cn, daysUntil, fmtDate, fromNow, hoursSince, money, moneyShort } from "@/lib/utils";

const MONTHS = ["jun", "jul", "ago", "sep", "oct", "nov"];
const BASE_PREMIUM = [38, 42, 40, 47, 51, 56].map((x) => x * 1_000_000);

export default function DashboardPage() {
  const router = useRouter();
  const { user, tenant } = useCurrent();
  const setCopilot = useSession((s) => s.setCopilot);
  const cases = useScoped("cases");
  const policies = useScoped("policies");
  const opportunities = useScoped("opportunities");
  const tasks = useScoped("tasks");
  const actions = useScoped("aiActions");
  const installments = useScoped("installments");
  const commissions = useScoped("commissions");
  const quotes = useScoped("quoteRequests");
  const convs = useScoped("conversations");
  const claims = useScoped("claims");
  const { clients } = useLookups();

  const m = useMemo(() => {
    const open = cases.filter((c) => !["resuelto", "cerrado"].includes(c.status));
    const overdue = open.filter((c) => new Date(c.dueAt) < new Date());
    const renewals = policies.filter((p) => daysUntil(p.endDate) <= 30 && daysUntil(p.endDate) >= 0);
    const activeOps = opportunities.filter((o) => !["ganado", "perdido"].includes(o.stage));
    const lateInst = installments.filter((i) => !i.paid && new Date(i.dueDate) < new Date());
    const resolved = cases.filter((c) => c.closedAt && Date.now() - new Date(c.closedAt).getTime() < 90 * 864e5);
    const avgHours = resolved.length ? Math.round(resolved.reduce((s, c) => s + (new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime()) / 3.6e6, 0) / resolved.length) : 0;
    return { open, overdue, renewals, activeOps, lateInst, avgHours };
  }, [cases, policies, opportunities, installments]);

  if (!user || !tenant) return null;
  const mine = (id?: string) => id === user.id;
  const role = user.role;

  type K = Parameters<typeof KpiCard>[0];
  const kpis: K[] = (() => {
    const myOpen = m.open.filter((c) => mine(c.assigneeId));
    switch (role) {
      case "asesor":
        return [
          { label: "Mis casos abiertos", value: myOpen.length, icon: <Briefcase />, tone: "blue", hint: `${myOpen.filter((c) => new Date(c.dueAt) < new Date()).length} con SLA vencido`, onClick: () => router.push("/casos?mine=1") },
          { label: "Mis oportunidades activas", value: m.activeOps.filter((o) => mine(o.ownerId)).length, icon: <Handshake />, tone: "violet", hint: moneyShort(m.activeOps.filter((o) => mine(o.ownerId)).reduce((s, o) => s + o.value, 0)) },
          { label: "Cotizaciones en curso", value: quotes.filter((q) => ["solicitada", "ofertas_recibidas", "propuesta_enviada"].includes(q.status)).length, icon: <FileText />, tone: "teal" },
          { label: "Mis tareas pendientes", value: tasks.filter((t) => mine(t.assigneeId) && !t.done).length, icon: <CalendarClock />, tone: "amber", onClick: () => router.push("/comercial/agenda") },
        ];
      case "operaciones":
        return [
          { label: "Casos operativos abiertos", value: myOpen.length, icon: <Briefcase />, tone: "blue", onClick: () => router.push("/casos?mine=1") },
          { label: "Renovaciones ≤ 30 días", value: m.renewals.length, icon: <RefreshCcw />, tone: "amber", onClick: () => router.push("/renovaciones") },
          { label: "Siniestros activos", value: claims.filter((c) => c.status !== "pagado").length, icon: <ShieldAlert />, tone: "red" },
          { label: "Pólizas con discrepancias", value: policies.filter((p) => p.validation.status === "con_discrepancias").length, icon: <AlertTriangle />, tone: "orange", onClick: () => router.push("/polizas") },
        ];
      case "financiero":
        return [
          { label: "Cuotas vencidas", value: m.lateInst.length, icon: <AlertTriangle />, tone: "red", hint: money(m.lateInst.reduce((s, i) => s + i.amount, 0)) },
          { label: "Comisiones por liquidar", value: moneyShort(commissions.filter((c) => c.status !== "liquidada").reduce((s, c) => s + c.amount, 0)), icon: <Wallet />, tone: "amber" },
          { label: "Comisiones liquidadas", value: moneyShort(commissions.filter((c) => c.status === "liquidada").reduce((s, c) => s + c.amount, 0)), icon: <CheckCircle2 />, tone: "green" },
          { label: "Prima administrada", value: moneyShort(policies.reduce((s, p) => s + p.premium, 0)), icon: <FileText />, tone: "blue" },
        ];
      case "supervisor_ia":
        return [
          { label: "Acciones por aprobar", value: actions.filter((a) => a.status === "pendiente").length, icon: <ShieldAlert />, tone: "amber", onClick: () => router.push("/ia/supervision") },
          { label: "Ejecutadas por IA", value: actions.filter((a) => a.status === "ejecutada").length, icon: <Bot />, tone: "green" },
          { label: "Rechazadas", value: actions.filter((a) => a.status === "rechazada").length, icon: <AlertTriangle />, tone: "red" },
          { label: "Conversaciones atendidas por IA", value: convs.filter((c) => c.mode === "ia").length, icon: <BotMessageSquare />, tone: "violet" },
        ];
      case "afiliado":
        return [
          { label: "Mis clientes", value: clients.size ? [...clients.values()].filter((c) => c.sellerId === user.sellerId).length : 0, icon: <Handshake />, tone: "blue" },
          { label: "Pólizas de mi cartera", value: policies.length, icon: <FileText />, tone: "teal" },
          { label: "Mi comisión (participación)", value: money(commissions.reduce((s, c) => s + c.sellerAmount, 0)), icon: <Wallet />, tone: "green" },
          { label: "Oportunidades referidas", value: opportunities.length, icon: <Briefcase />, tone: "violet" },
        ];
      default:
        return [
          { label: "Oportunidades activas", value: m.activeOps.length, delta: 12, hint: moneyShort(m.activeOps.reduce((s, o) => s + o.value, 0)), icon: <Handshake />, tone: "violet", onClick: () => router.push("/comercial/pipeline") },
          { label: "Casos abiertos", value: m.open.length, hint: `${m.overdue.length} con SLA vencido`, icon: <Briefcase />, tone: "blue", onClick: () => router.push("/casos") },
          { label: "Cotizaciones en curso", value: quotes.filter((q) => ["solicitada", "ofertas_recibidas", "propuesta_enviada"].includes(q.status)).length, delta: 8, icon: <FileText />, tone: "teal" },
          { label: "Pólizas vigentes", value: policies.filter((p) => ["vigente", "por_vencer"].includes(p.status)).length, delta: 4, icon: <CheckCircle2 />, tone: "green", onClick: () => router.push("/polizas") },
          { label: "Renovaciones ≤ 30 días", value: m.renewals.length, icon: <RefreshCcw />, tone: "amber", onClick: () => router.push("/renovaciones") },
          { label: "Tiempo medio de atención", value: `${m.avgHours} h`, delta: -6, hint: "casos cerrados", icon: <Clock />, tone: "indigo" },
        ];
    }
  })();

  const premiumSeries = MONTHS.map((mo, i) => ({ mes: mo, prima: BASE_PREMIUM[i] + (i === 5 ? policies.filter((p) => daysUntil(p.startDate) > -30).reduce((s, p) => s + p.premium, 0) : 0) }));
  const byCategory = Object.entries(CASE_CATEGORY).map(([k, v]) => ({ name: v.label, casos: m.open.filter((c) => c.category === k).length })).filter((x) => x.casos > 0).sort((a, b) => b.casos - a.casos);
  const funnel = PIPELINE.filter((s) => s.key !== "perdido").map((s) => ({ name: s.label, valor: opportunities.filter((o) => o.stage === s.key).reduce((a, o) => a + o.value, 0) }));
  const myTasks = tasks.filter((t) => !t.done && (role === "gerencia" || role === "admin" ? true : mine(t.assigneeId))).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 6);
  const recent = [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const alerts = [
    ...m.overdue.slice(0, 4).map((c) => ({ id: c.id, icon: <Clock className="size-4 text-rose-600" />, title: `SLA vencido · ${c.code}`, detail: `${c.title} · ${hoursSince(c.dueAt)} h de retraso`, href: `/casos/${c.id}` })),
    ...m.renewals.map((p) => ({ id: p.id, icon: <RefreshCcw className="size-4 text-amber-600" />, title: `Vence en ${daysUntil(p.endDate)} días · ${p.number}`, detail: clients.get(p.clientId)?.name ?? "", href: `/polizas/${p.id}` })),
    ...m.lateInst.slice(0, 3).map((i) => ({ id: i.id, icon: <Wallet className="size-4 text-orange-600" />, title: `Cuota ${i.number} vencida`, detail: `${money(i.amount)} · ${fmtDate(i.dueDate)}`, href: `/polizas/${i.policyId}` })),
  ];
  const pending = actions.filter((a) => a.status === "pendiente");
  const showCharts = ["gerencia", "admin", "asesor", "financiero"].includes(role);
  const hour = new Date().getHours();

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={<><Badge tone={ROLE_META[role].tone}>{ROLE_META[role].label}</Badge><span>{tenant.name}</span></>}
        title={`${hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"}, ${user.name.split(" ")[0]}`}
        description="Resumen de la operación comercial y operativa."
        actions={
          <>
            <Link href="/bandeja" className={buttonVariants({ variant: "secondary" })}><Inbox /> Bandeja</Link>
            <Button variant="ai" onClick={() => setCopilot(true)}><BotMessageSquare /> Preguntar a la IA</Button>
          </>
        }
      />

      <div className={cn("grid gap-4", kpis.length > 4 ? "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" : "sm:grid-cols-2 xl:grid-cols-4")}>
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {pending.length > 0 && (role === "gerencia" || role === "admin" || role === "supervisor_ia") && (
        <Link href="/ia/supervision" className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 transition hover:shadow-sm">
          <div className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-700"><Bot className="size-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">{pending.length} acciones de IA esperan aprobación humana</p>
            <p className="text-xs text-amber-800/80">{pending.slice(0, 2).map((a) => a.title).join(" · ")}</p>
          </div>
          <ArrowRight className="size-4 text-amber-700" />
        </Link>
      )}

      {showCharts && (
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Prima intermediada" description="Últimos 6 meses" action={<Badge tone="green" dot>+9,8% vs. mes anterior</Badge>} />
            <CardContent className="h-64 pt-4">
              <ResponsiveContainer>
                <AreaChart data={premiumSeries} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="gPrima" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="mes" {...AXIS} />
                  <YAxis {...AXIS} tickFormatter={(v) => moneyShort(v)} />
                  <Tooltip content={<ChartTooltip format={money} />} cursor={{ stroke: "#cbd5e1" }} />
                  <Area type="monotone" dataKey="prima" name="Prima" stroke={SERIES[0]} strokeWidth={2} fill="url(#gPrima)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Casos abiertos por tipo" description="Clasificación de solicitudes" />
            <CardContent className="h-64 pt-4">
              {byCategory.length ? (
                <ResponsiveContainer>
                  <BarChart data={byCategory} layout="vertical" margin={{ left: 10, right: 16 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="name" {...AXIS} width={120} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="casos" name="Casos" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="Sin casos abiertos" />}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title={role === "gerencia" || role === "admin" ? "Pendientes del equipo" : "Mis pendientes"} icon={<CalendarClock />} action={<Link href="/comercial/agenda" className="text-xs font-medium text-brand-700 hover:underline">Agenda</Link>} />
          <ul className="divide-y">
            {myTasks.length === 0 && <EmptyState title="Todo al día" description="No tienes tareas pendientes." />}
            {myTasks.map((t) => {
              const late = new Date(t.dueAt) < new Date();
              return (
                <li key={t.id} className="flex items-start gap-3 px-5 py-3">
                  <input type="checkbox" className="mt-0.5 size-4 cursor-pointer accent-brand-600" checked={t.done} onChange={() => toggleTask(t.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-snug">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
                      <span className={cn(late && "font-medium text-rose-600")}>{late ? "Vencida " : "Vence "}{fromNow(t.dueAt)}</span>
                      {t.mandatory && <Badge tone="red">Obligatoria</Badge>}
                      {t.origin !== "manual" && <Badge tone="teal">{t.origin === "ia" ? "Propuesta IA" : "Automatización"}</Badge>}
                    </div>
                  </div>
                  {(role === "gerencia" || role === "admin") && <UserChip id={t.assigneeId} showName={false} />}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Casos recientes" icon={<Briefcase />} action={<Link href="/casos" className="text-xs font-medium text-brand-700 hover:underline">Ver todos</Link>} />
          <ul className="divide-y">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/casos/${c.id}`} className="block px-5 py-3 transition hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-medium text-fg-muted">{c.code}</span>
                    <MetaBadge map={CASE_STATUS} value={c.status} />
                  </div>
                  <p className="mt-1 truncate text-[13px] font-medium">{c.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-muted">
                    <span className={cn("size-1.5 rounded-full", { baja: "bg-slate-400", media: "bg-blue-500", alta: "bg-amber-500", critica: "bg-rose-500" }[c.priority])} />
                    {PRIORITY[c.priority].label} · {fromNow(c.updatedAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Alertas" icon={<AlertTriangle />} description="Vencimientos y pagos pendientes" />
          <ul className="divide-y">
            {alerts.length === 0 && <EmptyState title="Sin alertas" />}
            {alerts.slice(0, 7).map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                  <span className="mt-0.5">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{a.title}</p>
                    <p className="truncate text-[11px] text-fg-muted">{a.detail}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {showCharts && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Embudo comercial" description="Prima estimada por etapa del pipeline" action={<Link href="/comercial/pipeline" className="text-xs font-medium text-brand-700 hover:underline">Pipeline</Link>} />
            <CardContent className="h-72 pt-4">
              <ResponsiveContainer>
                <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid stroke="#eef1f6" horizontal={false} />
                  <XAxis type="number" {...AXIS} tickFormatter={(v) => moneyShort(v)} />
                  <YAxis type="category" dataKey="name" {...AXIS} width={118} interval={0} />
                  <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="valor" name="Prima estimada" radius={[0, 4, 4, 0]} barSize={14}>
                    {funnel.map((f) => <Cell key={f.name} fill={f.name === "Ganado" ? SERIES[2] : SERIES[0]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Próximas renovaciones" icon={<RefreshCcw />} action={<Link href="/renovaciones" className="text-xs font-medium text-brand-700 hover:underline">Gestionar</Link>} />
            <ul className="divide-y">
              {policies.filter((p) => daysUntil(p.endDate) >= 0).sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 5).map((p) => {
                const d = daysUntil(p.endDate);
                return (
                  <li key={p.id}>
                    <Link href={`/polizas/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className={cn("grid size-11 shrink-0 place-items-center rounded-lg text-center leading-none", d <= 15 ? "bg-rose-50 text-rose-700" : d <= 30 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600")}>
                        <span><b className="block text-sm">{d}</b><span className="text-[9px]">días</span></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{p.insuredItem}</p>
                        <p className="truncate text-[11px] text-fg-muted">{p.number}</p>
                      </div>
                      <span className="hidden max-w-[160px] truncate text-xs text-fg-muted sm:block">{clients.get(p.clientId)?.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
