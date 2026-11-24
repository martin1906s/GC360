"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download } from "lucide-react";
import { useScoped } from "@/hooks/use-data";
import { POLICY_STATUS } from "@/domain/constants";
import type { Policy } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MetaBadge } from "@/components/ui/badge";
import { KpiCard, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { ClientLink, InsurerChip, LineName } from "@/components/domain/chips";
import { cn, daysUntil, downloadFile, fmtDate, money, moneyShort, toCSV } from "@/lib/utils";

export default function PoliciesPage() {
  return <Guard perm="policies.view"><Policies /></Guard>;
}

function Policies() {
  const router = useRouter();
  const policies = useScoped("policies");
  const insurers = useScoped("insurers");
  const lines = useScoped("lines");
  const [status, setStatus] = useState("all");
  const [ins, setIns] = useState("all");
  const [line, setLine] = useState("all");

  const rows = useMemo(() => policies.filter((p) => (status === "all" || p.status === status) && (ins === "all" || p.insurerId === ins) && (line === "all" || p.lineId === line)), [policies, status, ins, line]);

  const columns: Column<Policy>[] = [
    { key: "num", header: "Póliza", sort: (p) => p.number, cell: (p) => <div className="min-w-[200px]"><p className="font-mono text-xs font-medium">{p.number}</p><p className="max-w-[280px] truncate text-[11px] text-fg-muted" title={p.insuredItem}>{p.insuredItem}</p></div> },
    { key: "client", header: "Cliente", cell: (p) => <div className="max-w-[220px]"><ClientLink id={p.clientId} /></div>, hide: "lg" },
    { key: "ins", header: "Aseguradora", cell: (p) => <InsurerChip id={p.insurerId} /> },
    { key: "line", header: "Ramo", cell: (p) => <span className="text-[13px]"><LineName id={p.lineId} /></span>, hide: "2xl" },
    { key: "prem", header: "Prima", sort: (p) => p.premium, align: "right", cell: (p) => <span className="text-[13px]">{money(p.premium)}</span> },
    { key: "end", header: "Vence", sort: (p) => p.endDate, cell: (p) => { const d = daysUntil(p.endDate); return <div className="text-[13px]"><p>{fmtDate(p.endDate)}</p><p className={cn("text-[11px]", d <= 30 ? "font-medium text-amber-700" : "text-fg-muted")}>{d >= 0 ? `en ${d} días` : "Vencida"}</p></div>; } },
    { key: "st", header: "Estado", cell: (p) => <div className="flex items-center gap-1.5"><MetaBadge map={POLICY_STATUS} value={p.status} />{p.validation.status === "con_discrepancias" && <span title="Discrepancias frente a la oferta"><AlertTriangle className="size-4 text-rose-500" /></span>}</div> },
  ];


  return (
    <div className="animate-fade-in">
      <PageHeader title="Pólizas" description="Pólizas de tus clientes con su vigencia y estado." actions={<Button variant="secondary" onClick={() => downloadFile("polizas.csv", toCSV(rows.map((p) => ({ Número: p.number, Bien: p.insuredItem, Prima: p.premium, Inicio: fmtDate(p.startDate), Fin: fmtDate(p.endDate), Estado: POLICY_STATUS[p.status].label }))))}><Download /> Exportar</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <KpiCard label="Pólizas vigentes" value={policies.filter((p) => ["vigente", "por_vencer"].includes(p.status)).length} tone="green" />
        <KpiCard label="Por vencer (≤30 días)" value={policies.filter((p) => daysUntil(p.endDate) <= 30 && daysUntil(p.endDate) >= 0).length} tone="amber" />
        <KpiCard label="Con discrepancias" value={policies.filter((p) => p.validation.status === "con_discrepancias").length} tone="red" />
        <KpiCard label="Prima administrada" value={moneyShort(policies.reduce((s, p) => s + p.premium, 0))} tone="blue" />
      </div>
      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          onRowClick={(p) => router.push(`/polizas/${p.id}`)}
          search={(p) => `${p.number} ${p.insuredItem}`}
          searchPlaceholder="Número, placa, bien asegurado…"
          toolbar={
            <>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 w-36 text-xs"><option value="all">Todo estado</option>{Object.entries(POLICY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
              <Select value={ins} onChange={(e) => setIns(e.target.value)} className="h-8 w-36 text-xs"><option value="all">Aseguradora</option>{insurers.map((i) => <option key={i.id} value={i.id}>{i.short}</option>)}</Select>
              <Select value={line} onChange={(e) => setLine(e.target.value)} className="h-8 w-40 text-xs"><option value="all">Ramo</option>{lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
            </>
          }
        />
      </Card>
    </div>
  );
}
