"use client";

import { useMemo } from "react";
import { useScoped } from "@/hooks/use-data";
import type { Seller } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, KpiCard, PageHeader } from "@/components/ui/misc";
import { fmtDate, money, moneyShort, pct } from "@/lib/utils";

export default function NetworkPage() {
  return <Guard perm="network.view"><Network /></Guard>;
}

const TYPE: Record<Seller["type"], { label: string; tone: "blue" | "orange" | "teal" }> = {
  interno: { label: "Interno", tone: "blue" }, externo: { label: "Externo", tone: "teal" }, afiliado: { label: "Afiliado", tone: "orange" },
};

function Network() {
  const sellers = useScoped("sellers");
  const clients = useScoped("clients");
  const policies = useScoped("policies");
  const commissions = useScoped("commissions");
  const opps = useScoped("opportunities");

  const stats = useMemo(() => new Map(sellers.map((s) => {
    const cl = clients.filter((c) => c.sellerId === s.id || (s.type === "interno" && c.ownerId && false));
    const pols = policies.filter((p) => p.sellerId === s.id);
    return [s.id, { clients: cl.length, policies: pols.length, premium: pols.reduce((a, p) => a + p.premium, 0), commission: commissions.filter((c) => c.sellerId === s.id).reduce((a, c) => a + c.sellerAmount, 0), opps: opps.filter((o) => o.sellerId === s.id).length }];
  })), [sellers, clients, policies, commissions, opps]);

  const cols: Column<Seller>[] = [
    { key: "name", header: "Nombre", sort: (s) => s.name, cell: (s) => <div className="flex items-center gap-2.5"><Avatar name={s.name} size="sm" color="#475569" /><div><p className="text-[13px] font-medium">{s.name}</p><p className="text-[11px] text-fg-muted">{s.email}</p></div></div> },
    { key: "type", header: "Tipo", cell: (s) => <Badge tone={TYPE[s.type].tone}>{TYPE[s.type].label}</Badge> },
    { key: "city", header: "Ciudad", cell: (s) => <span className="text-[13px]">{s.city}</span>, hideOnMobile: true },
    { key: "share", header: "Participación", cell: (s) => pct(s.commissionShare, 0) },
    { key: "pol", header: "Pólizas", sort: (s) => stats.get(s.id)!.policies, cell: (s) => stats.get(s.id)!.policies },
    { key: "prem", header: "Producción (prima)", sort: (s) => stats.get(s.id)!.premium, cell: (s) => <span className="tabular-nums">{money(stats.get(s.id)!.premium)}</span> },
    { key: "com", header: "Comisión asignada", sort: (s) => stats.get(s.id)!.commission, cell: (s) => <span className="tabular-nums">{money(stats.get(s.id)!.commission)}</span> },
    { key: "since", header: "Vinculado", cell: (s) => <span className="text-xs text-fg-muted">{fmtDate(s.joinedAt)}</span>, hideOnMobile: true },
    { key: "st", header: "Estado", cell: (s) => <Badge tone={s.active ? "green" : "slate"} dot>{s.active ? "Activo" : "Inactivo"}</Badge> },
  ];

  const total = [...stats.values()].reduce((a, s) => a + s.premium, 0);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Red comercial" description="Vendedores internos, externos y afiliados con su producción y comisiones." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <KpiCard label="Integrantes activos" value={sellers.filter((s) => s.active).length} tone="blue" />
        <KpiCard label="Afiliados" value={sellers.filter((s) => s.type === "afiliado").length} tone="orange" />
        <KpiCard label="Producción de la red" value={moneyShort(total)} tone="green" />
        <KpiCard label="Comisiones a la red" value={moneyShort([...stats.values()].reduce((a, s) => a + s.commission, 0))} tone="amber" />
      </div>
      <Card><DataTable rows={sellers} columns={cols} rowKey={(s) => s.id} search={(s) => `${s.name} ${s.city}`} /></Card>
    </div>
  );
}
