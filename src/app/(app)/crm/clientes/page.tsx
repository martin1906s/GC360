"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, UserPlus } from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { createClient } from "@/services/crm";
import type { Client } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { KpiCard, PageHeader, Tabs } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/form";
import { ClientLink, UserChip } from "@/components/domain/chips";
import { downloadFile, fmtDate, money, toCSV } from "@/lib/utils";

export default function ClientsPage() {
  return <Guard perm="crm.view"><Clients /></Guard>;
}

function Clients() {
  const router = useRouter();
  const { can } = useCurrent();
  const { sellers } = useLookups();
  const clients = useScoped("clients");
  const policies = useScoped("policies");
  const cases = useScoped("cases");
  const [tab, setTab] = useState<"todos" | "cliente" | "prospecto">("todos");
  const [segment, setSegment] = useState("all");
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => clients.filter((c) => (tab === "todos" ? true : c.status === tab)).filter((c) => (segment === "all" ? true : c.segment === segment)), [clients, tab, segment]);
  const premium = (id: string) => policies.filter((p) => p.clientId === id).reduce((s, p) => s + p.premium, 0);

  const columns: Column<Client>[] = [
    { key: "name", header: "Nombre", sort: (c) => c.name, cell: (c) => <div className="min-w-[220px] max-w-[300px]"><ClientLink id={c.id} sub /></div> },
    { key: "status", header: "Tipo", cell: (c) => <Badge tone={c.status === "cliente" ? "green" : "blue"} dot>{c.status === "cliente" ? "Cliente" : "Prospecto"}</Badge> },
    { key: "segment", header: "Segmento", sort: (c) => c.segment, cell: (c) => <span className="text-[13px]">{c.segment}</span>, hide: "xl" },
    { key: "source", header: "Origen", cell: (c) => <div className="max-w-[170px] text-[13px]"><p>{c.source}</p>{c.sellerId && <p className="truncate text-[11px] text-fg-muted">{sellers.get(c.sellerId)?.name}</p>}</div>, hide: "lg" },
    { key: "contact", header: "Contacto", cell: (c) => <div className="text-xs text-fg-muted"><p>{c.email}</p><p>{c.phone}</p></div>, hide: "2xl" },
    { key: "pol", header: "Pólizas", sort: (c) => policies.filter((p) => p.clientId === c.id).length, align: "right", cell: (c) => policies.filter((p) => p.clientId === c.id).length },
    { key: "prem", header: "Prima", sort: (c) => premium(c.id), align: "right", cell: (c) => <span className="text-[13px]">{premium(c.id) ? money(premium(c.id)) : "—"}</span> },
    { key: "owner", header: "Ejecutivo", cell: (c) => <UserChip id={c.ownerId} />, hide: "xl" },
  ];


  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clientes y prospectos"
        description="Personas y empresas con su información de contacto y ejecutivo asignado."
        actions={
          <>
            <Button variant="secondary" onClick={() => downloadFile("clientes.csv", toCSV(rows.map((c) => ({ Nombre: c.name, Documento: `${c.docType} ${c.docNumber}`, Estado: c.status, Segmento: c.segment, Origen: c.source, Correo: c.email, Teléfono: c.phone, Alta: fmtDate(c.createdAt) }))))}><Download /> Exportar</Button>
            {can("crm.edit") && <Button onClick={() => setOpen(true)}><UserPlus /> Nuevo</Button>}
          </>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <KpiCard label="Clientes" value={clients.filter((c) => c.status === "cliente").length} tone="green" />
        <KpiCard label="Prospectos" value={clients.filter((c) => c.status === "prospecto").length} tone="blue" />
        <KpiCard label="Empresas" value={clients.filter((c) => c.type === "empresa").length} tone="indigo" />
        <KpiCard label="Casos abiertos" value={cases.filter((c) => !["resuelto", "cerrado"].includes(c.status)).length} tone="amber" />
      </div>
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "todos", label: "Todos", count: clients.length }, { key: "cliente", label: "Clientes", count: clients.filter((c) => c.status === "cliente").length }, { key: "prospecto", label: "Prospectos", count: clients.filter((c) => c.status === "prospecto").length }]} />
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/crm/clientes/${c.id}`)}
          search={(c) => `${c.name} ${c.docNumber} ${c.email} ${c.phone} ${c.tags.join(" ")}`}
          searchPlaceholder="Nombre, documento, correo…"
          toolbar={
            <Select value={segment} onChange={(e) => setSegment(e.target.value)} className="h-8 w-44 text-xs">
              <option value="all">Todos los segmentos</option>
              {["Personas", "Pymes", "Corporativo", "Alto patrimonio"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          }
        />
      </Card>
      <NewClientModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useCurrent();
  const [f, setF] = useState({ type: "persona", name: "", docType: "CC", docNumber: "", email: "", phone: "", city: "Medellín", segment: "Personas", source: "WhatsApp", status: "prospecto" });
  const submit = () => {
    if (!f.name) return toast.error("El nombre es obligatorio");
    const c = createClient({ ...(f as unknown as Parameters<typeof createClient>[0]), ownerId: user!.id });
    toast.success(`${c.status === "prospecto" ? "Prospecto" : "Cliente"} creado`);
    onClose();
    router.push(`/crm/clientes/${c.id}`);
  };
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Nuevo cliente o prospecto" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo"><Select value={f.type} onChange={(e) => { set("type", e.target.value); set("docType", e.target.value === "empresa" ? "NIT" : "CC"); }}><option value="persona">Persona</option><option value="empresa">Empresa</option></Select></Field>
        <Field label="Estado"><Select value={f.status} onChange={(e) => set("status", e.target.value)}><option value="prospecto">Prospecto</option><option value="cliente">Cliente</option></Select></Field>
        <Field label={f.type === "empresa" ? "Razón social" : "Nombre completo"} required className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Tipo de documento"><Select value={f.docType} onChange={(e) => set("docType", e.target.value)}><option>CC</option><option>NIT</option><option>CE</option></Select></Field>
        <Field label="Número (ficticio)"><Input value={f.docNumber} onChange={(e) => set("docNumber", e.target.value)} /></Field>
        <Field label="Correo"><Input value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Teléfono"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Segmento"><Select value={f.segment} onChange={(e) => set("segment", e.target.value)}>{["Personas", "Pymes", "Corporativo", "Alto patrimonio"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Origen"><Select value={f.source} onChange={(e) => set("source", e.target.value)}>{["WhatsApp", "Correo", "Referido", "Web", "Redes sociales", "Llamada", "Afiliado"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}
