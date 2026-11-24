"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, Check, CheckCheck, FileText, Mail, MapPin, Phone, Plus, Printer, RotateCcw, Star, X } from "lucide-react";
import { useCurrent } from "@/hooks/use-data";
import { useDemoState } from "@/hooks/use-demo-state";
import { EMPLOYEES, EMPLOYEE_PROFILES, LEAVE_REQUESTS, NOVELTY_META, PAYROLL_NOVELTIES, type PayrollNovelty, type PayrollNoveltyType } from "@/data/erp-demo";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, KpiCard, Progress, Stat, Tabs } from "@/components/ui/misc";
import { Modal, Sheet } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { cn, fmtDate, fmtDateTime, money, moneyShort, sleep } from "@/lib/utils";

type Employee = (typeof EMPLOYEES)[number];
const yearsSince = (d: string) => Math.max(0, (Date.now() - new Date(d).getTime()) / (365.25 * 86400000));
const age = (d: string) => Math.floor(yearsSince(d));

/* ═════════════ Recursos humanos ═════════════ */

export function People() {
  const [requests, setRequests] = useDemoState("hr-leaves-v1", LEAVE_REQUESTS);
  const [selected, setSelected] = useState<Employee | null>(null);
  const decide = (id: string, ok: boolean) => { setRequests((xs) => xs.map((x) => (x.id === id ? { ...x, status: ok ? "aprobada" : "rechazada" } : x))); toast.success(ok ? "Solicitud aprobada" : "Solicitud rechazada"); };

  const avgTenure = EMPLOYEES.reduce((s, e) => s + yearsSince(e.hired), 0) / EMPLOYEES.length;
  const monthly = EMPLOYEES.reduce((s, e) => s + e.salary, 0);
  const avgScore = EMPLOYEES.reduce((s, e) => s + EMPLOYEE_PROFILES[e.id].reviews[0].score, 0) / EMPLOYEES.length;
  const byArea = Object.entries(EMPLOYEES.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.area]: (acc[e.area] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  const cols: Column<Employee>[] = [
    { key: "n", header: "Colaborador", sort: (e) => e.name, cell: (e) => <div className="flex items-center gap-2.5"><Avatar name={e.name} size="sm" color="#475569" /><div><p className="text-[13px] font-medium">{e.name}</p><p className="text-[11px] text-fg-muted">{e.role}</p></div></div> },
    { key: "a", header: "Área", cell: (e) => <span className="text-[13px]">{e.area}</span>, hide: "md" },
    { key: "c", header: "Contrato", cell: (e) => <span className="text-[13px]">{e.contract}</span>, hide: "xl" },
    { key: "h", header: "Antigüedad", sort: (e) => e.hired, cell: (e) => <span className="text-[13px]">{yearsSince(e.hired).toFixed(1)} años</span>, hide: "lg" },
    { key: "v", header: "Vacaciones", align: "right", cell: (e) => `${e.vacationDays} días`, hide: "md" },
    { key: "s", header: "Estado", cell: (e) => <Badge tone={e.status === "Activo" ? "green" : "amber"} dot>{e.status}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Colaboradores" value={EMPLOYEES.length} hint={`${EMPLOYEES.filter((e) => e.contract === "Indefinido").length} indefinidos`} tone="blue" />
        <KpiCard label="En vacaciones" value={EMPLOYEES.filter((e) => e.status === "Vacaciones").length} tone="amber" />
        <KpiCard label="Solicitudes pendientes" value={requests.filter((r) => r.status === "pendiente").length} tone="violet" />
        <KpiCard label="Antigüedad promedio" value={`${avgTenure.toFixed(1)} años`} tone="teal" />
        <KpiCard label="Desempeño promedio" value={`${avgScore.toFixed(1)} / 5`} tone="green" />
        <KpiCard label="Nómina mensual" value={moneyShort(monthly)} hint="Salarios base" tone="slate" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="rounded-lg border">
          <DataTable rows={EMPLOYEES} columns={cols} rowKey={(e) => e.id} dense onRowClick={setSelected} search={(e) => `${e.name} ${e.role} ${e.area}`} searchPlaceholder="Buscar colaborador…" />
          <p className="border-t px-5 py-2.5 text-[11px] text-fg-muted">Toca un colaborador para ver su ficha completa.</p>
        </div>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Solicitudes de ausencia</p>
            <ul className="divide-y rounded-lg border">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{r.employee}</p><p className="text-[11px] text-fg-muted">{r.type} · {fmtDate(r.from)} – {fmtDate(r.to)} · {r.days} día(s)</p></div>
                  {r.status === "pendiente" ? (
                    <div className="flex shrink-0 gap-1"><Button size="icon-sm" variant="ghost" title="Rechazar" onClick={() => decide(r.id, false)}><X /></Button><Button size="icon-sm" variant="success" title="Aprobar" onClick={() => decide(r.id, true)}><Check /></Button></div>
                  ) : <Badge tone={r.status === "aprobada" ? "green" : "red"}>{r.status}</Badge>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Distribución por área</p>
            <ul className="space-y-2.5 rounded-lg border p-4">
              {byArea.map(([area, n]) => (
                <li key={area}>
                  <div className="mb-1 flex justify-between text-[13px]"><span>{area}</span><span className="tabular-nums text-fg-muted">{n}</span></div>
                  <Progress value={(n / EMPLOYEES.length) * 100} tone="blue" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {selected && <EmployeeSheet employee={selected} requests={requests.filter((r) => r.employee === selected.name)} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EmployeeSheet({ employee: e, requests, onClose }: { employee: Employee; requests: typeof LEAVE_REQUESTS; onClose: () => void }) {
  const p = EMPLOYEE_PROFILES[e.id];
  const [tab, setTab] = useState<"info" | "contrato" | "vacaciones" | "desempeno" | "documentos">("info");
  return (
    <Sheet open onClose={onClose} width="max-w-xl" title="Ficha del colaborador" description={e.area}>
      <div className="-mx-5 -mt-5 mb-4 border-b bg-surface-muted px-5 py-5">
        <div className="flex items-center gap-4">
          <Avatar name={e.name} size="lg" color="#2f5079" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-tight">{e.name}</p>
            <p className="text-sm text-fg-muted">{e.role}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5"><Badge tone={e.status === "Activo" ? "green" : "amber"} dot>{e.status}</Badge><Badge>{e.contract}</Badge><Badge tone="blue">{yearsSince(e.hired).toFixed(1)} años en la empresa</Badge></div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-fg-muted">
          <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{p.email}</span>
          <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{p.phone}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{p.city}</span>
        </div>
      </div>

      <Tabs className="-mx-5 mb-5 px-3" value={tab} onChange={setTab} tabs={[{ key: "info", label: "Información" }, { key: "contrato", label: "Contrato" }, { key: "vacaciones", label: "Vacaciones" }, { key: "desempeno", label: "Desempeño" }, { key: "documentos", label: "Documentos" }]} />

      {tab === "info" && (
        <div className="space-y-5">
          <Section title="Datos personales">
            <Stat label="Documento" value={p.doc} />
            <Stat label="Fecha de nacimiento" value={`${fmtDate(p.birth)} (${age(p.birth)} años)`} />
            <Stat label="Dirección" value={`${p.address}, ${p.city}`} className="col-span-2" />
            <Stat label="Contacto de emergencia" value={p.emergency} className="col-span-2" />
          </Section>
          <Section title="Seguridad social">
            <Stat label="EPS" value={p.eps} />
            <Stat label="Fondo de pensiones" value={p.afp} />
            <Stat label="ARL" value={p.arl} />
            <Stat label="Caja de compensación" value={p.ccf} />
          </Section>
          <Section title="Pago de nómina"><Stat label="Cuenta bancaria" value={p.bank} className="col-span-2" /></Section>
        </div>
      )}

      {tab === "contrato" && (
        <div className="space-y-5">
          <Section title="Condiciones actuales">
            <Stat label="Cargo" value={e.role} />
            <Stat label="Área" value={e.area} />
            <Stat label="Tipo de contrato" value={e.contract} />
            <Stat label="Fecha de ingreso" value={fmtDate(e.hired)} />
            <Stat label="Salario mensual" value={money(e.salary)} />
            <Stat label="Jefe inmediato" value={p.manager} />
            <Stat label="Jornada" value={p.schedule} className="col-span-2" />
          </Section>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Historial salarial</p>
            <ul className="divide-y rounded-lg border">
              {[...p.salaryHistory].reverse().map((h) => (
                <li key={h.date} className="flex items-center justify-between px-4 py-2.5 text-[13px]"><div><p className="font-medium">{money(h.salary)}</p><p className="text-[11px] text-fg-muted">{h.reason}</p></div><span className="text-xs text-fg-muted">{fmtDate(h.date)}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "vacaciones" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Días disponibles" value={e.vacationDays} tone="green" />
            <KpiCard label="Días tomados este año" value={p.vacations.filter((v) => v.from.startsWith("2026")).reduce((s, v) => s + v.days, 0)} tone="slate" />
          </div>
          {requests.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Solicitudes</p>
              <ul className="divide-y rounded-lg border">{requests.map((r) => <li key={r.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]"><span>{r.type} · {fmtDate(r.from)} – {fmtDate(r.to)}</span><Badge tone={r.status === "aprobada" ? "green" : r.status === "rechazada" ? "red" : "amber"}>{r.status}</Badge></li>)}</ul>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Historial</p>
            <ul className="divide-y rounded-lg border">{p.vacations.map((v) => <li key={v.from} className="flex items-center justify-between px-4 py-2.5 text-[13px]"><span>{fmtDate(v.from)} – {fmtDate(v.to)}</span><span className="text-fg-muted">{v.days} días</span></li>)}</ul>
          </div>
        </div>
      )}

      {tab === "desempeno" && (
        <ul className="space-y-3">
          {p.reviews.map((r) => (
            <li key={r.period} className="rounded-lg border p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-medium">{r.period}</p><span className="inline-flex items-center gap-1 text-sm font-semibold"><Star className="size-4 fill-amber-400 text-amber-400" />{r.score.toFixed(1)}</span></div>
              <Progress value={(r.score / 5) * 100} tone={r.score >= 4.5 ? "green" : r.score >= 4 ? "blue" : "amber"} className="mt-2" />
              <p className="mt-2 text-[13px] text-fg-muted">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === "documentos" && (
        <ul className="divide-y rounded-lg border">
          {p.documents.map((d) => (
            <li key={d.name} className="flex items-center gap-3 px-4 py-2.5">
              <FileText className="size-4 text-fg-subtle" />
              <span className="flex-1 text-[13px]">{d.name}</span>
              <Badge tone={d.status === "vigente" ? "green" : d.status === "por_vencer" ? "amber" : "red"}>{d.status === "por_vencer" ? "Por vencer" : d.status === "pendiente" ? "Pendiente" : "Vigente"}</Badge>
              {d.status !== "pendiente" && <Button size="xs" variant="ghost" onClick={() => toast("Abriendo documento…", { description: d.name })}>Ver</Button>}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">{title}</p>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4">{children}</dl>
    </div>
  );
}

/* ═════════════ Nómina ═════════════ */

type LineStatus = "pendiente" | "aprobado" | "rechazado" | "pagado";
interface PayrollState {
  stage: "novedades" | "aprobacion" | "pagada";
  novelties: PayrollNovelty[];
  lines: Record<string, { status: LineStatus; reason?: string; by?: string; at?: string }>;
  log: { at: string; by: string; text: string }[];
  bankRef?: string;
}
const INITIAL_PAYROLL: PayrollState = { stage: "novedades", novelties: PAYROLL_NOVELTIES, lines: {}, log: [] };
const SMMLV = 1_423_500;

function computeLine(e: Employee, novelties: PayrollNovelty[]) {
  const mine = novelties.filter((n) => n.employeeId === e.id);
  const earnings = mine.filter((n) => NOVELTY_META[n.type].sign > 0).reduce((s, n) => s + n.amount, 0);
  const extraDeductions = mine.filter((n) => NOVELTY_META[n.type].sign < 0).reduce((s, n) => s + n.amount, 0);
  const transport = e.salary <= 2 * SMMLV ? 200_000 : 0;
  const base = e.salary + earnings;
  const health = Math.round(base * 0.04);
  const pension = Math.round(base * 0.04);
  const deductions = health + pension + extraDeductions;
  return { mine, earnings, transport, health, pension, deductions, gross: e.salary + earnings + transport, net: e.salary + earnings + transport - deductions, employer: Math.round(base * 0.305) };
}

export function Payroll() {
  const { user, can } = useCurrent();
  const [st, setSt] = useDemoState<PayrollState>("payroll-v2", INITIAL_PAYROLL);
  const [busy, setBusy] = useState(false);
  const [novelty, setNovelty] = useState(false);
  const [reject, setReject] = useState<Employee | null>(null);
  const [slip, setSlip] = useState<Employee | null>(null);
  const canApprove = can("finance.edit") || can("automations.edit");
  const who = user?.name ?? "Usuario";

  const rows = useMemo(() => EMPLOYEES.map((e) => ({ e, ...computeLine(e, st.novelties), line: st.lines[e.id] ?? { status: "pendiente" as LineStatus } })), [st]);
  const sum = (f: (r: (typeof rows)[number]) => number, pred: (r: (typeof rows)[number]) => boolean = () => true) => rows.filter(pred).reduce((s, r) => s + f(r), 0);
  const pending = rows.filter((r) => r.line.status === "pendiente");
  const approved = rows.filter((r) => r.line.status === "aprobado" || r.line.status === "pagado");
  const rejected = rows.filter((r) => r.line.status === "rechazado");

  const log = (text: string) => ({ at: new Date().toISOString(), by: who, text });
  const setLine = (id: string, status: LineStatus, reason?: string) => setSt((s) => ({ ...s, lines: { ...s.lines, [id]: { status, reason, by: who, at: new Date().toISOString() } }, log: [log(`${EMPLOYEES.find((e) => e.id === id)?.name}: ${status === "aprobado" ? "pago aprobado" : status === "rechazado" ? `pago rechazado — ${reason}` : "pago reabierto para revisión"}`), ...s.log] }));

  const liquidate = async () => { setBusy(true); await sleep(1000); setSt((s) => ({ ...s, stage: "aprobacion", log: [log(`Nómina liquidada: ${EMPLOYEES.length} colaboradores`), ...s.log] })); setBusy(false); toast.success("Nómina liquidada", { description: "Revisa y aprueba cada pago." }); };
  const approveAll = () => { setSt((s) => ({ ...s, lines: { ...s.lines, ...Object.fromEntries(pending.map((r) => [r.e.id, { status: "aprobado" as LineStatus, by: who, at: new Date().toISOString() }])) }, log: [log(`${pending.length} pagos aprobados en bloque`), ...s.log] })); toast.success(`${pending.length} pagos aprobados`); };
  const pay = async () => {
    setBusy(true); await sleep(1400);
    const ref = `DISP-${Math.floor(Math.random() * 900000 + 100000)}`;
    setSt((s) => ({ ...s, stage: "pagada", bankRef: ref, lines: { ...s.lines, ...Object.fromEntries(approved.map((r) => [r.e.id, { ...s.lines[r.e.id], status: "pagado" as LineStatus }])) }, log: [log(`Archivo de pago ${ref} enviado al banco: ${approved.length} pagos por ${money(sum((r) => r.net, (r) => r.line.status === "aprobado"))}`), ...s.log] }));
    setBusy(false);
    toast.success("Pago enviado al banco", { description: `Referencia ${ref} · nómina electrónica transmitida` });
  };
  const reset = () => { setSt(INITIAL_PAYROLL); toast("Nuevo periodo de nómina abierto"); };

  const actions = (r: (typeof rows)[number]) => (
    <div className="inline-flex items-center gap-1">
      <Button size="xs" variant="ghost" onClick={() => setSlip(r.e)}>Desprendible</Button>
      {st.stage === "aprobacion" && canApprove && r.line.status === "pendiente" && (
        <>
          <Button size="icon-sm" variant="ghost" title="Rechazar pago" onClick={() => setReject(r.e)}><X /></Button>
          <Button size="icon-sm" variant="success" title="Aprobar pago" onClick={() => { setLine(r.e.id, "aprobado"); toast.success(`Pago aprobado: ${r.e.name}`); }}><Check /></Button>
        </>
      )}
      {st.stage === "aprobacion" && canApprove && (r.line.status === "aprobado" || r.line.status === "rechazado") && <Button size="icon-sm" variant="ghost" title="Reabrir para revisión" onClick={() => setLine(r.e.id, "pendiente")}><RotateCcw /></Button>}
    </div>
  );

  const STAGES = [{ k: "novedades", l: "Novedades" }, { k: "aprobacion", l: "Liquidación y aprobación" }, { k: "pagada", l: "Pago" }] as const;
  const stageIdx = STAGES.findIndex((s) => s.k === st.stage);
  const statusBadge = (s: LineStatus) => <Badge tone={s === "aprobado" ? "blue" : s === "pagado" ? "green" : s === "rechazado" ? "red" : "amber"} dot>{s === "aprobado" ? "Aprobado" : s === "pagado" ? "Pagado" : s === "rechazado" ? "Rechazado" : "Por aprobar"}</Badge>;

  return (
    <div className="space-y-5">
      {/* Encabezado del periodo */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-slate-50/60 p-4">
        <div className="min-w-[200px] flex-1"><p className="text-sm font-semibold">Periodo: noviembre 2026 · quincena 2</p><p className="text-xs text-fg-muted">Fecha de pago: 30 nov 2026{st.bankRef ? ` · Referencia ${st.bankRef}` : ""}</p></div>
        <ol className="flex flex-wrap items-center gap-1.5">
          {STAGES.map((s, i) => <li key={s.k} className={cn("rounded-md px-2 py-1 text-xs font-medium", i === stageIdx ? "bg-brand-600 text-white" : i < stageIdx ? "bg-emerald-50 text-emerald-700" : "bg-white text-fg-muted ring-1 ring-border")}>{i + 1}. {s.l}</li>)}
        </ol>
        {st.stage === "novedades" && <><Button variant="secondary" onClick={() => setNovelty(true)}><Plus /> Novedad</Button><Button loading={busy} onClick={liquidate}>Liquidar nómina</Button></>}
        {st.stage === "aprobacion" && (
          <>
            {pending.length > 0 && canApprove && <Button variant="secondary" onClick={approveAll}><CheckCheck /> Aprobar pendientes ({pending.length})</Button>}
            <Button loading={busy} variant="success" disabled={pending.length > 0 || approved.length === 0 || !canApprove} title={pending.length ? "Aprueba o rechaza todos los pagos antes de enviar" : ""} onClick={pay}><Banknote /> Enviar pago al banco</Button>
          </>
        )}
        {st.stage === "pagada" && <Button variant="secondary" onClick={reset}>Nuevo periodo</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Neto total del periodo" value={moneyShort(sum((r) => r.net))} hint={`${EMPLOYEES.length} colaboradores`} tone="blue" />
        <KpiCard label="Aprobado para pago" value={moneyShort(sum((r) => r.net, (r) => r.line.status === "aprobado" || r.line.status === "pagado"))} hint={`${approved.length} pagos`} tone="green" />
        <KpiCard label="Por aprobar" value={pending.length} hint={rejected.length ? `${rejected.length} rechazado(s)` : "Sin rechazos"} tone={pending.length ? "amber" : "slate"} />
        <KpiCard label="Costo total empresa" value={moneyShort(sum((r) => r.net + r.deductions + r.employer))} hint="Incluye aportes del empleador" tone="slate" />
      </div>

      {st.stage === "aprobacion" && !canApprove && <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900">La aprobación de pagos la realiza el área financiera o la gerencia.</p>}

      {/* Detalle por colaborador */}
      <div className="overflow-x-auto rounded-lg border scroll-thin">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"><th className="py-2.5 pl-4 pr-3">Colaborador</th><th className="hidden px-3 text-right lg:table-cell">Salario</th><th className="hidden px-3 text-right md:table-cell">Devengos</th><th className="hidden px-3 text-right md:table-cell">Deducciones</th><th className="px-3 text-right">Neto</th>{st.stage !== "novedades" && <th className="hidden px-3 md:table-cell">Estado</th>}<th className="hidden pr-4 md:table-cell" /></tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.e.id} className={cn(r.line.status === "rechazado" && "bg-rose-50/40")}>
                <td className="py-2.5 pl-4 pr-3">
                  <p className="whitespace-nowrap text-[13px] font-medium">{r.e.name}</p>
                  <p className="whitespace-nowrap text-[11px] text-fg-muted">{r.e.area}{r.mine.length ? ` · ${r.mine.length} novedad(es)` : ""}</p>
                  {r.line.status === "rechazado" && r.line.reason && <p className="mt-0.5 text-[11px] text-rose-700">Motivo: {r.line.reason}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 md:hidden">{st.stage !== "novedades" && statusBadge(r.line.status)}{actions(r)}</div>
                </td>
                <td className="hidden whitespace-nowrap px-3 text-right tabular-nums lg:table-cell">{money(r.e.salary)}</td>
                <td className="hidden whitespace-nowrap px-3 text-right tabular-nums md:table-cell">{money(r.earnings + r.transport)}</td>
                <td className="hidden whitespace-nowrap px-3 text-right tabular-nums text-fg-muted md:table-cell">-{money(r.deductions)}</td>
                <td className="whitespace-nowrap px-3 text-right align-top font-semibold tabular-nums md:align-middle">{money(r.net)}</td>
                {st.stage !== "novedades" && <td className="hidden whitespace-nowrap px-3 md:table-cell">{statusBadge(r.line.status)}</td>}
                <td className="hidden whitespace-nowrap py-2 pr-4 text-right md:table-cell">{actions(r)}                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Novedades del periodo</p>{st.stage === "novedades" && <Button size="xs" variant="ghost" onClick={() => setNovelty(true)}><Plus /> Agregar</Button>}</div>
          <ul className="divide-y rounded-lg border">
            {st.novelties.length === 0 && <li className="px-4 py-4 text-center text-sm text-fg-muted">Sin novedades.</li>}
            {st.novelties.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{EMPLOYEES.find((e) => e.id === n.employeeId)?.name} · {NOVELTY_META[n.type].label}</p><p className="truncate text-[11px] text-fg-muted">{n.detail}</p></div>
                <span className={cn("whitespace-nowrap text-[13px] tabular-nums", NOVELTY_META[n.type].sign < 0 ? "text-rose-600" : "text-emerald-700")}>{NOVELTY_META[n.type].sign < 0 ? "-" : "+"}{money(n.amount)}</span>
                {st.stage === "novedades" && <Button size="icon-sm" variant="ghost" title="Quitar" onClick={() => setSt((s) => ({ ...s, novelties: s.novelties.filter((x) => x.id !== n.id) }))}><X /></Button>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Historial de aprobaciones</p>
          <ul className="divide-y rounded-lg border">
            {st.log.length === 0 && <li className="px-4 py-4 text-center text-sm text-fg-muted">Aún no hay movimientos en este periodo.</li>}
            {st.log.slice(0, 10).map((l, i) => <li key={i} className="px-4 py-2.5"><p className="text-[13px]">{l.text}</p><p className="text-[11px] text-fg-muted">{l.by} · {fmtDateTime(l.at)}</p></li>)}
          </ul>
        </div>
      </div>

      {novelty && <NoveltyModal onClose={() => setNovelty(false)} onSave={(n) => { setSt((s) => ({ ...s, novelties: [n, ...s.novelties], log: [log(`Novedad registrada: ${NOVELTY_META[n.type].label} · ${EMPLOYEES.find((e) => e.id === n.employeeId)?.name}`), ...s.log] })); toast.success("Novedad registrada"); }} />}
      {reject && <RejectModal employee={reject} onClose={() => setReject(null)} onConfirm={(reason) => { setLine(reject.id, "rechazado", reason); toast(`Pago rechazado: ${reject.name}`); setReject(null); }} />}
      {slip && <PayslipModal employee={slip} line={computeLine(slip, st.novelties)} onClose={() => setSlip(null)} />}
    </div>
  );
}

function NoveltyModal({ onClose, onSave }: { onClose: () => void; onSave: (n: PayrollNovelty) => void }) {
  const [f, setF] = useState({ employeeId: EMPLOYEES[0].id, type: "horas_extra" as PayrollNoveltyType, detail: "", amount: "" });
  return (
    <Modal open onClose={onClose} title="Registrar novedad de nómina" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!f.amount} onClick={() => { onSave({ id: `nv${Date.now()}`, employeeId: f.employeeId, type: f.type, detail: f.detail || NOVELTY_META[f.type].label, amount: Number(f.amount) }); onClose(); }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Colaborador" className="sm:col-span-2"><Select value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}>{EMPLOYEES.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
        <Field label="Tipo"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as PayrollNoveltyType })}>{Object.entries(NOVELTY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
        <Field label="Valor (COP)"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Detalle" className="sm:col-span-2"><Input value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} placeholder="Ej. 6 horas extra nocturnas" /></Field>
      </div>
    </Modal>
  );
}

function RejectModal({ employee, onClose, onConfirm }: { employee: Employee; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("Novedad sin soporte");
  const [note, setNote] = useState("");
  return (
    <Modal open onClose={onClose} title={`Rechazar pago de ${employee.name}`} description="El pago no se incluirá en el envío al banco hasta que se revise." footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" onClick={() => onConfirm(note ? `${reason}: ${note}` : reason)}>Rechazar pago</Button></>}>
      <div className="space-y-4">
        <Field label="Motivo"><Select value={reason} onChange={(e) => setReason(e.target.value)}>{["Novedad sin soporte", "Valor de horas extra incorrecto", "Cuenta bancaria por verificar", "Incapacidad pendiente de radicar", "Otro"].map((r) => <option key={r}>{r}</option>)}</Select></Field>
        <Field label="Comentario (opcional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[70px]" /></Field>
      </div>
    </Modal>
  );
}

function PayslipModal({ employee: e, line, onClose }: { employee: Employee; line: ReturnType<typeof computeLine>; onClose: () => void }) {
  const p = EMPLOYEE_PROFILES[e.id];
  const Row = ({ label, value, neg }: { label: string; value: number; neg?: boolean }) => <tr className="border-b last:border-0"><td className="py-1.5">{label}</td><td className={cn("text-right tabular-nums", neg && "text-rose-600")}>{neg ? "-" : ""}{money(value)}</td></tr>;
  return (
    <Modal open onClose={onClose} size="lg" title="Desprendible de pago" description="Noviembre 2026 · quincena 2" footer={<Button variant="secondary" onClick={() => window.print()}><Printer /> Imprimir</Button>}>
      <div className="print-area space-y-4 text-sm">
        <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-slate-50 p-4">
          <div><p className="font-semibold">{e.name}</p><p className="text-xs text-fg-muted">{p.doc} · {e.role}</p></div>
          <div className="text-right text-xs text-fg-muted"><p>{p.bank}</p><p>Fecha de pago: 30 nov 2026</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Devengos</p>
            <table className="w-full"><tbody>
              <Row label="Salario básico" value={e.salary} />
              {line.transport > 0 && <Row label="Auxilio de transporte" value={line.transport} />}
              {line.mine.filter((n) => NOVELTY_META[n.type].sign > 0).map((n) => <Row key={n.id} label={NOVELTY_META[n.type].label} value={n.amount} />)}
            </tbody></table>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Deducciones</p>
            <table className="w-full"><tbody>
              <Row label={`Salud 4% (${p.eps})`} value={line.health} neg />
              <Row label={`Pensión 4% (${p.afp})`} value={line.pension} neg />
              {line.mine.filter((n) => NOVELTY_META[n.type].sign < 0).map((n) => <Row key={n.id} label={NOVELTY_META[n.type].label} value={n.amount} neg />)}
            </tbody></table>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border-2 border-brand-200 bg-brand-50/50 px-4 py-3">
          <span className="font-medium">Neto a pagar</span><span className="text-lg font-semibold tabular-nums">{money(line.net)}</span>
        </div>
      </div>
    </Modal>
  );
}
