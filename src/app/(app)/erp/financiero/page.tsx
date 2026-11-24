"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Banknote, BookText, CheckCircle2, FileCheck2, FileText, HandCoins, Landmark, Printer, Receipt, Scale, Upload, Wand2 } from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { useDemoState } from "@/hooks/use-demo-state";
import { BANK_ACCOUNTS, BANK_MOVEMENTS, CASHFLOW, CHART_OF_ACCOUNTS, PAYABLES } from "@/data/erp-demo";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader, Tabs } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/form";
import { InsurerChip } from "@/components/domain/chips";
import { AXIS, ChartTooltip, GRID, Legend, SERIES } from "@/components/charts/chart-kit";
import { cn, fmtDate, money, moneyShort, sleep } from "@/lib/utils";

type Tab = "facturacion" | "contabilidad" | "conciliacion" | "tesoreria" | "pagar" | "recaudos";
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "facturacion", label: "Facturación electrónica", icon: Receipt },
  { key: "contabilidad", label: "Contabilidad", icon: BookText },
  { key: "conciliacion", label: "Conciliación", icon: Scale },
  { key: "tesoreria", label: "Tesorería", icon: Landmark },
  { key: "pagar", label: "Cuentas por pagar", icon: Banknote },
  { key: "recaudos", label: "Recaudos", icon: FileCheck2 },
];

export default function ErpFinancePage() {
  return (
    <Guard perm="erp.view">
      <Suspense>
        <ErpFinance />
      </Suspense>
    </Guard>
  );
}

function ErpFinance() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("m") as Tab) || "facturacion");
  return (
    <div className="animate-fade-in">
      <PageHeader title="Contabilidad y tesorería" description="Facturación, contabilidad, conciliación con aseguradoras, bancos, pagos y recaudos." />
      <FinanceSummary onOpen={setTab} />
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ key: t.key, label: <span className="flex items-center gap-1.5"><t.icon className="size-4" />{t.label}</span> }))} />
        <CardContent>
          {tab === "facturacion" && <Invoicing />}
          {tab === "contabilidad" && <Accounting />}
          {tab === "conciliacion" && <Reconciliation />}
          {tab === "tesoreria" && <Treasury />}
          {tab === "pagar" && <Payables />}
          {tab === "recaudos" && <Collections />}
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Resumen del módulo ───────── */

function FinanceSummary({ onOpen }: { onOpen: (t: Tab) => void }) {
  const [invoices] = useInvoices();
  const [payables] = useDemoState("cxp-v1", PAYABLES);
  const installments = useScoped("installments");
  const billed = invoices.filter((i) => i.status !== "pendiente").reduce((s, i) => s + i.subtotal * 1.19, 0);
  const toBill = invoices.filter((i) => i.status === "pendiente");
  const cash = BANK_ACCOUNTS.reduce((s, b) => s + b.balance, 0);
  const due = payables.filter((p) => !["pagada", "programada"].includes(p.status));
  const late = installments.filter((i) => !i.paid && new Date(i.dueDate) < new Date());
  const netFlow = CASHFLOW.reduce((s, w) => s + w.ingresos - w.egresos, 0);
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5 max-md:[&>*:last-child:nth-child(odd)]:col-span-2">
      <KpiCard label="Facturado (con IVA)" value={moneyShort(billed)} hint={`${toBill.length} comisiones por facturar`} icon={<Receipt />} tone="green" onClick={() => onOpen("facturacion")} />
      <KpiCard label="Disponible en bancos" value={moneyShort(cash)} hint={`${BANK_ACCOUNTS.length} cuentas`} icon={<Landmark />} tone="blue" onClick={() => onOpen("tesoreria")} />
      <KpiCard label="Flujo neto 6 semanas" value={moneyShort(netFlow)} hint="Proyección" delta={netFlow >= 0 ? 6 : -6} icon={<Scale />} tone={netFlow >= 0 ? "teal" : "red"} onClick={() => onOpen("tesoreria")} />
      <KpiCard label="Cuentas por pagar" value={moneyShort(due.reduce((s, p) => s + p.amount, 0))} hint={`${due.length} pendientes`} icon={<Banknote />} tone="amber" onClick={() => onOpen("pagar")} />
      <KpiCard label="Cartera vencida" value={moneyShort(late.reduce((s, i) => s + i.amount, 0))} hint={`${late.length} cuotas`} icon={<AlertTriangle />} tone={late.length ? "red" : "slate"} onClick={() => onOpen("recaudos")} />
    </div>
  );
}

