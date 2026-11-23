import type { Claim, ID, Offer, Policy, Proposal, QuoteRequest } from "@/domain/types";
import { addDays, addHours, money, nowISO, uid } from "@/lib/utils";
import { audit, findScoped, getCtx, repo, requirePerm, scoped } from "./core";
import { changeCaseStatus, createCase, createTask } from "./cases";
import { createAIAction } from "./ai-actions";
import { suggestReply } from "@/ai/engine";
import { db } from "@/store/db";

const insurerName = (id: ID) => db().insurers.find((i) => i.id === id)?.short ?? id;

/* ───────── Solicitud de cotización (GC-RF-06, F02) ───────── */

export function createQuoteRequest(caseId: ID, lineId: ID, risk: Record<string, string>, insurerIds: ID[]): QuoteRequest {
  const ctx = requirePerm("quotes.edit");
  const c = findScoped("cases", caseId, ctx);
  if (!c) throw new Error("Caso no encontrado");
  const existing = scoped("quoteRequests", ctx).find((q) => q.caseId === caseId);
  const qr: QuoteRequest = existing
    ? { ...existing, lineId, risk, insurerIds }
    : { id: uid("qr"), tenantId: ctx.tenant.id, caseId, lineId, risk, insurerIds, status: "solicitada", createdAt: nowISO(), createdBy: ctx.user.id };
  if (existing) repo.update("quoteRequests", existing.id, { lineId, risk, insurerIds });
  else repo.insert("quoteRequests", qr);
  if (c.status === "nuevo" || c.status === "en_progreso" || c.status === "esperando_cliente") changeCaseStatus(caseId, "cotizando");
  repo.update("cases", caseId, { lineId });
  audit({ entity: "case", entityId: caseId, caseId, action: "Solicitud a aseguradoras", detail: `Solicitadas ofertas a ${insurerIds.map(insurerName).join(", ")}` });
  if (c.opportunityId) repo.update("opportunities", c.opportunityId, { stage: "cotizando" });
  return qr;
}

export function registerOffer(input: Omit<Offer, "id" | "tenantId" | "version" | "status" | "receivedAt">): Offer {
  const ctx = requirePerm("quotes.edit");
  const prev = scoped("offers", ctx).filter((o) => o.quoteRequestId === input.quoteRequestId && o.insurerId === input.insurerId);
  const o: Offer = { id: uid("of"), tenantId: ctx.tenant.id, version: prev.length + 1, status: "registrada", receivedAt: nowISO(), ...input };
  prev.forEach((p) => repo.update("offers", p.id, { status: "descartada" }));
  repo.insert("offers", o);
  repo.update("quoteRequests", input.quoteRequestId, { status: "ofertas_recibidas" });
  repo.insert("documents", { id: uid("d"), tenantId: ctx.tenant.id, name: `oferta_${insurerName(o.insurerId).toLowerCase()}_v${o.version}.pdf`, kind: "cotizacion", caseId: o.caseId, version: o.version, uploadedBy: ctx.user.name, at: nowISO(), validation: "validado", restricted: false, size: "380 KB" });
  audit({ entity: "offer", entityId: o.id, caseId: o.caseId, action: "Oferta registrada", detail: `${insurerName(o.insurerId)} · ${o.productName} · ${money(o.premium)}${o.version > 1 ? ` (versión ${o.version})` : ""}` });
  return o;
}

/* ───────── Propuesta y aceptación (GC-RF-22/23, F03) ───────── */

export function createProposal(caseId: ID, offerIds: ID[], recommendedOfferId?: ID): Proposal {
  const ctx = requirePerm("quotes.edit");
  const qr = scoped("quoteRequests", ctx).find((q) => q.caseId === caseId);
  if (!qr) throw new Error("El caso no tiene solicitud de cotización");
  const prev = scoped("proposals", ctx).filter((p) => p.caseId === caseId);
  const p: Proposal = { id: uid("pp"), tenantId: ctx.tenant.id, caseId, quoteRequestId: qr.id, offerIds, recommendedOfferId, version: prev.length + 1, status: "borrador", createdAt: nowISO(), advisorId: ctx.user.id };
  repo.insert("proposals", p);
  audit({ entity: "proposal", entityId: p.id, caseId, action: "Propuesta generada", detail: `Propuesta v${p.version} con ${offerIds.length} ofertas` });
  return p;
}

