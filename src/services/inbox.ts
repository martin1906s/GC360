import type { AIClassification, Channel, Client, Conversation, ID, Message } from "@/domain/types";
import { classify, suggestReply, wantsHuman } from "@/ai/engine";
import { CASE_CATEGORY } from "@/domain/constants";
import { addHours, nowISO, uid } from "@/lib/utils";
import { audit, findScoped, getCtx, repo, requirePerm } from "./core";
import { createCase, createTask } from "./cases";
import { createAIAction } from "./ai-actions";
import { db } from "@/store/db";

const linePrefix = (tenantId: ID) => (tenantId === "t_gran" ? "ln_" : "lna_");

/** Ejecuta la clasificación IA sobre los mensajes entrantes de la conversación (GC-RF-31). */
export function classifyConversation(conversationId: ID): AIClassification {
  const ctx = getCtx();
  const conv = findScoped("conversations", conversationId, ctx);
  if (!conv) throw new Error("Conversación no encontrada");
  const text = db()
    .messages.filter((m) => m.conversationId === conversationId && m.direction === "in")
    .map((m) => m.body)
    .join("\n");
  const ai = classify(text, linePrefix(ctx.tenant.id));
  repo.update("conversations", conversationId, { ai });
  audit({ entity: "conversation", entityId: conversationId, actorName: "Asistente GC360", actorType: "ia", action: "Clasificación IA", detail: `${ai.summary} (confianza ${Math.round(ai.confidence * 100)}%)` });
  return ai;
}

export function markRead(conversationId: ID) {
  repo.update("conversations", conversationId, { unread: 0 });
}

/** Crea un caso desde la conversación con la clasificación propuesta (F01 / RN-02). */
export function createCaseFromConversation(conversationId: ID, override?: Partial<{ title: string; assigneeId: ID; category: AIClassification["category"]; priority: AIClassification["priority"] }>) {
  const ctx = requirePerm("cases.edit");
  const conv = findScoped("conversations", conversationId, ctx);
  if (!conv) throw new Error("Conversación no encontrada");
  const ai = conv.ai ?? classifyConversation(conversationId);

  let clientId = conv.clientId;
  if (!clientId) {
    const client: Client = {
      id: uid("c"), tenantId: ctx.tenant.id, type: "persona", name: conv.contactName === "Desconocido" ? `Prospecto ${conv.contactHandle}` : conv.contactName,
      docType: "CC", docNumber: "Por validar", email: conv.contactHandle.includes("@") ? conv.contactHandle : "", phone: conv.contactHandle.includes("@") ? "" : conv.contactHandle,
      city: ai.extracted["Ciudad / zona"] ?? "Por definir", segment: "Personas", source: conv.channel === "whatsapp" ? "WhatsApp" : "Correo", ownerId: ctx.user.id,
      status: "prospecto", createdAt: nowISO(), tags: [],
    };
    repo.insert("clients", client);
    audit({ entity: "client", entityId: client.id, action: "Prospecto creado", detail: `${client.name} creado desde ${conv.channel}` });
    clientId = client.id;
    repo.update("conversations", conversationId, { clientId });
  }

  const category = override?.category ?? ai.category;
  const line = ai.lineId ? db().lines.find((l) => l.id === ai.lineId) : undefined;
  const assigneeId = override?.assigneeId ?? defaultAssignee(category);
  const c = createCase({
    title: override?.title ?? `${CASE_CATEGORY[category].label}${line ? ` — ${line.name}` : ""}${ai.extracted["Vehículo"] ? ` ${ai.extracted["Vehículo"]}` : ""}${ai.extracted["Placa"] ? ` · ${ai.extracted["Placa"]}` : ""}`,
    description: ai.summary,
    category,
    priority: override?.priority ?? ai.priority,
    clientId,
    assigneeId,
    lineId: ai.lineId,
    conversationId,
    channel: conv.channel,
    createdByAI: true,
  });
  repo.update("conversations", conversationId, { caseIds: [...conv.caseIds, c.id], assigneeId });
  addSystemMessage(conversationId, `Caso ${c.code} creado y asignado a ${db().users.find((u) => u.id === assigneeId)?.name}.`);

  // Tarea de respuesta propuesta por IA (F01)
  createTask({
    title: category === "siniestro" ? "Contactar al cliente y recopilar evidencias del siniestro" : `Responder y solicitar documentos a ${conv.contactName}`,
    type: "seguimiento", caseId: c.id, clientId, assigneeId, dueAt: addHours(category === "siniestro" ? 2 : 4), mandatory: true, origin: "ia",
  });
  if (category === "siniestro") {
    const pol = db().policies.find((p) => p.clientId === clientId && p.tenantId === ctx.tenant.id);
    if (pol) {
      repo.update("cases", c.id, { policyId: pol.id });
      repo.insert("claims", { id: uid("clm"), tenantId: ctx.tenant.id, caseId: c.id, policyId: pol.id, clientId, description: ai.summary, occurredAt: nowISO(), status: "reportado", amountClaimed: 0 });
    }
  }
  return c;
}