/* ───────── Facturación electrónica ───────── */

interface Invoice { id: string; number: string; commissionId: string; insurerId: string; date: string; subtotal: number; status: "pendiente" | "emitida" | "aceptada"; cufe?: string }

function useInvoices() {
  const commissions = useScoped("commissions");
  const initial = useMemo<Invoice[]>(() => commissions.map((c, i) => ({
    id: `fe_${c.id}`, number: c.status === "liquidada" ? `FE-${String(1180 + i).padStart(5, "0")}` : "—", commissionId: c.id, insurerId: c.insurerId,
    date: new Date().toISOString(), subtotal: c.amount, status: c.status === "liquidada" ? "aceptada" : "pendiente",
    cufe: c.status === "liquidada" ? `${c.id.replace(/\W/g, "")}a91f3c7e`.padEnd(24, "0") : undefined,
  })), [commissions]);
  return useDemoState<Invoice[]>("fe-v1", initial);
}

function Invoicing() {
  const { tenant } = useCurrent();
  const { insurers } = useLookups();
  const [invoices, setInvoices] = useInvoices();
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [sending, setSending] = useState(false);

  const emit = async (inv: Invoice) => {
    setSending(true);
    await sleep(1200);
    const n = `FE-${String(1180 + invoices.filter((x) => x.status !== "pendiente").length + 3).padStart(5, "0")}`;
    const cufe = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setInvoices((xs) => xs.map((x) => (x.id === inv.id ? { ...x, number: n, status: "aceptada", cufe, date: new Date().toISOString() } : x)));
    setSending(false);
    setPreview(null);
    toast.success(`Factura ${n} emitida y aceptada por la DIAN`, { description: `CUFE ${cufe.slice(0, 12)}…` });
  };

  const cols: Column<Invoice>[] = [
    { key: "num", header: "Factura", cell: (i) => <span className="font-mono text-xs font-medium">{i.number}</span> },
    { key: "ins", header: "Cliente (aseguradora)", cell: (i) => <InsurerChip id={i.insurerId} /> },
    { key: "date", header: "Fecha", cell: (i) => (i.status === "pendiente" ? "—" : fmtDate(i.date)), hide: "lg" },
    { key: "sub", header: "Subtotal", align: "right", cell: (i) => money(i.subtotal) },
    { key: "iva", header: "IVA 19%", align: "right", cell: (i) => money(i.subtotal * 0.19), hide: "xl" },
    { key: "tot", header: "Total", align: "right", cell: (i) => <b className="font-semibold">{money(i.subtotal * 1.19)}</b> },
    { key: "st", header: "Estado DIAN", cell: (i) => (i.status === "aceptada" ? <Badge tone="green" dot>Aceptada</Badge> : <Badge tone="amber" dot>Por facturar</Badge>) },
    { key: "act", header: "", cell: (i) => <Button size="xs" variant={i.status === "pendiente" ? "primary" : "ghost"} onClick={() => setPreview(i)}>{i.status === "pendiente" ? "Emitir" : "Ver"}</Button> },
  ];
  const pending = invoices.filter((i) => i.status === "pendiente");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <KpiCard label="Facturado (total con IVA)" value={moneyShort(invoices.filter((i) => i.status !== "pendiente").reduce((s, i) => s + i.subtotal * 1.19, 0))} tone="green" />
        <KpiCard label="Comisiones por facturar" value={pending.length} hint={money(pending.reduce((s, i) => s + i.subtotal, 0))} tone="amber" />
        <KpiCard label="Rechazos DIAN" value={0} tone="slate" hint="Últimos 30 días" />
      </div>
      <div className="rounded-lg border"><DataTable rows={invoices} columns={cols} rowKey={(i) => i.id} dense /></div>
      {preview && (
        <Modal open onClose={() => setPreview(null)} size="lg" title={preview.status === "pendiente" ? "Emitir factura electrónica" : `Factura ${preview.number}`} description="Factura por comisión de intermediación"
          footer={preview.status === "pendiente" ? <><Button variant="secondary" onClick={() => setPreview(null)}>Cancelar</Button><Button loading={sending} onClick={() => emit(preview)}><Receipt /> Emitir y enviar a la DIAN</Button></> : <Button variant="secondary" onClick={() => window.print()}><Printer /> Imprimir</Button>}>
          <div className="print-area rounded-lg border p-6 text-sm">
            <div className="flex justify-between border-b pb-3">
              <div><p className="font-semibold">{tenant?.legalName}</p><p className="text-xs text-fg-muted">NIT {tenant?.nit} · {tenant?.city}</p></div>
              <div className="text-right"><p className="font-mono font-semibold">{preview.status === "pendiente" ? "Borrador" : preview.number}</p><p className="text-xs text-fg-muted">{fmtDate(preview.date)}</p></div>
            </div>
            <p className="mt-3 text-xs text-fg-muted">Facturar a</p>
            <p className="font-medium">{insurers.get(preview.insurerId)?.name}</p>
            <table className="mt-4 w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-fg-muted"><th className="py-1.5">Concepto</th><th className="text-right">Valor</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="py-2">Comisión de intermediación de seguros</td><td className="text-right">{money(preview.subtotal)}</td></tr>
                <tr><td className="py-1 text-right text-fg-muted">IVA 19%</td><td className="text-right">{money(preview.subtotal * 0.19)}</td></tr>
                <tr><td className="py-1 text-right font-semibold">Total</td><td className="text-right font-semibold">{money(preview.subtotal * 1.19)}</td></tr>
              </tbody>
            </table>
            {preview.cufe && <p className="mt-4 break-all rounded bg-slate-50 p-2 font-mono text-[11px] text-fg-muted">CUFE: {preview.cufe}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ───────── Contabilidad ───────── */

function Accounting() {
  const commissions = useScoped("commissions");
  const policies = useScoped("policies");
  const { insurers } = useLookups();
  const [generated, setGenerated] = useDemoState<string[]>("acc-v1", []);
  const entries = commissions.slice(0, 8).map((c, i) => ({ id: c.id, number: `CC-${String(310 + i).padStart(4, "0")}`, concept: `Causación comisión ${insurers.get(c.insurerId)?.short} · ${policies.find((p) => p.id === c.policyId)?.number}`, amount: c.amount, posted: c.status !== "causada" || generated.includes(c.id) }));
  const totalD = CHART_OF_ACCOUNTS.filter((a) => a.nature === "Débito").reduce((s, a) => s + a.balance, 0);
  const totalC = CHART_OF_ACCOUNTS.filter((a) => a.nature === "Crédito").reduce((s, a) => s + a.balance, 0);
  const income = CHART_OF_ACCOUNTS.find((x) => x.code === "4150")!.balance;
  const expenses = CHART_OF_ACCOUNTS.filter((x) => x.code.startsWith("5")).reduce((s2, x) => s2 + x.balance, 0);
  const pendingEntries = entries.filter((e) => !e.posted).length;
  return (
    <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard label="Ingresos por comisiones" value={moneyShort(income)} hint="Acumulado del año" tone="green" />
      <KpiCard label="Gastos operacionales" value={moneyShort(expenses)} hint="Personal y arriendos" tone="amber" />
      <KpiCard label="Utilidad operacional" value={moneyShort(income - expenses)} hint={`Margen ${Math.round(((income - expenses) / income) * 100)}%`} tone="blue" />
      <KpiCard label="Comprobantes por contabilizar" value={pendingEntries} hint={pendingEntries ? "Causaciones pendientes" : "Todo contabilizado"} tone={pendingEntries ? "violet" : "slate"} />
    </div>
    <div className="grid gap-5 2xl:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-semibold">Comprobantes automáticos desde pólizas</p>
        <ul className="divide-y rounded-lg border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-16 font-mono text-[11px] text-fg-muted">{e.number}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px]">{e.concept}</p><p className="text-[11px] text-fg-muted">Débito 1305 Comisiones por cobrar · Crédito 4150 Ingresos por comisiones</p></div>
              <span className="whitespace-nowrap text-[13px] tabular-nums">{money(e.amount)}</span>
              {e.posted ? <Badge tone="green">Contabilizado</Badge> : <Button size="xs" onClick={() => { setGenerated((g) => [...g, e.id]); toast.success(`Comprobante ${e.number} contabilizado`); }}>Contabilizar</Button>}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Balance de prueba</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"><th className="py-2 pl-4">Cuenta</th><th className="px-3">Nombre</th><th className="px-3 text-right">Débito</th><th className="pr-4 text-right">Crédito</th></tr></thead>
            <tbody className="divide-y">
              {CHART_OF_ACCOUNTS.map((a) => (
                <tr key={a.code}><td className="py-2 pl-4 font-mono text-xs">{a.code}</td><td className="whitespace-nowrap px-3">{a.name}</td><td className="px-3 text-right tabular-nums">{a.nature === "Débito" ? money(a.balance) : ""}</td><td className="pr-4 text-right tabular-nums">{a.nature === "Crédito" ? money(a.balance) : ""}</td></tr>
              ))}
              <tr className="bg-slate-50 font-semibold"><td className="py-2 pl-4" colSpan={2}>Totales</td><td className="px-3 text-right tabular-nums">{money(totalD)}</td><td className="pr-4 text-right tabular-nums">{money(totalC)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}

/* ───────── Conciliación ───────── */

function Reconciliation() {
  const commissions = useScoped("commissions");
  const policies = useScoped("policies");
  const { insurers } = useLookups();
  const [loaded, setLoaded] = useDemoState<boolean>("rec-loaded", false);
  const [approved, setApproved] = useDemoState<string[]>("rec-approved", []);
  const [loading, setLoading] = useState(false);
  const rows = commissions.map((c, i) => {
    const diff = i === 1 ? -Math.round(c.amount * 0.08) : i === 4 ? -c.amount : 0;
    return { ...c, received: loaded ? c.amount + diff : 0, diff, state: !loaded ? "sin_extracto" : diff === 0 ? "conciliado" : diff === -c.amount ? "no_pagado" : "diferencia" };
  });
  const load = async () => {
    setLoading(true);
    await sleep(1400);
    setLoaded(true);
    setLoading(false);
    toast.success("Extractos cargados", { description: `${commissions.length} registros comparados automáticamente` });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-slate-50/60 p-4">
        <Upload className="size-5 text-fg-muted" />
        <div className="flex-1"><p className="text-sm font-medium">Extractos de pago de aseguradoras</p><p className="text-xs text-fg-muted">Cóndor, Ceiba, Atlas y Faro · periodo noviembre 2026</p></div>
        <Button onClick={load} loading={loading} variant={loaded ? "secondary" : "primary"}><Upload /> {loaded ? "Volver a cargar" : "Cargar extractos"}</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Comisión esperada" value={moneyShort(rows.reduce((s2, r) => s2 + r.amount, 0))} hint={`${rows.length} pólizas`} tone="blue" />
        <KpiCard label="Recibido" value={loaded ? moneyShort(rows.reduce((s2, r) => s2 + r.received, 0)) : "—"} hint={loaded ? "Según extractos" : "Carga los extractos"} tone="green" />
        <KpiCard label="Diferencias" value={loaded ? moneyShort(Math.abs(rows.reduce((s2, r) => s2 + r.diff, 0))) : "—"} hint={loaded ? `${rows.filter((r) => r.state === "diferencia").length} con diferencia · ${rows.filter((r) => r.state === "no_pagado").length} sin pago` : ""} tone={loaded ? "red" : "slate"} />
        <KpiCard label="Conciliado" value={loaded ? `${Math.round((rows.filter((r) => r.state === "conciliado").length / Math.max(1, rows.length)) * 100)}%` : "0%"} hint={`${approved.length} reclamaciones enviadas`} tone="teal" />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"><th className="py-2.5 pl-4">Póliza</th><th className="px-3">Aseguradora</th><th className="px-3 text-right">Esperado</th><th className="px-3 text-right">Recibido</th><th className="px-3 text-right">Diferencia</th><th className="pr-4">Resultado</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap py-2.5 pl-4 font-mono text-xs">{policies.find((p) => p.id === r.policyId)?.number}</td>
                <td className="whitespace-nowrap px-3"><InsurerChip id={r.insurerId} /></td>
                <td className="whitespace-nowrap px-3 text-right tabular-nums">{money(r.amount)}</td>
                <td className="whitespace-nowrap px-3 text-right tabular-nums">{loaded ? money(r.received) : "—"}</td>
                <td className={cn("whitespace-nowrap px-3 text-right tabular-nums", r.diff < 0 && loaded && "text-rose-600")}>{loaded ? money(r.diff) : "—"}</td>
                <td className="whitespace-nowrap pr-4">
                  {r.state === "sin_extracto" && <Badge>Sin extracto</Badge>}
                  {r.state === "conciliado" && <Badge tone="green" dot>Conciliado</Badge>}
                  {(r.state === "diferencia" || r.state === "no_pagado") && (approved.includes(r.id) ? <Badge tone="teal">Gestión enviada</Badge> : (
                    <div className="flex items-center gap-2">
                      <Badge tone={r.state === "no_pagado" ? "red" : "amber"} dot>{r.state === "no_pagado" ? "No pagado" : "Diferencia"}</Badge>
                      <Button size="xs" variant="ghost" onClick={() => { setApproved((a) => [...a, r.id]); toast.success("Reclamación enviada a la aseguradora", { description: `${insurers.get(r.insurerId)?.short}: ${money(Math.abs(r.diff))}` }); }}><Wand2 /> Reclamar</Button>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Tesorería ───────── */

function Treasury() {
  const total = BANK_ACCOUNTS.reduce((s, b) => s + b.balance, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Disponible total" value={moneyShort(total)} tone="blue" />
        {BANK_ACCOUNTS.map((b) => <KpiCard key={b.id} label={`${b.bank} · ${b.type}`} value={moneyShort(b.balance)} hint={b.number} tone="slate" />)}
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        <div className="rounded-lg border">
          <CardHeader title="Flujo de caja proyectado" description="Próximas 6 semanas" action={<Legend items={[{ label: "Ingresos", color: SERIES[0] }, { label: "Egresos", color: SERIES[1] }]} />} />
          <div className="h-64 p-4">
            <ResponsiveContainer>
              <BarChart data={CASHFLOW} margin={{ left: -6, right: 8 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="semana" {...AXIS} />
                <YAxis {...AXIS} tickFormatter={(v) => moneyShort(v)} />
                <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="ingresos" name="Ingresos" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="egresos" name="Egresos" fill={SERIES[1]} radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border">
          <CardHeader title="Últimos movimientos" />
          <ul className="divide-y">
            {BANK_MOVEMENTS.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-20 text-xs text-fg-muted">{fmtDate(m.date)}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{m.concept}</span>
                <span className={cn("whitespace-nowrap text-[13px] font-medium tabular-nums", m.amount > 0 ? "text-emerald-700" : "text-fg")}>{m.amount > 0 ? "+" : ""}{money(m.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ───────── Cuentas por pagar ───────── */

function Payables() {
  const { can } = useCurrent();
  const [rows, setRows] = useDemoState("cxp-v1", PAYABLES);
  const LIMIT = 5_000_000;
  const tone = (s: string) => (s === "pagada" ? "green" : s === "programada" ? "teal" : s === "aprobada" ? "blue" : s === "vencida" ? "red" : "amber") as "green";
  const cols: Column<(typeof PAYABLES)[number]>[] = [
    { key: "v", header: "Proveedor", cell: (r) => <div><p className="text-[13px] font-medium">{r.vendor}</p><p className="max-w-[280px] truncate text-[11px] text-fg-muted">{r.concept}</p></div> },
    { key: "c", header: "Categoría", cell: (r) => <span className="text-[13px]">{r.category}</span>, hide: "xl" },
    { key: "d", header: "Vence", sort: (r) => r.dueDate, cell: (r) => <span className="text-[13px]">{fmtDate(r.dueDate)}</span> },
    { key: "a", header: "Valor", align: "right", sort: (r) => r.amount, cell: (r) => money(r.amount) },
    { key: "s", header: "Estado", cell: (r) => <Badge tone={tone(r.status)} dot>{r.status}</Badge> },
    { key: "act", header: "", cell: (r) => {
      if (r.status === "pagada" || r.status === "programada") return null;
      if (r.status !== "aprobada") {
        const needsManager = r.amount > LIMIT && !can("users.manage") && !can("saas.manage") && !can("automations.edit");
        return <Button size="xs" variant="secondary" disabled={needsManager} title={needsManager ? "Valor mayor a $5.000.000: requiere aprobación de gerencia" : ""} onClick={() => { setRows((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: "aprobada" } : x))); toast.success("Pago aprobado"); }}>Aprobar</Button>;
      }
      return <Button size="xs" onClick={() => { setRows((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: "programada" } : x))); toast.success("Pago programado", { description: `${r.vendor} · ${money(r.amount)}` }); }}>Programar pago</Button>;
    } },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <KpiCard label="Por pagar" value={moneyShort(rows.filter((r) => !["pagada", "programada"].includes(r.status)).reduce((s, r) => s + r.amount, 0))} tone="amber" />
        <KpiCard label="Vencidas" value={rows.filter((r) => r.status === "vencida").length} tone="red" />
        <KpiCard label="Programadas" value={rows.filter((r) => r.status === "programada").length} tone="teal" />
      </div>
      <p className="text-xs text-fg-muted">Los pagos mayores a {money(LIMIT)} requieren aprobación de gerencia.</p>
      <div className="rounded-lg border"><DataTable rows={rows} columns={cols} rowKey={(r) => r.id} dense /></div>
    </div>
  );
}

/* ───────── Recaudos ───────── */

function Collections() {
  const policies = useScoped("policies");
  const installments = useScoped("installments");
  const { clients } = useLookups();
  const [received, setReceived] = useDemoState<{ id: string; installmentId: string; method: string; ref: string; at: string }[]>("rec-pay-v1", []);
  const [open, setOpen] = useState<string | null>(null);
  const [method, setMethod] = useState("Transferencia");
  const [ref, setRef] = useState("");
  const pending = installments.filter((i) => !i.paid && !received.some((r) => r.installmentId === i.id)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 10);
  const pol = (id: string) => policies.find((p) => p.id === id);
  const allPending = installments.filter((i) => !i.paid && !received.some((r) => r.installmentId === i.id));
  const overdue = allPending.filter((i) => new Date(i.dueDate) < new Date());
  const collected = received.reduce((s2, r) => s2 + (installments.find((i) => i.id === r.installmentId)?.amount ?? 0), 0);
  const rate = Math.round(((installments.length - allPending.length) / Math.max(1, installments.length)) * 100);
  return (
    <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard label="Por recaudar" value={moneyShort(allPending.reduce((s2, i) => s2 + i.amount, 0))} hint={`${allPending.length} cuotas`} icon={<HandCoins />} tone="blue" />
      <KpiCard label="Cuotas vencidas" value={overdue.length} hint={moneyShort(overdue.reduce((s2, i) => s2 + i.amount, 0))} tone={overdue.length ? "red" : "slate"} />
      <KpiCard label="Recaudado hoy" value={moneyShort(collected)} hint={`${received.length} pagos registrados`} tone="green" />
      <KpiCard label="Tasa de recaudo" value={`${rate}%`} hint="Cuotas pagadas / emitidas" tone="teal" />
    </div>
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-sm font-semibold">Cuotas por recaudar</p>
        <ul className="divide-y rounded-lg border">
          {pending.map((i) => {
            const p = pol(i.policyId);
            const late = new Date(i.dueDate) < new Date();
            return (
              <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{p ? clients.get(p.clientId)?.name : ""}</p><p className="text-[11px] text-fg-muted"><span className="font-mono">{p?.number}</span> · cuota {i.number} · vence {fmtDate(i.dueDate)}</p></div>
                {late && <Badge tone="red">Vencida</Badge>}
                <span className="whitespace-nowrap text-[13px] tabular-nums">{money(i.amount)}</span>
                <Button size="xs" onClick={() => { setOpen(i.id); setRef(`TRX${Math.floor(Math.random() * 900000 + 100000)}`); }}>Registrar</Button>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Recaudos registrados</p>
        {received.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-fg-muted">Aún no hay recaudos en esta sesión.</p> : (
          <ul className="divide-y rounded-lg border">
            {received.map((r) => { const i = installments.find((x) => x.id === r.installmentId); return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5"><CheckCircle2 className="size-4 text-emerald-600" /><div className="min-w-0 flex-1"><p className="text-[13px]">{pol(i?.policyId ?? "")?.number} · cuota {i?.number}</p><p className="text-[11px] text-fg-muted">{r.method} · Ref. {r.ref}</p></div><span className="text-[13px] tabular-nums">{money(i?.amount ?? 0)}</span></li>
            ); })}
          </ul>
        )}
      </div>
      {open && (
        <Modal open onClose={() => setOpen(null)} title="Registrar recaudo" footer={<><Button variant="secondary" onClick={() => setOpen(null)}>Cancelar</Button><Button onClick={() => { setReceived((xs) => [{ id: `r${Date.now()}`, installmentId: open, method, ref, at: new Date().toISOString() }, ...xs]); setOpen(null); toast.success("Recaudo registrado y aplicado a la cuota"); }}><FileText /> Registrar</Button></>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Medio de pago"><Select value={method} onChange={(e) => setMethod(e.target.value)}>{["Transferencia", "PSE", "Tarjeta de crédito", "Consignación", "Efectivo"].map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Referencia"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
    </div>
  );
}
