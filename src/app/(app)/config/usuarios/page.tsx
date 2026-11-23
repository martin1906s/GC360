"use client";

import { useMemo, useState } from "react";
import { Check, Download, Minus, ShieldCheck } from "lucide-react";
import { useCurrent, useScoped } from "@/hooks/use-data";
import { useDB } from "@/store/db";
import { scopeRows } from "@/services/core";
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission } from "@/domain/permissions";
import { ROLE_META } from "@/domain/constants";
import type { AuditEvent, Role } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, PageHeader, Tabs } from "@/components/ui/misc";
import { Select } from "@/components/ui/form";
import { downloadFile, fmtDateTime, toCSV } from "@/lib/utils";

type Tab = "usuarios" | "matriz" | "auditoria" | "aislamiento";

export default function UsersPage() {
  return <Guard perm="audit.view"><Users /></Guard>;
}

function Users() {
  const { tenant } = useCurrent();
  const allUsers = useDB((s) => s.db.users);
  const users = allUsers.filter((u) => u.tenantId === tenant?.id);
  const events = useScoped("events");
  const [tab, setTab] = useState<Tab>("usuarios");
  const [actor, setActor] = useState("all");

  const evRows = useMemo(() => [...events].filter((e) => actor === "all" || e.actorType === actor).sort((a, b) => b.at.localeCompare(a.at)), [events, actor]);
  const evCols: Column<AuditEvent>[] = [
    { key: "at", header: "Fecha", sort: (e) => e.at, cell: (e) => <span className="whitespace-nowrap text-xs tabular-nums text-fg-muted">{fmtDateTime(e.at)}</span> },
    { key: "actor", header: "Actor", cell: (e) => <div className="text-[13px]"><p className="font-medium">{e.actorName}</p><p className="text-[11px] text-fg-muted">{e.actorType}</p></div> },
    { key: "action", header: "Acción", cell: (e) => <Badge tone={e.actorType === "ia" ? "teal" : e.actorType === "sistema" ? "slate" : "blue"}>{e.action}</Badge> },
    { key: "detail", header: "Detalle", cell: (e) => <span className="line-clamp-2 max-w-md text-[13px] text-fg-muted">{e.detail}</span> },
    { key: "entity", header: "Entidad", cell: (e) => <span className="font-mono text-[11px] text-fg-subtle">{e.entity}:{e.entityId.slice(0, 10)}</span>, hideOnMobile: true },
  ];
  const roles = Object.keys(ROLE_PERMISSIONS) as Role[];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Usuarios, roles y auditoría" description="Usuarios, permisos por rol e historial de cambios." />
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "usuarios", label: "Usuarios", count: users.length }, { key: "matriz", label: "Matriz de permisos" }, { key: "auditoria", label: "Auditoría", count: events.length }, { key: "aislamiento", label: "Verificación de accesos" }]} />
        {tab === "usuarios" && (
          <CardContent>
            <div className="overflow-x-auto rounded-lg border scroll-thin">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"><th className="py-2.5 pl-4 pr-3">Usuario</th><th className="px-3">Rol</th><th className="hidden px-3 lg:table-cell">Cargo</th><th className="hidden px-3 xl:table-cell">Permisos</th><th className="pl-3 pr-4">Estado</th></tr></thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 pl-4 pr-3"><div className="flex items-center gap-3"><Avatar name={u.name} color={u.color} size="sm" /><div className="min-w-0"><p className="whitespace-nowrap text-[13px] font-medium">{u.name}</p><p className="whitespace-nowrap text-xs text-fg-muted">{u.email}</p></div></div></td>
                      <td className="whitespace-nowrap px-3"><Badge tone={ROLE_META[u.role].tone}>{ROLE_META[u.role].label}</Badge></td>
                      <td className="hidden whitespace-nowrap px-3 text-[13px] text-fg-muted lg:table-cell">{u.title}</td>
                      <td className="hidden whitespace-nowrap px-3 text-[13px] tabular-nums xl:table-cell">{ROLE_PERMISSIONS[u.role].length} de {Object.keys(PERMISSIONS).length}</td>
                      <td className="whitespace-nowrap pl-3 pr-4"><Badge tone="green" dot>Activo</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
        {tab === "matriz" && (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead><tr className="border-b bg-slate-50/60"><th className="sticky left-0 bg-slate-50 px-4 py-2.5 text-left text-[11px] uppercase tracking-wide text-fg-muted">Permiso</th>{roles.map((r) => <th key={r} className="px-2 py-2.5 text-center text-[11px] font-semibold text-fg-muted">{ROLE_META[r].label.split(" ")[0]}</th>)}</tr></thead>
              <tbody>
                {(Object.keys(PERMISSIONS) as Permission[]).map((p) => (
                  <tr key={p} className="border-b last:border-0">
                    <td className="sticky left-0 bg-white px-4 py-2"><p>{PERMISSIONS[p]}</p><p className="font-mono text-[10px] text-fg-subtle">{p}</p></td>
                    {roles.map((r) => <td key={r} className="text-center">{ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto size-4 text-emerald-600" /> : <Minus className="mx-auto size-3.5 text-slate-300" />}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "auditoria" && (
          <DataTable rows={evRows} columns={evCols} rowKey={(e) => e.id} dense pageSize={15} search={(e) => `${e.action} ${e.detail} ${e.actorName}`}
            toolbar={<><Select value={actor} onChange={(e) => setActor(e.target.value)} className="h-8 w-36 text-xs"><option value="all">Todos los actores</option><option value="usuario">Usuarios</option><option value="ia">Agentes IA</option><option value="sistema">Sistema</option></Select><Button size="sm" variant="secondary" onClick={() => downloadFile("auditoria.csv", toCSV(evRows.map((e) => ({ Fecha: fmtDateTime(e.at), Actor: e.actorName, Tipo: e.actorType, Acción: e.action, Detalle: e.detail }))))}><Download /> CSV</Button></>} />
        )}
        {tab === "aislamiento" && <IsolationTest />}
      </Card>
    </div>
  );
}

/** Demuestra que cada usuario solo ve datos de su tenant/ámbito (F08, criterio 15). */
function IsolationTest() {
  const data = useDB((s) => s.db);
  const [results, setResults] = useState<{ user: string; tenant: string; role: string; clients: number; cases: number; policies: number; foreign: number }[] | null>(null);
  const run = () => {
    const sample = ["u_ger", "u_ase1", "u_afi", "u_cli", "u_a_ger", "u_a_cli"].map((id) => data.users.find((u) => u.id === id)!).filter(Boolean);
    setResults(sample.map((u) => {
      const cl = scopeRows("clients", data.clients, u, data);
      const cs = scopeRows("cases", data.cases, u, data);
      const pl = scopeRows("policies", data.policies, u, data);
      const foreign = [...cl, ...cs, ...pl].filter((r) => r.tenantId !== u.tenantId).length;
      return { user: u.name, tenant: data.tenants.find((t) => t.id === u.tenantId)!.name, role: ROLE_META[u.role].label, clients: cl.length, cases: cs.length, policies: pl.length, foreign };
    }));
  };
  return (
    <CardContent>
      <p className="max-w-3xl text-sm text-fg-muted">Comprueba que cada usuario vea únicamente la información de su empresa y de su perfil.</p>
      <Button className="mt-4" onClick={run}><ShieldCheck /> Verificar ahora</Button>
      {results && (
        <div className="overflow-x-auto scroll-thin">
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wide text-fg-muted">
                <th className="py-2.5 pr-4">Usuario</th>
                <th className="px-4 py-2.5">Empresa</th>
                <th className="px-4 py-2.5">Rol</th>
                <th className="px-4 py-2.5">Clientes visibles</th>
                <th className="px-4 py-2.5">Casos</th>
                <th className="px-4 py-2.5">Pólizas</th>
                <th className="py-2.5 pl-4">Registros de otra empresa</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.user} className="border-b last:border-0 whitespace-nowrap">
                  <td className="py-2.5 pr-4 font-medium">{r.user}</td>
                  <td className="px-4 py-2.5">{r.tenant}</td>
                  <td className="px-4 py-2.5 text-fg-muted">{r.role}</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.clients}</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.cases}</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.policies}</td>
                  <td className="py-2.5 pl-4"><Badge tone={r.foreign ? "red" : "green"} dot>{r.foreign ? `${r.foreign} — fallo` : "0 — correcto"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
    </CardContent>
  );
}