function defaultAssignee(category: string): ID {
  const ctx = getCtx();
  const users = db().users.filter((u) => u.tenantId === ctx.tenant.id);
  const role = ["siniestro", "modificacion", "renovacion"].includes(category) ? "operaciones" : category === "cartera" ? "financiero" : "asesor";
  if (ctx.user.role === role) return ctx.user.id;
  return users.find((u) => u.role === role)?.id ?? ctx.user.id;
}

export function addSystemMessage(conversationId: ID, body: string) {
  const ctx = getCtx();
  repo.insert("messages", { id: uid("m"), tenantId: ctx.tenant.id, conversationId, direction: "internal", author: "sistema", authorName: "Sistema", body, at: nowISO() });
}

/** Envío simulado: nunca sale de la plataforma (regla de prototipado). */
export function sendMessage(conversationId: ID, body: string, as: "agente" | "ia" = "agente") {
  const ctx = requirePerm("inbox.reply");
  const conv = findScoped("conversations", conversationId, ctx);
  if (!conv) throw new Error("Conversación no encontrada");
  const m: Message = {
    id: uid("m"), tenantId: ctx.tenant.id, conversationId, direction: "out", author: as,
    authorName: as === "ia" ? "Asistente GC360" : ctx.user.name, body, at: nowISO(), simulated: true,
  };
  repo.insert("messages", m);
  repo.update("conversations", conversationId, { lastMessageAt: m.at, ...(as === "agente" ? { mode: "humano", assigneeId: conv.assigneeId ?? ctx.user.id } : {}) });
  conv.caseIds.forEach((caseId) => {
    repo.update("cases", caseId, { updatedAt: nowISO() });
    audit({ entity: "conversation", entityId: conversationId, caseId, action: "Respuesta enviada", detail: body.slice(0, 120) });
  });
  return m;
}

/** Transferencia IA → humano sin perder contexto (GC-RF-16, RN-14). */
export function handoffToHuman(conversationId: ID, assigneeId?: ID, reason = "Solicitud del cliente") {
  const ctx = getCtx();
  const conv = findScoped("conversations", conversationId, ctx);
  if (!conv) return;
  const target = assigneeId ?? conv.assigneeId ?? defaultAssignee(conv.ai?.category ?? "consulta");
  const name = db().users.find((u) => u.id === target)?.name;
  repo.update("conversations", conversationId, { mode: "humano", assigneeId: target });
  addSystemMessage(conversationId, `${reason}. IA transfirió la conversación a ${name} con el historial completo. Respuestas automáticas suspendidas.`);
  audit({ entity: "conversation", entityId: conversationId, caseId: conv.caseIds[0], actorName: "Asistente GC360", actorType: "ia", action: "Transferencia a humano", detail: `${reason} → ${name}` });
}

export function returnToAI(conversationId: ID) {
  const ctx = getCtx();
  repo.update("conversations", conversationId, { mode: "ia" });
  addSystemMessage(conversationId, `${ctx.user.name} devolvió la atención al asistente virtual.`);
  audit({ entity: "conversation", entityId: conversationId, action: "Atención devuelta a IA", detail: "Modo automático reactivado" });
}

/* ───────── Simulador de mensajes entrantes ───────── */

export interface InboundScenario {
  key: string;
  label: string;
  channel: Channel;
  contactName: string;
  handle: string;
  subject?: string;
  body: string;
  attachments?: Message["attachments"];
}

export const SCENARIOS: InboundScenario[] = [
  { key: "auto", label: "WhatsApp · Cotizar vehículo", channel: "whatsapp", contactName: "Alejandro Torres", handle: "+57 323 555 0142", body: "Buenas! necesito asegurar mi vehículo, es un Toyota Corolla 2022 placa GTX-318, lo uso particular en Medellín. ¿Cuánto cuesta?" },
  { key: "siniestro", label: "WhatsApp · Reporte de siniestro", channel: "whatsapp", contactName: "Camilo Herrera", handle: "+57 310 000 0101", body: "Hola, me chocaron el carro saliendo del parqueadero en El Poblado, no hay heridos. Les mando fotos.", attachments: [{ name: "foto_choque_1.jpg", kind: "imagen", size: "1.8 MB" }] },
  { key: "humano", label: "WhatsApp · Pide un asesor humano", channel: "whatsapp", contactName: "Paola Jiménez", handle: "+57 319 000 0114", body: "Prefiero hablar con un asesor de verdad por favor, tengo dudas sobre el deducible." },
  { key: "hogar", label: "Correo · Cotizar hogar", channel: "email", contactName: "Beatriz Londoño", handle: "beatriz.londono@correo.demo", subject: "Seguro para mi casa", body: "Buenas tardes, quisiera cotizar un seguro de hogar para mi casa en Envigado de 140 m2. Adjunto escritura.", attachments: [{ name: "escritura.pdf", kind: "pdf", size: "2.4 MB" }] },
  { key: "cartera", label: "Microsoft 365 · Consulta de cuota", channel: "outlook", contactName: "María Fernanda López", handle: "mafe.lopez@correo.demo", subject: "Pago de cuota", body: "Hola, ¿me pueden confirmar cuántas cuotas debo de mi seguro de hogar? Quiero ponerme al día con el pago." },
];

