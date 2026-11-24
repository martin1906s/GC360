"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcw, ShieldAlert } from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { startRenewal } from "@/services/insurance";
import { CASE_STATUS, CLAIM_STATUS } from "@/domain/constants";
import { Guard } from "@/components/layout/guard";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, PageHeader, Segmented } from "@/components/ui/misc";
import { InsurerChip } from "@/components/domain/chips";
import { cn, daysUntil, fmtDate, money } from "@/lib/utils";

export default function RenewalsPage() {
  return <Guard perm="policies.view"><Renewals /></Guard>;
}

function Renewals() {
  const router = useRouter();
  const { can } = useCurrent();
  const { clients } = useLookups();
  const policies = useScoped("policies");
  const cases = useScoped("cases");
  const claims = useScoped("claims");
  const [range, setRange] = useState<"30" | "60" | "90">("60");

  const upcoming = useMemo(() => policies.filter((p) => { const d = daysUntil(p.endDate); return d >= 0 && d <= Number(range); }).sort((a, b) => a.endDate.localeCompare(b.endDate)), [policies, range]);
  const renewalCase = (pid: string) => cases.find((c) => c.policyId === pid && c.category === "renovacion" && !["cerrado"].includes(c.status));

  const start = (pid: string) => {
    const c = startRenewal(pid);
    toast.success(`Caso ${c.code} con borrador de seguimiento para revisión`);
    router.push(`/casos/${c.id}`);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Renovaciones y siniestros" description="Vencimientos próximos y siniestros en curso." actions={<Segmented value={range} onChange={setRange} options={[{ key: "30", label: "30 días" }, { key: "60", label: "60 días" }, { key: "90", label: "90 días" }]} />} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <KpiCard label="Vencen ≤ 15 días" value={policies.filter((p) => daysUntil(p.endDate) >= 0 && daysUntil(p.endDate) <= 15).length} tone="red" />
        <KpiCard label="Vencen ≤ 30 días" value={policies.filter((p) => daysUntil(p.endDate) >= 0 && daysUntil(p.endDate) <= 30).length} tone="amber" />
        <KpiCard label="Renovaciones en gestión" value={cases.filter((c) => c.category === "renovacion" && !["resuelto", "cerrado"].includes(c.status)).length} tone="blue" />
        <KpiCard label="Siniestros abiertos" value={claims.filter((c) => c.status !== "pagado").length} tone="teal" />
      </div>
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title={`Pólizas que vencen en ${range} días`} icon={<RefreshCcw />} description={`${upcoming.length} pólizas · ordenadas por fecha de vencimiento`} />
          {upcoming.length === 0 ? <EmptyState title="Sin vencimientos en el periodo" /> : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                    <th className="w-20 py-2.5 pl-5 pr-3">Vence en</th>
                    <th className="w-[40%] px-3 py-2.5">Póliza y bien asegurado</th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">Cliente</th>
                    <th className="px-3 py-2.5">Aseguradora</th>
                    <th className="hidden px-3 py-2.5 text-right xl:table-cell">Prima</th>
                    <th className="py-2.5 pl-3 pr-5 text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upcoming.map((p) => {
                    const d = daysUntil(p.endDate);
                    const rc = renewalCase(p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-3 pl-5 pr-3">
                          <span className={cn("inline-flex min-w-14 flex-col items-center rounded-md px-2 py-1 leading-tight", d <= 15 ? "bg-rose-50 text-rose-700" : d <= 30 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600")}>
                            <b className="text-sm tabular-nums">{d}</b><span className="text-[10px]">días</span>
                          </span>
                        </td>
                        <td className="max-w-0 px-3 py-3">
                          <Link href={`/polizas/${p.id}`} className="block truncate text-[13px] font-medium hover:text-brand-700" title={p.insuredItem}>{p.insuredItem}</Link>
                          <p className="truncate text-[11px] text-fg-muted"><span className="font-mono">{p.number}</span> · vence {fmtDate(p.endDate)}</p>
                        </td>
                        <td className="hidden max-w-[200px] truncate px-3 py-3 text-[13px] lg:table-cell">{clients.get(p.clientId)?.name}</td>
                        <td className="whitespace-nowrap px-3 py-3"><InsurerChip id={p.insurerId} /></td>
                        <td className="hidden whitespace-nowrap px-3 py-3 text-right text-[13px] tabular-nums xl:table-cell">{money(p.premium)}</td>
                        <td className="whitespace-nowrap py-3 pl-3 pr-5 text-right">
                          {rc ? (
                            <Link href={`/casos/${rc.id}`} className="inline-flex items-center gap-1.5"><span className="font-mono text-[11px] text-fg-muted">{rc.code}</span><MetaBadge map={CASE_STATUS} value={rc.status} /></Link>
                          ) : can("cases.edit") ? (
                            <Button size="xs" variant="subtle" onClick={() => start(p.id)}><RefreshCcw /> Iniciar renovación</Button>
                          ) : <Badge>Sin gestión</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Siniestros" icon={<ShieldAlert />} description="Reclamaciones en curso" />
          {claims.length === 0 ? <EmptyState title="Sin siniestros" /> : (
            <ul className="divide-y">
              {claims.map((cl) => {
                const c = cases.find((x) => x.id === cl.caseId);
                return (
                  <li key={cl.id}><Link href={`/casos/${cl.caseId}`} className="block px-5 py-3.5 hover:bg-slate-50">
                    <div className="flex items-center justify-between"><span className="font-mono text-[11px] text-fg-muted">{c?.code}</span><MetaBadge map={CLAIM_STATUS} value={cl.status} /></div>
                    <p className="mt-1 text-[13px] font-medium">{clients.get(cl.clientId)?.name}</p>
                    <p className="line-clamp-2 text-xs text-fg-muted">{cl.description}</p>
                    <p className="mt-1 text-[11px] text-fg-subtle">Ocurrió {fmtDate(cl.occurredAt)}{cl.amountClaimed ? ` · ${money(cl.amountClaimed)}` : ""}</p>
                  </Link></li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
