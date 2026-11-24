"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { liquidateCommission, markInstallmentPaid } from "@/services/insurance";
import { COMMISSION_STATUS } from "@/domain/constants";
import type { Commission, Installment } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader, Tabs } from "@/components/ui/misc";
import { ClientLink, InsurerChip } from "@/components/domain/chips";
import { AXIS, ChartTooltip, GRID, SERIES } from "@/components/charts/chart-kit";
import { downloadFile, fmtDate, money, moneyShort, pct, toCSV } from "@/lib/utils";

export default function FinancePage() {
  return <Guard perm="finance.view"><Finance /></Guard>;
}

function Finance() {
  const { can } = useCurrent();
  const { insurers, sellers } = useLookups();
  const policies = useScoped("policies");
  const installments = useScoped("installments");
  const commissions = useScoped("commissions");
  const [tab, setTab] = useState<"cartera" | "comisiones">("cartera");
  const pol = (id: string) => policies.find((p) => p.id === id);

  const pending = installments.filter((i) => !i.paid);
  const late = pending.filter((i) => new Date(i.dueDate) < new Date());
  const byInsurer = useMemo(() => [...insurers.values()].map((i) => ({ name: i.short, comision: commissions.filter((c) => c.insurerId === i.id).reduce((s, c) => s + c.amount, 0) })).filter((x) => x.comision > 0), [insurers, commissions]);

  const instCols: Column<Installment>[] = [
    { key: "pol", header: "Póliza", cell: (i) => <Link href={`/polizas/${i.policyId}`} className="font-mono text-xs font-medium hover:text-brand-700">{pol(i.policyId)?.number}</Link> },
    { key: "cli", header: "Cliente", cell: (i) => <div className="max-w-[220px]"><ClientLink id={pol(i.policyId)?.clientId} /></div>, hide: "lg" },
    { key: "n", header: "Cuota", cell: (i) => `${i.number} / ${pol(i.policyId)?.installments}` },
    { key: "due", header: "Vence", sort: (i) => i.dueDate, cell: (i) => <span className="text-[13px]">{fmtDate(i.dueDate)}</span> },
    { key: "amt", header: "Valor", sort: (i) => i.amount, align: "right", cell: (i) => <span className="text-[13px]">{money(i.amount)}</span> },
    { key: "st", header: "Estado", cell: (i) => (new Date(i.dueDate) < new Date() ? <Badge tone="red" dot>Vencida</Badge> : <Badge dot>Pendiente</Badge>) },
    { key: "act", header: "", cell: (i) => can("finance.edit") && <Button size="xs" variant="ghost" onClick={() => { markInstallmentPaid(i.id); toast.success("Pago registrado"); }}>Registrar pago</Button> },
  ];

  const comCols: Column<Commission>[] = [
    { key: "pol", header: "Póliza", cell: (c) => <Link href={`/polizas/${c.policyId}`} className="font-mono text-xs font-medium hover:text-brand-700">{pol(c.policyId)?.number}</Link> },
    { key: "ins", header: "Aseguradora", cell: (c) => <InsurerChip id={c.insurerId} /> },
    { key: "base", header: "Prima base", sort: (c) => c.base, align: "right", cell: (c) => <span className="text-[13px]">{money(c.base)}</span>, hide: "xl" },
    { key: "rate", header: "Tasa", cell: (c) => pct(c.rate) },
    { key: "amt", header: "Comisión", sort: (c) => c.amount, align: "right", cell: (c) => <span className="font-medium">{money(c.amount)}</span> },
    { key: "seller", header: "Afiliado / vendedor", cell: (c) => c.sellerId ? <div className="text-xs"><p>{sellers.get(c.sellerId)?.name}</p><p className="text-fg-muted">{money(c.sellerAmount)}</p></div> : "—", hide: "lg" },
    { key: "period", header: "Periodo", cell: (c) => <span className="text-xs text-fg-muted">{c.period}</span>, hide: "2xl" },
    { key: "st", header: "Estado", cell: (c) => <MetaBadge map={COMMISSION_STATUS} value={c.status} /> },
    { key: "act", header: "", cell: (c) => can("finance.edit") && c.status !== "liquidada" && <Button size="xs" variant="ghost" onClick={() => { liquidateCommission(c.id); toast.success("Comisión marcada como liquidada"); }}>Liquidar</Button> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={"Cartera y comisiones"}
        description="Cuotas pendientes y comisiones de intermediación por póliza, aseguradora y afiliado."
        actions={<Button variant="secondary" onClick={() => downloadFile(`${tab}.csv`, toCSV(tab === "cartera" ? pending.map((i) => ({ Póliza: pol(i.policyId)?.number, Cuota: i.number, Vence: fmtDate(i.dueDate), Valor: i.amount })) : commissions.map((c) => ({ Póliza: pol(c.policyId)?.number, Aseguradora: insurers.get(c.insurerId)?.short, Comisión: c.amount, Estado: c.status }))))}><Download /> Exportar</Button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Saldo de cartera" value={moneyShort(pending.reduce((s, i) => s + i.amount, 0))} tone="blue" hint={`${pending.length} cuotas`} />
        <KpiCard label="Cartera vencida" value={money(late.reduce((s, i) => s + i.amount, 0))} tone="red" hint={`${late.length} cuotas`} />
        <KpiCard label="Comisiones por liquidar" value={moneyShort(commissions.filter((c) => c.status !== "liquidada").reduce((s, c) => s + c.amount, 0))} tone="amber" />
        <KpiCard label="Comisiones liquidadas" value={moneyShort(commissions.filter((c) => c.status === "liquidada").reduce((s, c) => s + c.amount, 0))} tone="green" />
      </div>
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "cartera", label: "Cuotas pendientes", count: pending.length }, { key: "comisiones", label: "Comisiones", count: commissions.length }]} />
          {tab === "cartera" ? <DataTable rows={[...pending].sort((a, b) => a.dueDate.localeCompare(b.dueDate))} columns={instCols} rowKey={(i) => i.id} dense /> : <DataTable rows={commissions} columns={comCols} rowKey={(c) => c.id} dense />}
        </Card>
        <Card className="h-fit">
          <CardHeader title="Comisión por aseguradora" description="Acumulado de pólizas registradas" />
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={byInsurer} margin={{ left: -12, right: 4 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" {...AXIS} />
                <YAxis {...AXIS} tickFormatter={(v) => moneyShort(v)} />
                <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="comision" name="Comisión" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