export function simulateInbound(key: string) {
  const ctx = getCtx();
  const sc = SCENARIOS.find((s) => s.key === key);
  if (!sc) return;
  const data = db();
  let conv = data.conversations.find((c) => c.tenantId === ctx.tenant.id && c.contactHandle === sc.handle && c.status === "abierta");
  const client = data.clients.find((c) => c.tenantId === ctx.tenant.id && (c.phone === sc.handle || c.email === sc.handle));
  if (!conv) {
    conv = {
      id: uid("cv"), tenantId: ctx.tenant.id, channel: sc.channel, contactName: client?.name ?? sc.contactName, contactHandle: sc.handle, clientId: client?.id,
      subject: sc.subject, status: "abierta", mode: "ia", unread: 0, lastMessageAt: nowISO(), caseIds: [],
    } satisfies Conversation;
    repo.insert("conversations", conv);
  }
  const m: Message = { id: uid("m"), tenantId: ctx.tenant.id, conversationId: conv.id, direction: "in", author: "cliente", authorName: conv.contactName, body: sc.body, at: nowISO(), attachments: sc.attachments };
  repo.insert("messages", m);
  repo.update("conversations", conv.id, { unread: conv.unread + 1, lastMessageAt: m.at, status: "abierta" });
  processInboundWithAI(conv.id, sc.body);
  return conv.id;
}

/** Pipeline IA para mensaje entrante: clasificar → (transferir) → proponer respuesta pendiente de aprobación. */
export function processInboundWithAI(conversationId: ID, body: string) {
  const ctx = getCtx();
  const ai = classifyConversation(conversationId);
  const conv = findScoped("conversations", conversationId, ctx)!;
  if (wantsHuman(body)) {
    handoffToHuman(conversationId, undefined, "El cliente pidió atención humana");
    return;
  }
  if (conv.mode !== "ia") return;
  const lineName = ai.lineId ? db().lines.find((l) => l.id === ai.lineId)?.name : undefined;
  const reply = suggestReply(ai.category, conv.contactName, undefined, lineName);
  const sensitive = ["siniestro", "modificacion", "cartera"].includes(ai.category);
  createAIAction({
    kind: "responder",
    title: `Responder a ${conv.contactName} (${CASE_CATEGORY[ai.category].label.toLowerCase()})`,
    detail: `Respuesta sugerida basada en la clasificación (${Math.round(ai.confidence * 100)}%) y plantillas aprobadas.`,
    payload: { conversationId, body: reply, channel: conv.channel },
    source: `Mensaje ${conv.channel} · ${conv.contactHandle}`,
    instruction: "Sugerir respuesta a mensaje entrante",
    agent: "Asistente comercial virtual",
    conversationId,
    caseId: conv.caseIds[0],
    sensitive,
    confidence: ai.confidence,
  });
}

/** Mensaje enviado desde el portal del cliente (aparece en bandeja). */
export function clientPortalMessage(body: string) {
  const ctx = getCtx();
  const clientId = ctx.user.clientId!;
  const data = db();
  let conv = data.conversations.find((c) => c.tenantId === ctx.tenant.id && c.clientId === clientId && c.channel === "portal" && c.status === "abierta");
  if (!conv) {
    conv = { id: uid("cv"), tenantId: ctx.tenant.id, channel: "portal", contactName: ctx.user.name, contactHandle: ctx.user.email, clientId, status: "abierta", mode: "ia", unread: 0, lastMessageAt: nowISO(), caseIds: [] };
    repo.insert("conversations", conv);
  }
  repo.insert("messages", { id: uid("m"), tenantId: ctx.tenant.id, conversationId: conv.id, direction: "in", author: "cliente", authorName: ctx.user.name, body, at: nowISO() });
  repo.update("conversations", conv.id, { unread: conv.unread + 1, lastMessageAt: nowISO() });
  const ai = classify(body, linePrefix(ctx.tenant.id));
  repo.update("conversations", conv.id, { ai });
  if (wantsHuman(body)) {
    repo.update("conversations", conv.id, { mode: "humano" });
    repo.insert("messages", { id: uid("m"), tenantId: ctx.tenant.id, conversationId: conv.id, direction: "out", author: "ia", authorName: "Asistente GC360", body: "Entendido. Te estoy transfiriendo con un asesor humano; conservará todo el historial de esta conversación.", at: nowISO(), simulated: true });
  } else {
    repo.insert("messages", { id: uid("m"), tenantId: ctx.tenant.id, conversationId: conv.id, direction: "out", author: "ia", authorName: "Asistente GC360", body: suggestReply(ai.category, ctx.user.name), at: nowISO(), simulated: true });
  }
  return conv.id;
}
