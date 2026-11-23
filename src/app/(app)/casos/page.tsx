"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { useCurrent, useScoped } from "@/hooks/use-data";
import { CASE_CATEGORY, CASE_STATUS, PRIORITY } from "@/domain/constants";
import type { Case } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MetaBadge } from "@/components/ui/badge";
import { PageHeader, Tabs } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { ChannelIcon, ClientLink, UserChip } from "@/components/domain/chips";
import { NewCaseModal } from "@/components/domain/new-case-modal";
import { SlaCell } from "@/components/domain/sla";
import { downloadFile, fmtDateTime, fromNow, toCSV } from "@/lib/utils";

type View = "abiertos" | "mios" | "vencidos" | "cerrados" | "todos";

export default function CasesPage() {
  return (
    <Guard perm="cases.view">
      <Suspense>
        <Cases />
      </Suspense>
    </Guard>
  );
}

function Cases() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, can } = useCurrent();
  const cases = useScoped("cases");
  const [view, setView] = useState<View>(params.get("mine") ? "mios" : "abiertos");
  const [cat, setCat] = useState("all");
  const [prio, setPrio] = useState("all");
  const [open, setOpen] = useState(false);

  const isOpen = (c: Case) => !["resuelto", "cerrado"].includes(c.status);
  const counts = {
    abiertos: cases.filter(isOpen).length,
    mios: cases.filter((c) => isOpen(c) && c.assigneeId === user?.id).length,
    vencidos: cases.filter((c) => isOpen(c) && new Date(c.dueAt) < new Date()).length,
    cerrados: cases.filter((c) => !isOpen(c)).length,
    todos: cases.length,
  };

  const rows = useMemo(
    () =>
      cases
        .filter((c) => (view === "abiertos" ? isOpen(c) : view === "mios" ? isOpen(c) && c.assigneeId === user?.id : view === "vencidos" ? isOpen(c) && new Date(c.dueAt) < new Date() : view === "cerrados" ? !isOpen(c) : true))
        .filter((c) => (cat === "all" ? true : c.category === cat))
        .filter((c) => (prio === "all" ? true : c.priority === prio))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [cases, view, cat, prio, user],
  );

  const columns: Column<Case>[] = [
    { key: "code", header: "Caso", sort: (c) => c.code, cell: (c) => (
      <div className="flex min-w-[260px] items-center gap-3">
        <ChannelIcon channel={c.channel} />
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="font-mono text-[11px] font-medium text-fg-muted">{c.code}</span><MetaBadge map={CASE_CATEGORY} value={c.category} dot={false} /></div>
          <p className="max-w-[300px] truncate text-[13px] font-medium" title={c.title}>{c.title}</p>
        </div>
      </div>
    ) },
    { key: "client", header: "Cliente", cell: (c) => <div className="max-w-[220px]"><ClientLink id={c.clientId} /></div>, hide: "lg" },
    { key: "status", header: "Estado", sort: (c) => c.status, cell: (c) => <MetaBadge map={CASE_STATUS} value={c.status} /> },
    { key: "prio", header: "Prioridad", sort: (c) => ["baja", "media", "alta", "critica"].indexOf(c.priority), cell: (c) => <MetaBadge map={PRIORITY} value={c.priority} /> },
    { key: "owner", header: "Responsable", cell: (c) => <UserChip id={c.assigneeId} />, hide: "2xl" },
    { key: "sla", header: "SLA", sort: (c) => c.dueAt, cell: (c) => <SlaCell c={c} /> },
    { key: "upd", header: "Actualizado", sort: (c) => c.updatedAt, cell: (c) => <span className="text-xs text-fg-muted">{fromNow(c.updatedAt)}</span>, hide: "2xl" },
  ];


  const exportCsv = () =>
    downloadFile("casos_gc360.csv", toCSV(rows.map((c) => ({ Código: c.code, Título: c.title, Tipo: CASE_CATEGORY[c.category].label, Estado: CASE_STATUS[c.status].label, Prioridad: c.priority, Creado: fmtDateTime(c.createdAt), Vence: fmtDateTime(c.dueAt) }))));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Casos"
        description="Solicitudes de clientes con su responsable, estado y tiempo de atención."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}><Download /> Exportar</Button>
            {can("cases.edit") && <Button onClick={() => setOpen(true)}><Plus /> Nuevo caso</Button>}
          </>
        }
      />
      <Card>
        <Tabs
          className="px-3"
          value={view}
          onChange={setView}
          tabs={[
            { key: "abiertos", label: "Abiertos", count: counts.abiertos },
            { key: "mios", label: "Asignados a mí", count: counts.mios },
            { key: "vencidos", label: "SLA vencido", count: counts.vencidos },
            { key: "cerrados", label: "Resueltos / cerrados", count: counts.cerrados },
            { key: "todos", label: "Todos", count: counts.todos },
          ]}
        />
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/casos/${c.id}`)}
          search={(c) => `${c.code} ${c.title} ${c.description}`}
          searchPlaceholder="Buscar por código, título…"
          toolbar={
            <>
              <Select value={cat} onChange={(e) => setCat(e.target.value)} className="h-8 w-44 text-xs">
                <option value="all">Todos los tipos</option>
                {Object.entries(CASE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
              <Select value={prio} onChange={(e) => setPrio(e.target.value)} className="h-8 w-36 text-xs">
                <option value="all">Toda prioridad</option>
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </>
          }
        />
      </Card>
      <NewCaseModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
