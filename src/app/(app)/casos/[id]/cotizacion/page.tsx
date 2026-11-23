"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Award, Check, CheckCircle2, CircleAlert, FileSignature, FileText, Minus, Plus, Printer, Scale, Send, ShieldCheck, BotMessageSquare, Wand2,
} from "lucide-react";
import { useCurrent, useLookups, useRecord, useScoped } from "@/hooks/use-data";
import { acceptOffer, createProposal, createQuoteRequest, registerOffer, registerPolicy, sendProposal } from "@/services/insurance";
import { summarizeOffers } from "@/ai/engine";
import type { Offer, OfferCoverage } from "@/domain/types";
import { Guard, NotFoundInTenant } from "@/components/layout/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Tabs } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { InsurerChip } from "@/components/domain/chips";
import { addDays, cn, fmtDate, money, sleep } from "@/lib/utils";

type Step = "solicitud" | "ofertas" | "comparador" | "propuesta" | "poliza";

const AUTO_FIELDS = [
  ["marca", "Marca"], ["modelo", "Modelo / línea"], ["anio", "Año"], ["placa", "Placa"], ["uso", "Uso"], ["ciudad", "Ciudad de circulación"], ["valorAsegurado", "Valor asegurado (COP)"], ["conductor", "Conductor principal"],
] as const;
const GENERIC_FIELDS = [["descripcion", "Descripción del riesgo"], ["ubicacion", "Ubicación"], ["valorAsegurado", "Valor asegurado (COP)"], ["actividad", "Actividad / uso"]] as const;
const AUTO_COVERAGES = ["Responsabilidad civil extracontractual", "Pérdida total por daños", "Pérdida parcial por daños", "Hurto total y parcial", "Asistencia en viaje 24/7", "Vehículo de reemplazo", "Accidentes personales conductor", "Gastos de transporte"];

export default function QuotePage() {
  return (
    <Guard perm="quotes.edit">
      <QuoteWorkspace />
    </Guard>
  );
}