export function sendProposal(proposalId: ID) {
  const ctx = requirePerm("quotes.edit");
  const p = findScoped("proposals", proposalId, ctx);
  if (!p) throw new Error("Propuesta no encontrada");
  repo.update("proposals", proposalId, { status: "enviada", sentAt: nowISO() });
  repo.update("quoteRequests", p.quoteRequestId, { status: "propuesta_enviada" });
  changeCaseStatus(p.caseId, "propuesta");
  const c = db().cases.find((x) => x.id === p.caseId)!;
  if (c.opportunityId) repo.update("opportunities", c.opportunityId, { stage: "propuesta" });
  repo.insert("documents", { id: uid("d"), tenantId: ctx.tenant.id, name: `propuesta_${c.code}_v${p.version}.pdf`, kind: "propuesta", caseId: p.caseId, clientId: c.clientId, version: p.version, uploadedBy: ctx.user.name, at: nowISO(), validation: "validado", restricted: false, size: "520 KB" });
  if (c.conversationId) {
    repo.insert("messages", { id: uid("m"), tenantId: ctx.tenant.id, conversationId: c.conversationId, direction: "out", author: "agente", authorName: ctx.user.name, body: `Te comparto la propuesta comparativa (v${p.version}) con las opciones de aseguradoras. Cuéntame cuál prefieres o si quieres que te asesore.`, at: nowISO(), simulated: true, attachments: [{ name: `propuesta_${c.code}_v${p.version}.pdf`, kind: "pdf", size: "520 KB" }] });
  }
  audit({ entity: "proposal", entityId: proposalId, caseId: p.caseId, action: "Propuesta enviada", detail: `Propuesta v${p.version} enviada al cliente` });
}

export function acceptOffer(proposalId: ID, offerId: ID, evidence: string) {
  const ctx = requirePerm("quotes.edit");
  const p = findScoped("proposals", proposalId, ctx);
  if (!p) throw new Error("Propuesta no encontrada");
  const offer = findScoped("offers", offerId, ctx)!;
  repo.update("proposals", proposalId, { status: "aceptada", acceptedOfferId: offerId, acceptanceEvidence: evidence, acceptedAt: nowISO() });
  p.offerIds.forEach((id) => repo.update("offers", id, { status: id === offerId ? "seleccionada" : "descartada" }));
  repo.update("quoteRequests", p.quoteRequestId, { status: "aceptada" });
  const c = db().cases.find((x) => x.id === p.caseId)!;
  changeCaseStatus(p.caseId, "emision");
  if (c.opportunityId) repo.update("opportunities", c.opportunityId, { stage: "negociacion" });
  audit({ entity: "proposal", entityId: proposalId, caseId: p.caseId, action: "Aceptación del cliente registrada", detail: `Eligió ${insurerName(offer.insurerId)} · ${offer.productName} · ${money(offer.premium)}. Evidencia: ${evidence}. Asesor: ${ctx.user.name}` });

  // La solicitud de emisión ante la aseguradora es sensible → aprobación humana (GC-RF-39)
  createAIAction({
    kind: "solicitar_emision", title: `Solicitar emisión a ${insurerName(offer.insurerId)} — ${c.code}`,
    detail: `Enviar a ${insurerName(offer.insurerId)} la solicitud de expedición de ${offer.productName} con los documentos del caso.`,
    payload: { offerId, insurerId: offer.insurerId }, source: `Propuesta v${p.version} aceptada`, instruction: "Tramitar emisión tras aceptación del cliente",
    agent: "Agente de operaciones", caseId: c.id, sensitive: true, confidence: 0.95,
  });
  const ope = db().users.find((u) => u.tenantId === ctx.tenant.id && u.role === "operaciones");
  createTask({ title: `Registrar póliza recibida de ${insurerName(offer.insurerId)}`, type: "tarea", caseId: c.id, clientId: c.clientId, assigneeId: ope?.id ?? ctx.user.id, dueAt: addHours(48), mandatory: true, origin: "automatizacion" });
}

