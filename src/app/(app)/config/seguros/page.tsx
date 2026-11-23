"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLookups, useScoped } from "@/hooks/use-data";
import { toggleInsurer, toggleLine } from "@/services/crm";
import { CASE_CATEGORY, PIPELINE, PRIORITY } from "@/domain/constants";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Tabs } from "@/components/ui/misc";
import { Switch } from "@/components/ui/form";
import { InsurerChip } from "@/components/domain/chips";
import { pct } from "@/lib/utils";

type Tab = "aseguradoras" | "ramos" | "productos" | "plantillas" | "parametros";

export default function InsuranceConfigPage() {
  return <Guard perm="config.edit"><Config /></Guard>;
}

function Config() {
  const insurers = useScoped("insurers");
  const lines = useScoped("lines");
  const products = useScoped("products");
  const templates = useScoped("templates");
  const { insurers: insMap, lines: lineMap } = useLookups();
  const [tab, setTab] = useState<Tab>("aseguradoras");

  return (
    <div className="animate-fade-in">
      <PageHeader title="Catálogo de seguros" description="Aseguradoras, ramos, productos, plantillas y tiempos de atención." />
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "aseguradoras", label: "Aseguradoras", count: insurers.length }, { key: "ramos", label: "Ramos", count: lines.length }, { key: "productos", label: "Productos", count: products.length }, { key: "plantillas", label: "Plantillas", count: templates.length }, { key: "parametros", label: "SLA y etapas" }]} />
        <CardContent>
          {tab === "aseguradoras" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-[11px] uppercase tracking-wide text-fg-muted"><th className="py-2">Aseguradora</th><th>Calificación</th><th>Comisión pactada</th><th>Contacto canal intermediarios</th><th className="text-right">Activa</th></tr></thead>
              <tbody>{insurers.map((i) => (
                <tr key={i.id} className="border-b last:border-0"><td className="py-3"><div className="flex items-center gap-3"><InsurerChip id={i.id} /><span className="text-xs text-fg-muted">{i.name}</span></div></td><td>{i.rating}</td><td>{pct(i.commissionRate, 0)}</td><td className="text-xs text-fg-muted">{i.contactEmail}</td><td className="text-right"><Switch checked={i.active} onChange={() => { toggleInsurer(i.id); toast("Catálogo actualizado y auditado"); }} /></td></tr>
              ))}</tbody>
            </table>
          )}
          {tab === "ramos" && (
            <div className="grid gap-3 md:grid-cols-2">
              {lines.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
                  <div><div className="flex items-center gap-2"><span className="rounded bg-slate-100 px-1.5 font-mono text-[11px]">{l.code}</span><p className="font-medium">{l.name}</p></div><p className="mt-1 text-xs text-fg-muted">{l.description}</p></div>
                  <Switch checked={l.active} onChange={() => toggleLine(l.id)} />
                </div>
              ))}
            </div>
          )}
          {tab === "productos" && (
            <div className="grid gap-3 md:grid-cols-2">
              {products.map((p) => (
                <div key={p.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between"><InsurerChip id={p.insurerId} /><Badge>{lineMap.get(p.lineId)?.name}</Badge></div>
                  <p className="mt-2 font-medium">{p.name}</p>
                  <p className="text-xs text-fg-muted">{p.description} · Deducible: {p.deductible}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{p.coverages.map((c) => <Badge key={c} tone="blue">{c}</Badge>)}</div>
                  <p className="mt-2 text-[11px] text-fg-subtle">Aseguradora: {insMap.get(p.insurerId)?.name}</p>
                </div>
              ))}
            </div>
          )}
          {tab === "plantillas" && (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{t.name}</p><Badge tone={t.channel === "whatsapp" ? "green" : "blue"}>{t.channel}</Badge><Badge tone={CASE_CATEGORY[t.category].tone}>{CASE_CATEGORY[t.category].label}</Badge><Badge tone={t.status === "aprobado" ? "green" : "amber"} dot>{t.status}</Badge></div>
                  <p className="mt-2 rounded-md bg-slate-50 p-3 font-mono text-xs leading-relaxed text-fg-muted">{t.body}</p>
                </div>
              ))}
            </div>
          )}
          {tab === "parametros" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div><p className="mb-2 text-sm font-semibold">SLA por prioridad</p><ul className="divide-y rounded-lg border">{Object.entries(PRIORITY).map(([k, v]) => <li key={k} className="flex justify-between px-4 py-2.5 text-sm"><Badge tone={v.tone}>{v.label}</Badge><span className="tabular-nums">{v.sla} horas</span></li>)}</ul></div>
              <div><p className="mb-2 text-sm font-semibold">Etapas del pipeline</p><ul className="divide-y rounded-lg border">{PIPELINE.map((s) => <li key={s.key} className="flex justify-between px-4 py-2.5 text-sm"><span>{s.label}</span><span className="text-fg-muted">{Math.round(s.probability * 100)}%</span></li>)}</ul></div>
              <div><p className="mb-2 text-sm font-semibold">Motivos de cierre</p><ul className="divide-y rounded-lg border">{["Póliza emitida y entregada", "Cliente desistió", "Precio no competitivo", "No asegurable", "Duplicado", "Resuelto en primer contacto"].map((m) => <li key={m} className="px-4 py-2.5 text-sm">{m}</li>)}</ul></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