function QuoteWorkspace() {
  const { id } = useParams<{ id: string }>();
  const c = useRecord("cases", id);
  const quotes = useScoped("quoteRequests");
  const offers = useScoped("offers");
  const proposals = useScoped("proposals");
  const policies = useScoped("policies");
  const qr = quotes.find((q) => q.caseId === id);
  const caseOffers = useMemo(() => offers.filter((o) => o.caseId === id && o.status !== "descartada" || (o.caseId === id && o.status === "descartada" && proposals.some((p) => p.caseId === id && p.offerIds.includes(o.id)))), [offers, id, proposals]);
  const activeOffers = caseOffers.filter((o) => qr?.insurerIds.includes(o.insurerId)).filter((o, _, arr) => !arr.some((x) => x.insurerId === o.insurerId && x.version > o.version));
  const proposal = proposals.filter((p) => p.caseId === id).sort((a, b) => b.version - a.version)[0];
  const policy = policies.find((p) => p.caseId === id && p.proposalId);

  const initial: Step = policy || proposal?.status === "aceptada" ? "poliza" : proposal ? "propuesta" : activeOffers.length >= 2 ? "comparador" : qr ? "ofertas" : "solicitud";
  const [step, setStep] = useState<Step>(initial);

  if (!c) return <NotFoundInTenant entity="caso" />;

  return (
    <div className="animate-fade-in">
      <Link href={`/casos/${c.id}`} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-3.5" /> {c.code}</Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-fg-muted">Gestión técnica de seguros</p>
          <h1 className="text-xl font-semibold tracking-tight">Cotización multiaseguradora · {c.code}</h1>
          <p className="mt-1 text-sm text-fg-muted">{c.title}</p>
        </div>
      </div>

      <Card>
        <Tabs
          className="px-3"
          value={step}
          onChange={setStep}
          tabs={[
            { key: "solicitud", label: "1 · Solicitud" },
            { key: "ofertas", label: "2 · Ofertas", count: activeOffers.length },
            { key: "comparador", label: "3 · Comparador" },
            { key: "propuesta", label: "4 · Propuesta y aceptación" },
            { key: "poliza", label: "5 · Póliza" },
          ]}
        />
        <CardContent>
          {step === "solicitud" && <RequestStep caseId={c.id} onDone={() => setStep("ofertas")} />}
          {step === "ofertas" && (qr ? <OffersStep qrId={qr.id} caseId={c.id} insurerIds={qr.insurerIds} offers={activeOffers} risk={qr.risk} onDone={() => setStep("comparador")} /> : <EmptyState title="Primero registra la solicitud" action={<Button onClick={() => setStep("solicitud")}>Ir a solicitud</Button>} />)}
          {step === "comparador" && <CompareStep offers={activeOffers} caseId={c.id} hasProposal={!!proposal} onDone={() => setStep("propuesta")} />}
          {step === "propuesta" && (proposal ? <ProposalStep proposalId={proposal.id} onDone={() => setStep("poliza")} /> : <EmptyState title="Aún no hay propuesta" description="Genera la propuesta desde el comparador." action={<Button onClick={() => setStep("comparador")}>Ir al comparador</Button>} />)}
          {step === "poliza" && <PolicyStep caseId={c.id} />}
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── 1. Solicitud ───────── */

function RequestStep({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const c = useRecord("cases", caseId)!;
  const quotes = useScoped("quoteRequests");
  const lines = useScoped("lines");
  const insurers = useScoped("insurers");
  const conv = useRecord("conversations", c.conversationId);
  const existing = quotes.find((q) => q.caseId === caseId);
  const [lineId, setLineId] = useState(existing?.lineId ?? c.lineId ?? lines[0]?.id);
  const [risk, setRisk] = useState<Record<string, string>>(existing?.risk ?? {});
  const [sel, setSel] = useState<string[]>(existing?.insurerIds ?? insurers.filter((i) => i.active).slice(0, 3).map((i) => i.id));
  const [extracting, setExtracting] = useState(false);
  const isAuto = lineId?.endsWith("auto");
  const fields = isAuto ? AUTO_FIELDS : GENERIC_FIELDS;

  const extract = async () => {
    setExtracting(true);
    await sleep(1100);
    const ex = conv?.ai?.extracted ?? {};
    const veh = ex["Vehículo"]?.split(" ") ?? [];
    setRisk((r) => ({
      ...r,
      ...(ex["Placa"] ? { placa: ex["Placa"] } : {}),
      ...(ex["Modelo (año)"] ? { anio: ex["Modelo (año)"] } : {}),
      ...(veh[0] ? { marca: veh[0] } : {}),
      ...(veh[1] ? { modelo: veh.slice(1).join(" ") } : {}),
      ...(ex["Ciudad / zona"] ? { ciudad: ex["Ciudad / zona"] } : {}),
      ...(ex["Uso"] ? { uso: ex["Uso"] } : {}),
    }));
    setExtracting(false);
    toast("Datos extraídos de la conversación y soportes", { description: Object.keys(ex).length ? "Revisa los campos antes de confirmar." : "No se encontraron datos estructurados.", icon: <BotMessageSquare className="size-4 text-brand-600" /> });
  };

  const submit = () => {
    if (sel.length < 1) return toast.error("Selecciona al menos una aseguradora");
    createQuoteRequest(caseId, lineId, risk, sel);
    toast.success(`Solicitud enviada a ${sel.length} aseguradoras`, { description: "Registra las ofertas a medida que lleguen." });
    onDone();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ramo" className="w-64">
            <Select value={lineId} onChange={(e) => setLineId(e.target.value)}>
              {lines.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          <Button variant="ai" size="md" onClick={extract} loading={extracting}><Wand2 /> Extraer datos con IA</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([k, label]) => (
            <Field key={k} label={label}>
              <Input value={risk[k] ?? ""} onChange={(e) => setRisk({ ...risk, [k]: e.target.value })} className={cn(risk[k] && extracting === false && conv?.ai && "bg-brand-50/40")} />
            </Field>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-fg-muted">Aseguradoras a consultar</p>
        <div className="space-y-2">
          {insurers.map((i) => (
            <label key={i.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition", sel.includes(i.id) ? "border-brand-400 bg-brand-50/40" : "hover:bg-slate-50", !i.active && "opacity-50")}>
              <input type="checkbox" disabled={!i.active} checked={sel.includes(i.id)} onChange={(e) => setSel(e.target.checked ? [...sel, i.id] : sel.filter((x) => x !== i.id))} className="accent-brand-600" />
              <InsurerChip id={i.id} />
              <span className="ml-auto text-[11px] text-fg-muted">{i.active ? `Calif. ${i.rating}` : "Inactiva"}</span>
            </label>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={submit}><Send /> {existing ? "Actualizar solicitud" : "Solicitar ofertas"}</Button>
        <p className="mt-2 text-center text-[11px] text-fg-subtle">Se recomienda presentar 3+ opciones para que el cliente decida.</p>
      </div>
    </div>
  );
}

/* ───────── 2. Ofertas ───────── */

function OffersStep({ qrId, caseId, insurerIds, offers, risk, onDone }: { qrId: string; caseId: string; insurerIds: string[]; offers: Offer[]; risk: Record<string, string>; onDone: () => void }) {
  const [modal, setModal] = useState<string | null>(null);
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insurerIds.map((iid) => {
          const o = offers.find((x) => x.insurerId === iid);
          return (
            <div key={iid} className={cn("rounded-lg border p-4", o ? "bg-white" : "border-dashed bg-slate-50/50")}>
              <div className="flex items-center justify-between">
                <InsurerChip id={iid} size="md" />
                {o ? <Badge tone="green" dot>Recibida · v{o.version}</Badge> : <Badge tone="amber" dot>Esperando oferta</Badge>}
              </div>
              {o ? (
                <div className="mt-4 space-y-2">
                  <p className="text-2xl font-semibold tabular-nums">{money(o.premium)}</p>
                  <p className="text-xs text-fg-muted">{o.productName} · deducible {o.deductible}</p>
                  <p className="text-xs text-fg-muted">{o.coverages.filter((x) => x.included).length}/{o.coverages.length} coberturas · validez {o.validityDays} días</p>
                  <Button size="xs" variant="ghost" onClick={() => setModal(iid)}>Registrar nueva versión</Button>
                </div>
              ) : (
                <Button className="mt-6 w-full" variant="secondary" onClick={() => setModal(iid)}><Plus /> Registrar oferta</Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <Button disabled={offers.length < 2} onClick={onDone}><Scale /> Comparar {offers.length} ofertas</Button>
      </div>
      {modal && <OfferModal insurerId={modal} qrId={qrId} caseId={caseId} risk={risk} onClose={() => setModal(null)} />}
    </div>
  );
}

function OfferModal({ insurerId, qrId, caseId, risk, onClose }: { insurerId: string; qrId: string; caseId: string; risk: Record<string, string>; onClose: () => void }) {
  const { insurers } = useLookups();
  const products = useScoped("products");
  const ins = insurers.get(insurerId)!;
  const product = products.find((p) => p.insurerId === insurerId);
  const value = Number(risk.valorAsegurado || 0);
  const [f, setF] = useState({ productName: product?.name ?? `${ins.short} Plan`, premium: "", insuredValue: String(value || ""), deductible: product?.deductible ?? "", validityDays: "30", notes: "", exclusions: "Conductor sin licencia vigente" });
  const [cov, setCov] = useState<OfferCoverage[]>(AUTO_COVERAGES.map((name) => ({ name, included: product ? product.coverages.includes(name) : true })));

  const sample = () => {
    const seed = insurerId.length * 7 + ins.short.length;
    const premium = Math.round(((value || 90_000_000) * (0.022 + (seed % 9) / 1000)) / 1000) * 1000;
    setF({ ...f, premium: String(premium), insuredValue: String(value || 90_000_000), deductible: product?.deductible ?? "10% mín. 1 SMMLV", notes: "Oferta de ejemplo cargada para la demostración." });
    toast("Valores de ejemplo cargados");
  };

  const submit = () => {
    if (!f.premium) return toast.error("La prima es obligatoria");
    registerOffer({ quoteRequestId: qrId, caseId, insurerId, productName: f.productName, premium: Number(f.premium), insuredValue: Number(f.insuredValue), deductible: f.deductible, coverages: cov, exclusions: f.exclusions.split("\n").filter(Boolean), validityDays: Number(f.validityDays), notes: f.notes });
    toast.success(`Oferta de ${ins.short} registrada`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`Registrar oferta · ${ins.name}`} description="Carga manual de la propuesta recibida de la aseguradora." footer={<><Button variant="ghost" onClick={sample} className="mr-auto"><Wand2 /> Usar valores de ejemplo</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}>Registrar oferta</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Producto"><Input value={f.productName} onChange={(e) => setF({ ...f, productName: e.target.value })} /></Field>
        <Field label="Prima anual (COP)" required><Input type="number" value={f.premium} onChange={(e) => setF({ ...f, premium: e.target.value })} /></Field>
        <Field label="Valor asegurado (COP)"><Input type="number" value={f.insuredValue} onChange={(e) => setF({ ...f, insuredValue: e.target.value })} /></Field>
        <Field label="Deducible"><Input value={f.deductible} onChange={(e) => setF({ ...f, deductible: e.target.value })} /></Field>
        <Field label="Validez de la oferta (días)"><Input type="number" value={f.validityDays} onChange={(e) => setF({ ...f, validityDays: e.target.value })} /></Field>
        <Field label="Observaciones"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium text-fg-muted">Coberturas</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {cov.map((c, i) => (
              <label key={c.name} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px]">
                <input type="checkbox" checked={c.included} onChange={(e) => setCov(cov.map((x, j) => (j === i ? { ...x, included: e.target.checked } : x)))} className="accent-brand-600" />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <Field label="Exclusiones (una por línea)" className="sm:col-span-2"><Textarea value={f.exclusions} onChange={(e) => setF({ ...f, exclusions: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* ───────── 3. Comparador ───────── */

function CompareStep({ offers, caseId, hasProposal, onDone }: { offers: Offer[]; caseId: string; hasProposal: boolean; onDone: () => void }) {
  const insurers = useScoped("insurers");
  const [loading, setLoading] = useState(true);
  const summary = useMemo(() => summarizeOffers(offers, insurers), [offers, insurers]);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, []);

  if (offers.length < 2) return <EmptyState title="Se necesitan al menos 2 ofertas para comparar" />;
  const covNames = Array.from(new Set(offers.flatMap((o) => o.coverages.map((c) => c.name))));
  const minPremium = Math.min(...offers.map((o) => o.premium));

  const gen = () => {
    createProposal(caseId, offers.map((o) => o.id), summary.recommendedId);
    toast.success("Propuesta comparativa generada");
    onDone();
  };

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-x-auto rounded-lg border scroll-thin">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-56 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Concepto</th>
              {offers.map((o) => (
                <th key={o.id} className={cn("px-4 py-3 text-left", o.id === summary.recommendedId && "bg-brand-50")}>
                  <InsurerChip id={o.insurerId} />
                  <p className="mt-1 text-[11px] font-normal text-fg-muted">{o.productName}</p>
                  {o.id === summary.recommendedId && <Badge tone="teal" className="mt-1"><Award className="size-3" /> Recomendada IA</Badge>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            <Row label="Prima anual" cells={offers.map((o) => <span key={o.id} className={cn("text-base font-semibold tabular-nums", o.premium === minPremium && "text-emerald-700")}>{money(o.premium)}{o.premium === minPremium && <Badge tone="green" className="ml-2">Menor</Badge>}</span>)} rec={offers.map((o) => o.id === summary.recommendedId)} />
            <Row label="Valor asegurado" cells={offers.map((o) => money(o.insuredValue))} rec={offers.map((o) => o.id === summary.recommendedId)} />
            <Row label="Deducible" cells={offers.map((o) => o.deductible)} rec={offers.map((o) => o.id === summary.recommendedId)} />
            <tr className="bg-slate-50/60"><td colSpan={offers.length + 1} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Coberturas</td></tr>
            {covNames.map((n) => (
              <Row key={n} label={n} cells={offers.map((o) => { const c = o.coverages.find((x) => x.name === n); return c?.included ? <span key={o.id} className="inline-flex items-center gap-1 text-emerald-700"><Check className="size-4" />{c.limit && <span className="text-xs text-fg-muted">{c.limit}</span>}</span> : <Minus key={o.id} className="size-4 text-rose-400" />; })} rec={offers.map((o) => o.id === summary.recommendedId)} />
            ))}
            <Row label="Exclusiones" cells={offers.map((o) => <ul key={o.id} className="list-disc space-y-0.5 pl-4 text-xs text-fg-muted">{o.exclusions.map((e) => <li key={e}>{e}</li>)}</ul>)} rec={offers.map((o) => o.id === summary.recommendedId)} />
            <Row label="Validez de la oferta" cells={offers.map((o) => `${o.validityDays} días`)} rec={offers.map((o) => o.id === summary.recommendedId)} />
            <Row label="Observaciones" cells={offers.map((o) => <span key={o.id} className="text-xs">{o.notes || "—"}</span>)} rec={offers.map((o) => o.id === summary.recommendedId)} />
          </tbody>
        </table>
      </div>

      <div className="order-first space-y-4 2xl:order-none">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-fg"><BotMessageSquare className="size-4" /> Resumen IA de ofertas</p>
          {loading ? (
            <div className="mt-3 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-3 animate-pulse rounded bg-slate-200" />)}</div>
          ) : (
            <div className="mt-2 animate-fade-in space-y-3">
              <p className="text-[13px] leading-relaxed">{summary.text}</p>
              <ul className="space-y-1.5">{summary.bullets.map((b) => <li key={b} className="flex gap-2 text-xs text-fg-muted"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600" />{b}</li>)}</ul>
              {summary.pending.length > 0 && (
                <div className="rounded-lg bg-amber-50 p-2.5">
                  <p className="text-[11px] font-semibold text-amber-900">Campos / condiciones pendientes</p>
                  {summary.pending.map((p) => <p key={p} className="mt-1 flex gap-1.5 text-xs text-amber-800"><CircleAlert className="mt-0.5 size-3 shrink-0" />{p}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
        <Button className="w-full" onClick={gen} disabled={hasProposal && false}><FileSignature /> {hasProposal ? "Generar nueva versión de propuesta" : "Generar propuesta comercial"}</Button>
      </div>
    </div>
  );
}

function Row({ label, cells, rec }: { label: string; cells: React.ReactNode[]; rec: boolean[] }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-[13px] text-fg-muted">{label}</td>
      {cells.map((c, i) => <td key={i} className={cn("px-4 py-2.5 align-top text-[13px]", rec[i] && "bg-brand-50/50")}>{c}</td>)}
    </tr>
  );
}

/* ───────── 4. Propuesta y aceptación ───────── */

function ProposalStep({ proposalId, onDone }: { proposalId: string; onDone: () => void }) {
  const { user, tenant } = useCurrent();
  const p = useRecord("proposals", proposalId)!;
  const c = useRecord("cases", p.caseId)!;
  const client = useRecord("clients", c.clientId);
  const allOffers = useScoped("offers");
  const { insurers, users } = useLookups();
  const offers = allOffers.filter((o) => p.offerIds.includes(o.id));
  const [preview, setPreview] = useState(false);
  const [choice, setChoice] = useState(p.acceptedOfferId ?? p.recommendedOfferId ?? offers[0]?.id);
  const [evidence, setEvidence] = useState("Confirmación del cliente por WhatsApp");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={p.status === "aceptada" ? "green" : p.status === "enviada" ? "teal" : "slate"} dot>Propuesta v{p.version} · {p.status}</Badge>
          {p.sentAt && <span className="text-xs text-fg-muted">Enviada {fmtDate(p.sentAt)}</span>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {offers.map((o) => (
            <button key={o.id} disabled={p.status === "aceptada"} onClick={() => setChoice(o.id)} className={cn("rounded-lg border p-4 text-left transition", choice === o.id ? "border-brand-500 ring-4 ring-brand-500/10" : "hover:border-slate-300", p.acceptedOfferId === o.id && "border-emerald-400 bg-emerald-50/50")}>
              <InsurerChip id={o.insurerId} />
              <p className="mt-2 text-lg font-semibold tabular-nums">{money(o.premium)}</p>
              <p className="text-[11px] text-fg-muted">{o.productName}</p>
              {o.id === p.recommendedOfferId && <Badge tone="teal" className="mt-2">Recomendada</Badge>}
              {p.acceptedOfferId === o.id && <Badge tone="green" className="ml-1 mt-2">Aceptada</Badge>}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreview(true)}><FileText /> Vista previa PDF</Button>
          {p.status === "borrador" && <Button onClick={() => { sendProposal(p.id); toast.success("Propuesta enviada al cliente"); }}><Send /> Enviar al cliente</Button>}
        </div>
      </div>

      <div className="rounded-lg border bg-slate-50/60 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="size-4 text-emerald-600" /> Aceptación del cliente</p>
        {p.status === "aceptada" ? (
          <div className="mt-3 space-y-2 text-[13px]">
            <p>Opción elegida: <b>{insurers.get(offers.find((o) => o.id === p.acceptedOfferId)?.insurerId ?? "")?.short}</b></p>
            <p className="text-fg-muted">Evidencia: {p.acceptanceEvidence}</p>
            <p className="text-fg-muted">Asesor: {users.get(p.advisorId)?.name} · {fmtDate(p.acceptedAt)}</p>
            <Button className="mt-2 w-full" onClick={onDone}>Continuar a registro de póliza →</Button>
          </div>
        ) : p.status === "borrador" ? (
          <p className="mt-2 text-xs text-fg-muted">Envía la propuesta para registrar la decisión del cliente.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <Field label="Oferta elegida por el cliente">
              <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
                {offers.map((o) => <option key={o.id} value={o.id}>{insurers.get(o.insurerId)?.short} — {money(o.premium)}</option>)}
              </Select>
            </Field>
            <Field label="Evidencia de aceptación"><Textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} className="min-h-[60px]" /></Field>
            <Button className="w-full" variant="success" onClick={() => { acceptOffer(p.id, choice!, evidence); toast.success("Aceptación registrada", { description: "Se generó solicitud de emisión pendiente de aprobación humana y tarea para operaciones." }); onDone(); }}>
              <Check /> Registrar aceptación
            </Button>
            <p className="text-[11px] text-fg-muted">La solicitud de emisión a la aseguradora requiere aprobación de un supervisor.</p>
          </div>
        )}
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} size="xl" title="Propuesta comercial (vista previa)" description="Vista previa del documento para el cliente" footer={<Button onClick={() => window.print()}><Printer /> Imprimir / PDF</Button>}>
        <div className="print-area rounded-lg border bg-white p-8 text-sm">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <p className="text-lg font-bold" style={{ color: tenant?.brandColor }}>{tenant?.name}</p>
              <p className="text-xs text-fg-muted">{tenant?.legalName} · NIT {tenant?.nit}</p>
            </div>
            <div className="text-right text-xs text-fg-muted">
              <p>Propuesta {c.code} · v{p.version}</p>
              <p>{fmtDate(p.createdAt)}</p>
            </div>
          </div>
          <p className="mt-5">Señor(a) <b>{client?.name}</b>,</p>
          <p className="mt-2 text-fg-muted">Presentamos el comparativo de {offers.length} aseguradoras para <b className="text-fg">{c.title}</b>. Las condiciones corresponden a las ofertas registradas y están sujetas a validación de la aseguradora.</p>
          <table className="mt-5 w-full border text-xs">
            <thead className="bg-slate-50"><tr><th className="border p-2 text-left">Aseguradora</th><th className="border p-2 text-left">Producto</th><th className="border p-2 text-right">Prima</th><th className="border p-2 text-left">Deducible</th><th className="border p-2 text-left">Coberturas</th><th className="border p-2 text-left">Exclusiones</th></tr></thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className={o.id === p.recommendedOfferId ? "bg-brand-50" : ""}>
                  <td className="border p-2 font-medium">{insurers.get(o.insurerId)?.short}{o.id === p.recommendedOfferId ? " ★" : ""}</td>
                  <td className="border p-2">{o.productName}</td>
                  <td className="border p-2 text-right font-semibold">{money(o.premium)}</td>
                  <td className="border p-2">{o.deductible}</td>
                  <td className="border p-2">{o.coverages.filter((x) => x.included).length}/{o.coverages.length}</td>
                  <td className="border p-2">{o.exclusions.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-fg-muted">★ Opción recomendada por balance precio/cobertura. La decisión final es del cliente. Condiciones sujetas a validación de la aseguradora.</p>
          <p className="mt-8 text-xs">Asesor: <b>{users.get(p.advisorId)?.name ?? user?.name}</b></p>
        </div>
      </Modal>
    </div>
  );
}

/* ───────── 5. Póliza ───────── */

function PolicyStep({ caseId }: { caseId: string }) {
  const { can } = useCurrent();
  const proposals = useScoped("proposals");
  const offers = useScoped("offers");
  const policies = useScoped("policies");
  const c = useRecord("cases", caseId)!;
  const proposal = proposals.find((p) => p.caseId === caseId && p.status === "aceptada");
  const offer = offers.find((o) => o.id === proposal?.acceptedOfferId);
  const policy = policies.find((p) => p.caseId === caseId && p.proposalId === proposal?.id);
  const { insurers } = useLookups();
  const qr = useScoped("quoteRequests").find((q) => q.caseId === caseId);
  const [f, setF] = useState(() => ({
    number: `${insurers.get(offer?.insurerId ?? "")?.short.slice(0, 3).toUpperCase() ?? "POL"}-AU-2026-${Math.floor(100000 + Math.random() * 899999)}`,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: addDays(365).slice(0, 10),
    premium: String(offer?.premium ?? ""),
    deductible: offer?.deductible ?? "",
    insuredValue: String(offer?.insuredValue ?? ""),
    paymentMethod: "cuotas" as const,
    installments: "10",
    insuredItem: qr?.risk.marca ? `${qr.risk.marca} ${qr.risk.modelo ?? ""} ${qr.risk.anio ?? ""} · ${qr.risk.placa ?? ""}` : c.title,
  }));

  if (!proposal || !offer) return <EmptyState title="Sin oferta aceptada" description="La póliza se registra después de que el cliente acepte una oferta." />;

  if (policy) {
    const ok = policy.validation.status === "conforme";
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className={cn("mx-auto grid size-14 place-items-center rounded-xl", ok ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>{ok ? <CheckCircle2 className="size-7" /> : <CircleAlert className="size-7" />}</div>
        <h3 className="mt-3 text-lg font-semibold">Póliza {policy.number} registrada</h3>
        <p className="mt-1 text-sm text-fg-muted">{ok ? "La validación contra la oferta aceptada no encontró discrepancias." : "Se detectaron discrepancias frente a la oferta aceptada. Requiere revisión humana."}</p>
        {!ok && (
          <div className="mx-auto mt-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm">
            {policy.validation.discrepancies.map((d) => <p key={d.field}><b>{d.field}:</b> esperado {d.expected} · recibido {d.received}</p>)}
          </div>
        )}
        <p className="mt-4 text-xs text-fg-muted">Se generaron automáticamente: plan de cuotas (cartera), comisión de intermediación y documento de póliza. Datos de ejemplo — sin cobros reales.</p>
        <Link href={`/polizas/${policy.id}`} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"><FileText className="size-4" /> Ver póliza, cartera y comisión</Link>
      </div>
    );
  }

  const submit = () => {
    try {
      const pol = registerPolicy(caseId, { ...f, premium: Number(f.premium), insuredValue: Number(f.insuredValue), installments: Number(f.installments), startDate: new Date(f.startDate).toISOString(), endDate: new Date(f.endDate).toISOString() });
      toast[pol.validation.status === "conforme" ? "success" : "warning"](pol.validation.status === "conforme" ? "Póliza registrada y validada" : "Póliza registrada con discrepancias");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="mb-4 text-sm text-fg-muted">Registra la póliza recibida de la aseguradora. Al guardar, el agente de operaciones la compara con la oferta aceptada campo por campo.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Número de póliza"><Input value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
          <Field label="Bien asegurado"><Input value={f.insuredItem} onChange={(e) => setF({ ...f, insuredItem: e.target.value })} /></Field>
          <Field label="Inicio de vigencia"><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="Fin de vigencia"><Input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
          <Field label="Prima (COP)"><Input type="number" value={f.premium} onChange={(e) => setF({ ...f, premium: e.target.value })} /></Field>
          <Field label="Valor asegurado (COP)"><Input type="number" value={f.insuredValue} onChange={(e) => setF({ ...f, insuredValue: e.target.value })} /></Field>
          <Field label="Deducible"><Input value={f.deductible} onChange={(e) => setF({ ...f, deductible: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Forma de pago">
              <Select value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value as never })}>
                <option value="contado">Contado</option><option value="cuotas">Cuotas</option><option value="financiado">Financiado</option>
              </Select>
            </Field>
            <Field label="Cuotas"><Input type="number" min={1} value={f.installments} onChange={(e) => setF({ ...f, installments: e.target.value })} /></Field>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-fg-muted"><FileText className="size-5" /> poliza_{f.number}.pdf</div>
      </div>
      <div className="rounded-lg border bg-slate-50/60 p-4">
        <p className="text-sm font-semibold">Oferta aceptada (referencia)</p>
        <div className="mt-3 space-y-2 text-[13px]">
          <InsurerChip id={offer.insurerId} />
          <p>Prima: <b>{money(offer.premium)}</b></p>
          <p>Deducible: <b>{offer.deductible}</b></p>
          <p>Valor asegurado: <b>{money(offer.insuredValue)}</b></p>
        </div>
        <Button className="mt-5 w-full" onClick={submit} disabled={!can("policies.edit")}><ShieldCheck /> Registrar y validar póliza</Button>
        {!can("policies.edit") && <p className="mt-2 text-[11px] text-amber-700">Esta acción la realiza el equipo de operaciones.</p>}
      </div>
    </div>
  );
}