/* ───────── Registro y validación de póliza (GC-RF-24/25) ───────── */

export interface PolicyInput {
  number: string;
  startDate: string;
  endDate: string;
  premium: number;
  deductible: string;
  insuredValue: number;
  paymentMethod: Policy["paymentMethod"];
  installments: number;
  insuredItem: string;
}

export function registerPolicy(caseId: ID, input: PolicyInput): Policy {
  const ctx = requirePerm("policies.edit");
  const c = findScoped("cases", caseId, ctx);
  if (!c) throw new Error("Caso no encontrado");
  const proposal = scoped("proposals", ctx).find((p) => p.caseId === caseId && p.status === "aceptada");
  const offer = proposal?.acceptedOfferId ? findScoped("offers", proposal.acceptedOfferId, ctx) : undefined;
  if (!offer) throw new Error("No hay oferta aceptada para este caso");
  const insurer = db().insurers.find((i) => i.id === offer.insurerId)!;

  const discrepancies: Policy["validation"]["discrepancies"] = [];
  if (input.premium !== offer.premium) discrepancies.push({ field: "Prima", expected: money(offer.premium), received: money(input.premium) });
  if (input.deductible.trim() !== offer.deductible.trim()) discrepancies.push({ field: "Deducible", expected: offer.deductible, received: input.deductible });
  if (input.insuredValue !== offer.insuredValue) discrepancies.push({ field: "Valor asegurado", expected: money(offer.insuredValue), received: money(input.insuredValue) });

  const pol: Policy = {
    id: uid("pol"), tenantId: ctx.tenant.id, number: input.number, clientId: c.clientId, insurerId: offer.insurerId, lineId: c.lineId ?? "ln_auto",
    caseId, offerId: offer.id, proposalId: proposal!.id, insuredItem: input.insuredItem, startDate: input.startDate, endDate: input.endDate,
    premium: input.premium, insuredValue: input.insuredValue, deductible: input.deductible, paymentMethod: input.paymentMethod,
    installments: input.installments, commissionRate: insurer.commissionRate, status: "vigente",
    sellerId: db().clients.find((x) => x.id === c.clientId)?.sellerId,
    validation: { status: discrepancies.length ? "con_discrepancias" : "conforme", discrepancies, reviewedBy: discrepancies.length ? undefined : ctx.user.name },
  };
  repo.insert("policies", pol);

  // Cartera y comisión derivadas (F04 — datos demostrativos, RN-12)
  const n = Math.max(1, input.installments);
  for (let i = 0; i < n; i++) {
    repo.insert("installments", { id: uid("in"), tenantId: ctx.tenant.id, policyId: pol.id, number: i + 1, dueDate: addDays(i * 30 + 15, new Date(input.startDate)), amount: Math.round(input.premium / n), paid: false });
  }
  const seller = db().sellers.find((s) => s.id === pol.sellerId);
  const amount = Math.round(input.premium * insurer.commissionRate);
  repo.insert("commissions", { id: uid("cm"), tenantId: ctx.tenant.id, policyId: pol.id, insurerId: insurer.id, sellerId: pol.sellerId, base: input.premium, rate: insurer.commissionRate, amount, sellerAmount: Math.round(amount * (seller?.commissionShare ?? 0)), status: "causada", period: new Date().toLocaleDateString("es-CO", { month: "short", year: "numeric" }) });
  repo.insert("documents", { id: uid("d"), tenantId: ctx.tenant.id, name: `poliza_${input.number}.pdf`, kind: "poliza", policyId: pol.id, caseId, clientId: c.clientId, version: 1, uploadedBy: ctx.user.name, at: nowISO(), validation: discrepancies.length ? "pendiente" : "validado", restricted: false, size: "1.1 MB" });

  repo.update("cases", caseId, { policyId: pol.id });
  repo.update("clients", c.clientId, { status: "cliente" });
  if (c.opportunityId) repo.update("opportunities", c.opportunityId, { stage: "ganado" });
  scoped("tasks", ctx).filter((t) => t.caseId === caseId && t.title.startsWith("Registrar póliza")).forEach((t) => repo.update("tasks", t.id, { done: true }));
  audit({ entity: "policy", entityId: pol.id, caseId, action: "Póliza registrada", detail: `${pol.number} · ${insurer.short} · vigencia hasta ${new Date(pol.endDate).toLocaleDateString("es-CO")}` });
  audit({ entity: "policy", entityId: pol.id, caseId, actorName: "Agente de operaciones", actorType: "ia", action: "Validación póliza vs oferta", detail: discrepancies.length ? `${discrepancies.length} discrepancia(s): ${discrepancies.map((d) => d.field).join(", ")} — requiere revisión humana` : "Sin discrepancias frente a la oferta aceptada" });
  if (!discrepancies.length) changeCaseStatus(caseId, "resuelto", "Póliza emitida, validada y registrada");
  return pol;
}

