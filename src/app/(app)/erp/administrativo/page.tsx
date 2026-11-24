"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Boxes, Building, CalendarPlus, ClipboardList, Laptop, Minus, Plus, Star, Truck, Users, Wallet } from "lucide-react";
import { useDemoState } from "@/hooks/use-demo-state";
import { ASSETS, EMPLOYEES, INVENTORY, OFFICES, PURCHASE_REQUESTS, ROOM_BOOKINGS, VENDORS } from "@/data/erp-demo";
import { Guard } from "@/components/layout/guard";
import { Payroll, People } from "@/components/erp/hr";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader, Progress, Tabs } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/form";
import { cn, fmtDate, money, moneyShort } from "@/lib/utils";

type Tab = "rrhh" | "nomina" | "compras" | "proveedores" | "inventario" | "activos" | "sedes";
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "rrhh", label: "Recursos humanos", icon: Users },
  { key: "nomina", label: "Nómina", icon: Wallet },
  { key: "compras", label: "Compras", icon: ClipboardList },
  { key: "proveedores", label: "Proveedores", icon: Truck },
  { key: "inventario", label: "Inventarios", icon: Boxes },
  { key: "activos", label: "Activos fijos", icon: Laptop },
  { key: "sedes", label: "Sedes", icon: Building },
];

export default function ErpAdminPage() {
  return <Guard perm="erp.view"><Suspense><ErpAdmin /></Suspense></Guard>;
}

function ErpAdmin() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("m") as Tab) || "rrhh");
  return (
    <div className="animate-fade-in">
      <PageHeader title="Administración" description="Personal, nómina, compras, proveedores, inventarios, activos y sedes." />
      <AdminSummary onOpen={setTab} />
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ key: t.key, label: <span className="flex items-center gap-1.5"><t.icon className="size-4" />{t.label}</span> }))} />
        <CardContent>
          {tab === "rrhh" && <People />}
          {tab === "nomina" && <Payroll />}
          {tab === "compras" && <Purchasing />}
          {tab === "proveedores" && <Vendors />}
          {tab === "inventario" && <Inventory />}
          {tab === "activos" && <Assets />}
          {tab === "sedes" && <Offices />}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSummary({ onOpen }: { onOpen: (t: Tab) => void }) {
  const [purchases] = useDemoState("purchases-v1", PURCHASE_REQUESTS);
  const [items] = useDemoState("inventory-v1", INVENTORY);
  const payroll = EMPLOYEES.reduce((s, e) => s + e.salary, 0);
  const inApproval = purchases.filter((p) => p.status === "en_aprobacion");
  const low = items.filter((i) => i.stock < i.min).length;
  const assets = ASSETS.reduce((s, a) => s + a.cost * Math.max(0, 1 - yearsSince(a.acquired) / a.lifeYears), 0);
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5 max-md:[&>*:last-child:nth-child(odd)]:col-span-2">
      <KpiCard label="Colaboradores activos" value={EMPLOYEES.filter((e) => e.status === "Activo").length} hint={`de ${EMPLOYEES.length} en total`} icon={<Users />} tone="blue" onClick={() => onOpen("rrhh")} />
      <KpiCard label="Nómina mensual" value={moneyShort(payroll * 1.305)} hint="Salarios + aportes" icon={<Wallet />} tone="green" onClick={() => onOpen("nomina")} />
      <KpiCard label="Compras por aprobar" value={inApproval.length} hint={moneyShort(inApproval.reduce((s, p) => s + p.amount, 0))} icon={<ClipboardList />} tone="amber" onClick={() => onOpen("compras")} />
      <KpiCard label="Artículos bajo mínimo" value={low} hint={low ? "Requieren reposición" : "Inventario al día"} icon={<AlertTriangle />} tone={low ? "red" : "slate"} onClick={() => onOpen("inventario")} />
      <KpiCard label="Activos en libros" value={moneyShort(assets)} hint={`${ASSETS.length} activos`} icon={<Laptop />} tone="slate" onClick={() => onOpen("activos")} />
    </div>
  );
}

const yearsSince = (d: string) => Math.max(0, (Date.now() - new Date(d).getTime()) / (365.25 * 86400000));

/* ───────── Compras ───────── */

