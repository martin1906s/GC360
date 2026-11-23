"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Dog, Home, Hotel, ShieldCheck } from "lucide-react";
import { useCurrent } from "@/hooks/use-data";
import { useDB } from "@/store/db";
import { updateTenantBranding } from "@/services/crm";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/form";
import { fmtDate } from "@/lib/utils";

export default function SaasPage() {
  return <Guard perm="saas.manage"><Saas /></Guard>;
}

const VERTICALS = [
  { icon: ShieldCheck, name: "Seguros", status: "Activo", desc: "Bróker / agencia de seguros" },
  { icon: Home, name: "Inmobiliaria", status: "Próximamente", desc: "Venta y arriendo de inmuebles" },
  { icon: Dog, name: "Veterinaria", status: "Próximamente", desc: "Clínica, comercial y spa" },
  { icon: Hotel, name: "Hoteles", status: "Próximamente", desc: "Reservas multicanal (OTA)" },
];

function Saas() {
  const { tenant } = useCurrent();
  const tenants = useDB((s) => s.db.tenants);
  const data = useDB((s) => s.db);
  const [brand, setBrand] = useState({ name: tenant?.name ?? "", brandColor: tenant?.brandColor ?? "#2f5079", initials: tenant?.initials ?? "" });
  const count = (tid: string, k: "users" | "clients" | "cases" | "policies") => data[k].filter((r) => r.tenantId === tid).length;

  return (
    <div className="animate-fade-in">
      <PageHeader title={"Plataforma SaaS"} description="Empresas que usan la plataforma, su plan y su marca." />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Empresas registradas" icon={<Building2 />} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-fg-muted"><th className="px-5 py-2">Empresa</th><th>Plan</th><th>Vertical</th><th>Usuarios</th><th>Clientes</th><th>Casos</th><th>Pólizas</th><th>Alta</th></tr></thead>
              <tbody>{tenants.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-md text-[11px] font-bold text-white" style={{ background: t.brandColor }}>{t.initials}</span><div><p className="font-medium">{t.name}</p><p className="text-[11px] text-fg-muted">NIT {t.nit} · {t.city}</p></div></div></td>
                  <td><Badge tone="blue">{t.plan}</Badge></td><td className="capitalize">{t.vertical}</td>
                  <td className="tabular-nums">{count(t.id, "users")}</td><td className="tabular-nums">{count(t.id, "clients")}</td><td className="tabular-nums">{count(t.id, "cases")}</td><td className="tabular-nums">{count(t.id, "policies")}</td>
                  <td className="text-xs text-fg-muted">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Marca de la empresa" description={tenant?.legalName} />
          <CardContent className="space-y-4">
            <Field label="Nombre comercial"><Input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Color de marca"><div className="flex gap-2"><input type="color" value={brand.brandColor} onChange={(e) => setBrand({ ...brand, brandColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded border" /><Input value={brand.brandColor} onChange={(e) => setBrand({ ...brand, brandColor: e.target.value })} /></div></Field>
              <Field label="Iniciales"><Input maxLength={3} value={brand.initials} onChange={(e) => setBrand({ ...brand, initials: e.target.value.toUpperCase() })} /></Field>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3"><span className="grid size-10 place-items-center rounded-md font-bold text-white" style={{ background: brand.brandColor }}>{brand.initials}</span><div><p className="font-medium">{brand.name}</p><p className="text-xs text-fg-muted">Así se verá en propuestas y en el portal de clientes</p></div></div>
            <Button className="w-full" onClick={() => { updateTenantBranding(brand); toast.success("Marca actualizada para esta empresa"); }}>Guardar</Button>
          </CardContent>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold">Verticales de la plataforma</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {VERTICALS.map((v) => (
          <Card key={v.name} className="p-5">
            <v.icon className="size-5 text-slate-500" />
            <p className="mt-3 font-semibold">{v.name}</p>
            <p className="text-xs text-fg-muted">{v.desc}</p>
            <Badge tone={v.status === "Activo" ? "green" : "slate"} className="mt-3">{v.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