export function resolveDiscrepancies(policyId: ID, note: string) {
  const ctx = requirePerm("policies.edit");
  const p = findScoped("policies", policyId, ctx);
  if (!p) return;
  repo.update("policies", policyId, { validation: { ...p.validation, status: "conforme", reviewedBy: ctx.user.name } });
  audit({ entity: "policy", entityId: policyId, caseId: p.caseId, action: "Discrepancias revisadas", detail: note });
}

/* ───────── Renovación (F05) ───────── */

export function startRenewal(policyId: ID) {
  const ctx = requirePerm("cases.edit");
  const p = findScoped("policies", policyId, ctx);
  if (!p) throw new Error("Póliza no encontrada");
  const existing = scoped("cases", ctx).find((c) => c.policyId === policyId && c.category === "renovacion" && !["cerrado", "resuelto"].includes(c.status));
  if (existing) return existing;
  const client = db().clients.find((c) => c.id === p.clientId)!;
  const c = createCase({
    title: `Renovación ${p.number} — ${client.name}`, description: `Póliza vence el ${new Date(p.endDate).toLocaleDateString("es-CO")}.`,
    category: "renovacion", priority: "alta", clientId: p.clientId, assigneeId: client.ownerId, lineId: p.lineId, policyId, channel: "web", createdByAI: true,
  });
  const conv = db().conversations.find((x) => x.clientId === p.clientId && x.tenantId === ctx.tenant.id && x.channel === "whatsapp");
  createAIAction({
    kind: "seguimiento", title: `Enviar aviso de renovación a ${client.name}`, detail: "Borrador generado con la plantilla «Aviso de renovación».",
    payload: { conversationId: conv?.id ?? "", channel: conv ? "whatsapp" : "email", to: client.email, body: `Hola ${client.name.split(" ")[0]}, tu póliza ${p.number} vence el ${new Date(p.endDate).toLocaleDateString("es-CO")}. Ya estamos preparando opciones de renovación con varias aseguradoras. ¿Hubo cambios en el bien asegurado o tus datos?` },
    source: `Póliza ${p.number}`, instruction: "Preparar seguimiento de renovación", agent: "Agente de operaciones", caseId: c.id, sensitive: true, confidence: 0.93,
  });
  createTask({ title: "Recotizar renovación con al menos 3 aseguradoras", type: "tarea", caseId: c.id, clientId: p.clientId, assigneeId: client.ownerId, dueAt: addDays(3), mandatory: true, origin: "automatizacion" });
  return c;
}

/* ───────── Siniestro (F06) ───────── */