const PURCHASE_FLOW = ["en_aprobacion", "aprobada", "orden_emitida", "recibida"] as const;
const PURCHASE_LABEL: Record<string, string> = { en_aprobacion: "En aprobación", aprobada: "Aprobada", orden_emitida: "Orden emitida", recibida: "Recibida" };
const PURCHASE_NEXT: Record<string, string> = { en_aprobacion: "Aprobar", aprobada: "Emitir orden", orden_emitida: "Registrar recepción" };

function Purchasing() {
  const [rows, setRows] = useDemoState("purchases-v1", PURCHASE_REQUESTS);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ item: "", area: "Comercial", amount: "" });
  const advance = (id: string) => setRows((xs) => xs.map((x) => { if (x.id !== id) return x; const n = PURCHASE_FLOW[PURCHASE_FLOW.indexOf(x.status as never) + 1]; toast.success(`${x.number}: ${PURCHASE_LABEL[n]}`); return { ...x, status: n }; }));
  const cols: Column<(typeof PURCHASE_REQUESTS)[number]>[] = [
    { key: "n", header: "Requisición", cell: (r) => <div><p className="font-mono text-[11px] text-fg-muted">{r.number}</p><p className="max-w-[280px] truncate text-[13px] font-medium">{r.item}</p></div> },
    { key: "a", header: "Área", cell: (r) => <span className="text-[13px]">{r.area}</span>, hide: "lg" },
    { key: "q", header: "Cotizaciones", align: "right", cell: (r) => r.quotes, hide: "xl" },
    { key: "v", header: "Valor", align: "right", sort: (r) => r.amount, cell: (r) => money(r.amount) },
    { key: "s", header: "Estado", cell: (r) => <Badge tone={r.status === "recibida" ? "green" : r.status === "en_aprobacion" ? "amber" : "blue"} dot>{PURCHASE_LABEL[r.status]}</Badge> },
    { key: "act", header: "", cell: (r) => PURCHASE_NEXT[r.status] && <Button size="xs" variant="secondary" onClick={() => advance(r.id)}>{PURCHASE_NEXT[r.status]}</Button> },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">{PURCHASE_FLOW.map((s, i) => <span key={s} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-fg-muted">{i + 1}. {PURCHASE_LABEL[s]} · <b className="text-fg">{rows.filter((r) => r.status === s).length}</b></span>)}</div>
        <Button onClick={() => setOpen(true)}><Plus /> Nueva requisición</Button>
      </div>
      <div className="rounded-lg border"><DataTable rows={rows} columns={cols} rowKey={(r) => r.id} dense /></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva requisición de compra" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => { if (!f.item) return; setRows((xs) => [{ id: `oc${Date.now()}`, number: `REQ-2026-0${42 + xs.length - 5}`, item: f.item, area: f.area, requester: "Usuario actual", amount: Number(f.amount || 0), date: new Date().toISOString(), status: "en_aprobacion", quotes: 0 }, ...xs]); setOpen(false); setF({ item: "", area: "Comercial", amount: "" }); toast.success("Requisición enviada a aprobación"); }}>Enviar</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Descripción" className="sm:col-span-2"><Input value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} placeholder="Ej. 2 monitores para operaciones" /></Field>
          <Field label="Área"><Select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{["Comercial", "Operaciones", "Financiero", "Tecnología", "Administración"].map((a) => <option key={a}>{a}</option>)}</Select></Field>
          <Field label="Valor estimado (COP)"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

/* ───────── Proveedores ───────── */

