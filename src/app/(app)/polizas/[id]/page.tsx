"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, FilePen, FileText, RefreshCcw, ShieldAlert, Wallet } from "lucide-react";
import { useCurrent, useLookups, useRecord, useScoped } from "@/hooks/use-data";
import { markInstallmentPaid, openClaim, requestEndorsement, resolveDiscrepancies, startRenewal } from "@/services/insurance";
import { CASE_STATUS, COMMISSION_STATUS, POLICY_STATUS } from "@/domain/constants";
import { Guard, NotFoundInTenant } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, MetaBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, Stat } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ClientLink, InsurerChip, LineName } from "@/components/domain/chips";
import { cn, daysUntil, fmtDate, money, pct } from "@/lib/utils";

export default function PolicyDetailPage() {
  return <Guard perm="policies.view"><PolicyDetail /></Guard>;
}

function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useCurrent();
  const { sellers } = useLookups();
  const p = useRecord("policies", id);
  const installments = useScoped("installments").filter((i) => i.policyId === id).sort((a, b) => a.number - b.number);
  const commission = useScoped("commissions").find((c) => c.policyId === id);
  const docs = useScoped("documents").filter((d) => d.policyId === id);
  const related = useScoped("cases").filter((c) => c.policyId === id);
  const endorsements = useScoped("endorsements").filter((e) => e.policyId === id);
  const offer = useRecord("offers", p?.offerId);
  const [claimOpen, setClaimOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");

  if (!p) return <NotFoundInTenant entity="póliza" />;

  const days = daysUntil(p.endDate);
  const total = Math.max(1, (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000);
  const elapsed = Math.min(100, Math.max(0, ((total - days) / total) * 100));
  const paid = installments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const balance = installments.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const late = installments.filter((i) => !i.paid && new Date(i.dueDate) < new Date());

  const renew = () => {
    try {
      const c = startRenewal(p.id);
      toast.success(`Caso de renovación ${c.code}`, { description: "Se generó borrador de aviso pendiente de aprobación (F05)." });
      router.push(`/casos/${c.id}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="animate-fade-in">
      <Link href="/polizas" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-3.5" /> Pólizas</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <InsurerChip id={p.insurerId} size="md" />
          <div>
            <div className="flex flex-wrap items-center gap-2"><h1 className="font-mono text-lg font-semibold">{p.number}</h1><MetaBadge map={POLICY_STATUS} value={p.status} /></div>
            <p className="text-sm text-fg-muted">{p.insuredItem} · <LineName id={p.lineId} /></p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("cases.edit") && <Button variant="secondary" onClick={renew}><RefreshCcw /> Iniciar renovación</Button>}
          {can("claims.edit") && <Button variant="secondary" onClick={() => setEndOpen(true)}><FilePen /> Solicitar endoso</Button>}
          {can("cases.edit") && <Button variant="danger" onClick={() => setClaimOpen(true)}><ShieldAlert /> Reportar siniestro</Button>}
        </div>
      </div>

      {p.validation.status === "con_discrepancias" && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="size-4" /> Validación: póliza recibida vs. oferta aceptada</p>
          <table className="mt-3 w-full max-w-xl text-sm">
            <thead><tr className="text-left text-xs text-amber-800"><th className="py-1">Campo</th><th>Oferta aceptada</th><th>Póliza recibida</th></tr></thead>
            <tbody>{p.validation.discrepancies.map((d) => <tr key={d.field}><td className="py-1 font-medium">{d.field}</td><td>{d.expected}</td><td className="font-semibold text-rose-700">{d.received}</td></tr>)}</tbody>
          </table>
          {can("policies.edit") && (
            <div className="mt-3 flex max-w-xl gap-2">
              <Input value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Resultado de la revisión humana (ej. aseguradora corregirá vía endoso)" className="bg-white" />
              <Button disabled={!resolveNote} onClick={() => { resolveDiscrepancies(p.id, resolveNote); toast.success("Revisión registrada"); }}>Marcar revisada</Button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Condiciones" icon={<FileText />} action={p.validation.status === "conforme" && <Badge tone="green"><CheckCircle2 className="size-3" /> Validada {p.validation.reviewedBy ? `· ${p.validation.reviewedBy}` : ""}</Badge>} />
          <CardContent>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <Stat label="Cliente" value={<ClientLink id={p.clientId} />} className="col-span-2" />
              <Stat label="Prima anual" value={money(p.premium)} />
              <Stat label="Valor asegurado" value={money(p.insuredValue)} />
              <Stat label="Deducible" value={p.deductible} />
              <Stat label="Forma de pago" value={`${p.paymentMethod} · ${p.installments} cuota(s)`} />
              <Stat label="Inicio" value={fmtDate(p.startDate)} />
              <Stat label="Fin" value={fmtDate(p.endDate)} />
            </div>
            <div className="mt-6">
              <div className="mb-1.5 flex justify-between text-xs text-fg-muted"><span>Vigencia transcurrida</span><span className={cn(days <= 30 && "font-semibold text-amber-700")}>{days >= 0 ? `${days} días para el vencimiento` : "Vencida"}</span></div>
              <Progress value={elapsed} tone={days <= 15 ? "red" : days <= 30 ? "amber" : "green"} />
            </div>
            {offer && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Coberturas (según oferta aceptada)</p>
                <div className="flex flex-wrap gap-1.5">{offer.coverages.map((c) => <Badge key={c.name} tone={c.included ? "green" : "slate"}>{c.included ? "✓" : "✗"} {c.name}</Badge>)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Comisión" description="De intermediación" icon={<Wallet />} />
          <CardContent>
            {commission ? (
              <div className="space-y-3">
                <p className="text-2xl font-semibold tabular-nums">{money(commission.amount)}</p>
                <p className="text-xs text-fg-muted">{pct(commission.rate)} sobre prima de {money(commission.base)}</p>
                <MetaBadge map={COMMISSION_STATUS} value={commission.status} />
                {commission.sellerId && <div className="rounded-lg bg-slate-50 p-3 text-xs"><p className="text-fg-muted">Participación {sellers.get(commission.sellerId)?.name}</p><p className="mt-0.5 font-semibold">{money(commission.sellerAmount)}</p></div>}
              </div>
            ) : <p className="text-sm text-fg-muted">Sin comisión registrada.</p>}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Cartera de la póliza" description={`Pagado ${money(paid)} · Saldo ${money(balance)}`} icon={<Wallet />} action={late.length > 0 && <Badge tone="red">{late.length} cuota(s) vencida(s)</Badge>} />
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-fg-muted">
                  <th className="px-5 py-2.5">Cuota</th>
                  <th className="px-4 py-2.5">Vence</th>
                  <th className="px-4 py-2.5">Valor</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="pr-5 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {installments.map((i) => {
                  const overdue = !i.paid && new Date(i.dueDate) < new Date();
                  return (
                    <tr key={i.id} className="border-b last:border-0 whitespace-nowrap">
                      <td className="px-5 py-2.5 font-medium">{i.number}</td>
                      <td className="px-4 py-2.5 text-[13px]">{fmtDate(i.dueDate)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-[13px]">{money(i.amount)}</td>
                      <td className="px-4 py-2.5">{i.paid ? <Badge tone="green">Pagada</Badge> : overdue ? <Badge tone="red">Vencida</Badge> : <Badge>Pendiente</Badge>}</td>
                      <td className="pr-5 py-2.5 text-right">{!i.paid && can("finance.edit") && <Button size="xs" variant="ghost" onClick={() => { markInstallmentPaid(i.id); toast.success("Pago registrado"); }}>Registrar pago</Button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Casos y servicios" />
            <ul className="divide-y">
              {related.length === 0 && endorsements.length === 0 && <p className="px-5 py-4 text-sm text-fg-muted">Sin servicios.</p>}
              {related.map((c) => <li key={c.id}><Link href={`/casos/${c.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 hover:bg-slate-50"><div className="min-w-0"><p className="font-mono text-[11px] text-fg-muted">{c.code}</p><p className="truncate text-[13px]">{c.title}</p></div><MetaBadge map={CASE_STATUS} value={c.status} /></Link></li>)}
              {endorsements.map((e) => <li key={e.id} className="px-5 py-2.5"><p className="text-[13px] font-medium">Endoso: {e.type}</p><p className="text-[11px] text-fg-muted">{e.description} · {e.status}</p></li>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Documentos" />
            <ul className="divide-y">
              {docs.map((d) => <li key={d.id} className="flex items-center gap-2 px-5 py-2.5"><FileText className="size-4 text-fg-subtle" /><span className="min-w-0 flex-1 truncate text-[13px]">{d.name}</span><span className="text-[11px] text-fg-muted">v{d.version}</span></li>)}
              {docs.length === 0 && <p className="px-5 py-4 text-sm text-fg-muted">Sin documentos.</p>}
            </ul>
          </Card>
        </div>
      </div>

      <ClaimModal open={claimOpen} onClose={() => setClaimOpen(false)} policyId={p.id} />
      <EndorsementModal open={endOpen} onClose={() => setEndOpen(false)} policyId={p.id} />
    </div>
  );
}

function ClaimModal({ open, onClose, policyId }: { open: boolean; onClose: () => void; policyId: string }) {
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Reportar siniestro" description="Se creará un caso prioritario y el equipo de operaciones te acompañará en el trámite." footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" onClick={() => { if (!desc) return; const c = openClaim(policyId, desc, Number(amount || 0)); toast.success(`Caso de siniestro ${c.code} creado`); router.push(`/casos/${c.id}`); }}>Abrir caso</Button></>}>
      <div className="space-y-4">
        <Field label="Descripción de lo ocurrido"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Valor estimado (COP)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function EndorsementModal({ open, onClose, policyId }: { open: boolean; onClose: () => void; policyId: string }) {
  const router = useRouter();
  const [type, setType] = useState("Cambio de placa");
  const [desc, setDesc] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Solicitar endoso / modificación" description="La solicitud se enviará a la aseguradora después de ser aprobada." footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (!desc) return; const c = requestEndorsement(policyId, type, desc); toast.success(`Caso ${c.code} creado`, { description: "Solicitud a la aseguradora pendiente de aprobación." }); router.push(`/casos/${c.id}`); }}>Crear solicitud</Button></>}>
      <div className="space-y-4">
        <Field label="Tipo"><Select value={type} onChange={(e) => setType(e.target.value)}>{["Cambio de placa", "Inclusión de asegurado", "Inclusión de ubicación", "Cambio de valor asegurado", "Cambio de beneficiario"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Detalle"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