export function openClaim(policyId: ID, description: string, amount: number) {
  const ctx = requirePerm("cases.edit");
  const p = findScoped("policies", policyId, ctx);
  if (!p) throw new Error("Póliza no encontrada");
  const ope = db().users.find((u) => u.tenantId === ctx.tenant.id && u.role === "operaciones");
  const c = createCase({ title: `Siniestro ${p.number}`, description, category: "siniestro", priority: "critica", clientId: p.clientId, assigneeId: ope?.id ?? ctx.user.id, lineId: p.lineId, policyId, channel: "llamada" });
  const cl: Claim = { id: uid("clm"), tenantId: ctx.tenant.id, caseId: c.id, policyId, clientId: p.clientId, description, occurredAt: nowISO(), status: "reportado", amountClaimed: amount };
  repo.insert("claims", cl);
  createTask({ title: "Recopilar evidencias y reportar a la aseguradora", type: "tarea", caseId: c.id, clientId: p.clientId, assigneeId: c.assigneeId, dueAt: addHours(4), mandatory: true, origin: "automatizacion" });
  return c;
}

export function updateClaimStatus(claimId: ID, status: Claim["status"], claimNumber?: string) {
  const ctx = requirePerm("claims.edit");
  const cl = findScoped("claims", claimId, ctx);
  if (!cl) return;
  repo.update("claims", claimId, { status, ...(claimNumber ? { claimNumber } : {}) });
  audit({ entity: "case", entityId: cl.caseId, caseId: cl.caseId, action: "Estado de siniestro", detail: `${cl.status} → ${status}${claimNumber ? ` · Radicado ${claimNumber}` : ""}` });
}

/* ───────── Endoso (GC-RF-26) ───────── */

export function requestEndorsement(policyId: ID, type: string, description: string) {
  const ctx = requirePerm("claims.edit");
  const p = findScoped("policies", policyId, ctx)!;
  const c = createCase({ title: `Endoso: ${type} — ${p.number}`, description, category: "modificacion", priority: "alta", clientId: p.clientId, assigneeId: ctx.user.id, lineId: p.lineId, policyId, channel: "web" });
  repo.insert("endorsements", { id: uid("en"), tenantId: ctx.tenant.id, policyId, caseId: c.id, type, description, status: "solicitado", at: nowISO() });
  createAIAction({ kind: "modificacion", title: `Enviar solicitud de endoso a ${insurerName(p.insurerId)}`, detail: `${type}: ${description}`, payload: {}, source: `Póliza ${p.number}`, instruction: "Escalar modificaciones contractuales", agent: "Agente de operaciones", caseId: c.id, sensitive: true, confidence: 0.9 });
  return c;
}

/* ───────── Cartera (demo) ───────── */

export function markInstallmentPaid(id: ID) {
  const ctx = requirePerm("finance.edit");
  const i = findScoped("installments", id, ctx);
  if (!i) return;
  repo.update("installments", id, { paid: true, paidAt: nowISO() });
  const p = db().policies.find((x) => x.id === i.policyId);
  audit({ entity: "policy", entityId: i.policyId, caseId: p?.caseId, action: "Pago registrado", detail: `Cuota ${i.number} · ${money(i.amount)}` });
}

export function liquidateCommission(id: ID) {
  const ctx = requirePerm("finance.edit");
  const cm = findScoped("commissions", id, ctx);
  if (!cm) return;
  repo.update("commissions", id, { status: "liquidada" });
  audit({ entity: "policy", entityId: cm.policyId, action: "Comisión liquidada", detail: `${money(cm.amount)} · ${insurerName(cm.insurerId)}` });
}

export function draftReplyForCase(caseId: ID) {
  const ctx = getCtx();
  const c = findScoped("cases", caseId, ctx)!;
  const client = db().clients.find((x) => x.id === c.clientId)!;
  return suggestReply(c.category, client.name, c.code, db().lines.find((l) => l.id === c.lineId)?.name);
}