function Vendors() {
  const cols: Column<(typeof VENDORS)[number]>[] = [
    { key: "n", header: "Proveedor", sort: (v) => v.name, cell: (v) => <div><p className="text-[13px] font-medium">{v.name}</p><p className="text-[11px] text-fg-muted">NIT {v.nit}</p></div> },
    { key: "c", header: "Categoría", cell: (v) => <span className="text-[13px]">{v.category}</span> },
    { key: "ct", header: "Contacto", cell: (v) => <span className="text-xs text-fg-muted">{v.contact}</span>, hide: "xl" },
    { key: "r", header: "Calificación", sort: (v) => v.rating, cell: (v) => <span className="inline-flex items-center gap-1 text-[13px]"><Star className="size-3.5 fill-amber-400 text-amber-400" />{v.rating.toFixed(1)}</span> },
    { key: "d", header: "Documentación", cell: (v) => <Badge tone={v.docs === "Completa" ? "green" : "amber"} dot>{v.docs}</Badge> },
    { key: "l", header: "Última compra", cell: (v) => <span className="text-[13px]">{fmtDate(v.lastPurchase)}</span>, hide: "lg" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <KpiCard label="Proveedores activos" value={VENDORS.length} tone="blue" />
        <KpiCard label="Con documentos pendientes" value={VENDORS.filter((v) => v.docs !== "Completa").length} tone="amber" />
        <KpiCard label="Calificación promedio" value={(VENDORS.reduce((s, v) => s + v.rating, 0) / VENDORS.length).toFixed(1)} tone="green" />
      </div>
      <div className="rounded-lg border"><DataTable rows={VENDORS} columns={cols} rowKey={(v) => v.id} dense search={(v) => `${v.name} ${v.category}`} searchPlaceholder="Buscar proveedor…" /></div>
    </div>
  );
}

/* ───────── Inventarios ───────── */

function Inventory() {
  const [items, setItems] = useDemoState("inventory-v1", INVENTORY);
  const move = (id: string, delta: number) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock + delta) } : x)));
  const low = items.filter((i) => i.stock < i.min);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <KpiCard label="Referencias" value={items.length} tone="blue" />
        <KpiCard label="Bajo stock mínimo" value={low.length} tone="red" />
        <KpiCard label="Valor del inventario" value={moneyShort(items.reduce((s, i) => s + i.stock * i.cost, 0))} tone="slate" />
      </div>
      {low.length > 0 && <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900">Reponer: {low.map((i) => i.name).join(", ")}.</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"><th className="py-2.5 pl-4">Artículo</th><th className="hidden px-3 lg:table-cell">Categoría</th><th className="px-3">Existencias</th><th className="hidden px-3 text-right xl:table-cell">Costo unitario</th><th className="pr-4 text-right">Movimiento</th></tr></thead>
          <tbody className="divide-y">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="whitespace-nowrap py-2.5 pl-4"><p className="text-[13px] font-medium">{i.name}</p><p className="font-mono text-[11px] text-fg-muted">{i.sku}</p></td>
                <td className="hidden whitespace-nowrap px-3 text-[13px] lg:table-cell">{i.category}</td>
                <td className="px-3"><div className="flex min-w-[160px] items-center gap-3"><Progress value={(i.stock / (i.min * 2)) * 100} tone={i.stock < i.min ? "red" : "green"} className="w-20" /><span className={cn("whitespace-nowrap text-[13px] tabular-nums", i.stock < i.min && "font-semibold text-rose-600")}>{i.stock} {i.unit}</span><span className="whitespace-nowrap text-[11px] text-fg-subtle">mín. {i.min}</span></div></td>
                <td className="hidden whitespace-nowrap px-3 text-right tabular-nums xl:table-cell">{money(i.cost)}</td>
                <td className="whitespace-nowrap pr-4 text-right"><div className="inline-flex gap-1"><Button size="icon-sm" variant="secondary" title="Salida" onClick={() => move(i.id, -1)}><Minus /></Button><Button size="icon-sm" variant="secondary" title="Entrada" onClick={() => { move(i.id, 10); toast.success(`Entrada registrada: ${i.name} +10`); }}><Plus /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Activos fijos ───────── */

function Assets() {
  const rows = ASSETS.map((a) => { const y = yearsSince(a.acquired); const dep = Math.min(a.cost, (a.cost / a.lifeYears) * y); return { ...a, dep, book: a.cost - dep, pct: Math.min(100, (y / a.lifeYears) * 100) }; });
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "n", header: "Activo", cell: (a) => <div><p className="text-[13px] font-medium">{a.name}</p><p className="font-mono text-[11px] text-fg-muted">{a.code}</p></div> },
    { key: "c", header: "Categoría", cell: (a) => <span className="text-[13px]">{a.category}</span>, hide: "xl" },
    { key: "w", header: "Asignado a", cell: (a) => <span className="text-[13px]">{a.assignedTo}</span> },
    { key: "cost", header: "Costo", align: "right", cell: (a) => money(a.cost), hide: "lg" },
    { key: "dep", header: "Depreciación", cell: (a) => <div className="flex min-w-[120px] items-center gap-2"><Progress value={a.pct} tone={a.pct > 80 ? "amber" : "blue"} className="w-16" /><span className="text-[11px] tabular-nums text-fg-muted">{Math.round(a.pct)}%</span></div> },
    { key: "book", header: "Valor en libros", align: "right", sort: (a) => a.book, cell: (a) => <b className="font-medium">{money(a.book)}</b> },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <KpiCard label="Activos registrados" value={rows.length} tone="blue" />
        <KpiCard label="Costo histórico" value={moneyShort(rows.reduce((s, a) => s + a.cost, 0))} tone="slate" />
        <KpiCard label="Valor en libros" value={moneyShort(rows.reduce((s, a) => s + a.book, 0))} tone="green" />
      </div>
      <div className="rounded-lg border"><DataTable rows={rows} columns={cols} rowKey={(a) => a.id} dense search={(a) => `${a.name} ${a.code} ${a.assignedTo}`} searchPlaceholder="Buscar activo…" /></div>
    </div>
  );
}

/* ───────── Sedes ───────── */

function Offices() {
  const [bookings, setBookings] = useDemoState("bookings-v1", ROOM_BOOKINGS);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ office: "o1", room: "Sala de juntas", date: new Date().toISOString().slice(0, 10), from: "15:00", to: "16:00", purpose: "" });
  const office = OFFICES.find((o) => o.id === f.office)!;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Sedes" value={OFFICES.length} tone="blue" />
        <KpiCard label="Personas en sedes" value={OFFICES.reduce((s, o) => s + o.staff, 0)} tone="slate" />
        <KpiCard label="Arriendos mensuales" value={moneyShort(OFFICES.reduce((s, o) => s + o.lease, 0))} tone="amber" />
        <KpiCard label="Reservas de hoy" value={bookings.filter((b) => b.date.slice(0, 10) === today).length} hint={`${bookings.length} programadas`} tone="green" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {OFFICES.map((o) => (
          <div key={o.id} className="rounded-lg border p-4">
            <p className="font-semibold">{o.name}</p>
            <p className="text-xs text-fg-muted">{o.address}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              <div><dt className="text-[11px] text-fg-muted">Personas</dt><dd>{o.staff}</dd></div>
              <div><dt className="text-[11px] text-fg-muted">Arriendo</dt><dd>{money(o.lease)}</dd></div>
              <div className="col-span-2"><dt className="text-[11px] text-fg-muted">Contrato hasta</dt><dd>{fmtDate(o.leaseEnd)}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">{o.rooms.map((r) => <Badge key={r}>{r}</Badge>)}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Reservas de salas</p><Button size="sm" onClick={() => setOpen(true)}><CalendarPlus /> Reservar sala</Button></div>
        <ul className="divide-y rounded-lg border">
          {bookings.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-28 whitespace-nowrap text-xs text-fg-muted">{fmtDate(b.date)} · {b.from}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{b.purpose}</p><p className="text-[11px] text-fg-muted">{b.room} · {OFFICES.find((o) => o.id === b.office)?.name} · {b.who}</p></div>
              <span className="whitespace-nowrap text-xs text-fg-muted">{b.from} – {b.to}</span>
            </li>
          ))}
        </ul>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Reservar sala" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => { if (!f.purpose) return; setBookings((xs) => [{ id: `rb${Date.now()}`, room: f.room, office: f.office, date: new Date(f.date).toISOString(), from: f.from, to: f.to, who: "Usuario actual", purpose: f.purpose }, ...xs]); setOpen(false); toast.success("Sala reservada"); }}>Reservar</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sede"><Select value={f.office} onChange={(e) => { const o = OFFICES.find((x) => x.id === e.target.value)!; setF({ ...f, office: o.id, room: o.rooms[0] }); }}>{OFFICES.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
          <Field label="Sala"><Select value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })}>{office.rooms.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Fecha"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Desde"><Input type="time" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field><Field label="Hasta"><Input type="time" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field></div>
          <Field label="Motivo" className="sm:col-span-2"><Input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
