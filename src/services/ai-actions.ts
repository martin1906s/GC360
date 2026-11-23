import type { AIAction, ID } from "@/domain/types";
import { addHours, nowISO, uid } from "@/lib/utils";
import { audit, findScoped, getCtx, repo, requirePerm } from "./core";
import { db } from "@/store/db";

type NewAction = Omit<AIAction, "id" | "tenantId" | "createdAt" | "status"> & { status?: AIAction["status"] };

/**
 * Registra una acción propuesta por un agente IA (GC-RF-34/38).
 * Las sensibles quedan pendientes de aprobación humana (RN-08, GC-RF-39);
 * las no sensibles quedan como «sugeridas» para ejecución con un clic.
 */
export function createAIAction(input: NewAction): AIAction {
  const ctx = getCtx();
  const a: AIAction = { id: uid("ai"), tenantId: ctx.tenant.id, createdAt: nowISO(), status: input.status ?? (input.sensitive ? "pendiente" : "sugerida"), ...input };
  repo.insert("aiActions", a);
  audit({ entity: "ai_action", entityId: a.id, caseId: a.caseId, actorName: a.agent, actorType: "ia", action: "Acción IA propuesta", detail: `${a.title} · ${a.sensitive ? "requiere aprobación" : "no sensible"}` });
  return a;
}

/** Ejecuta los efectos de la acción (siempre simulados: no hay envíos reales). */
function execute(a: AIAction, finalBody?: string) {
  const ctx = getCtx();
  const p = a.payload as Record<string, string>;
  if ((a.kind === "responder" || a.kind === "seguimiento") && p.conversationId) {
    repo.insert("messages", {
      id: uid("m"), tenantId: ctx.tenant.id, conversationId: p.conversationId, direction: "out", author: "ia",
      authorName: "Asistente GC360", body: finalBody ?? p.body, at: nowISO(), simulated: true,
    });
    repo.update("conversations", p.conversationId, { lastMessageAt: nowISO() });
  }
  if (a.kind === "crear_tarea" && a.caseId) {
    const c = db().cases.find((x) => x.id === a.caseId);
    repo.insert("tasks", { id: uid("t"), tenantId: ctx.tenant.id, title: p.title ?? a.title.replace(/^Crear tarea:\s*/i, ""), type: "tarea", caseId: a.caseId, clientId: c?.clientId, assigneeId: c?.assigneeId ?? ctx.user.id, dueAt: addHours(24), done: false, mandatory: false, origin: "ia", createdAt: nowISO() });
  }
  if (a.caseId) repo.update("cases", a.caseId, { updatedAt: nowISO() });
}

export function approveAIAction(id: ID, note?: string, editedBody?: string) {
  const ctx = getCtx();
  const a = findScoped("aiActions", id, ctx);
  if (!a) throw new Error("Acción no encontrada");
  if (a.sensitive) requirePerm("ai.approve");
  repo.update("aiActions", id, { status: "ejecutada", decidedBy: ctx.user.name, decidedAt: nowISO(), decisionNote: note, ...(editedBody ? { payload: { ...a.payload, body: editedBody } } : {}) });
  execute(a, editedBody);
  audit({ entity: "ai_action", entityId: id, caseId: a.caseId, action: "Acción IA aprobada y ejecutada", detail: `${a.title}${note ? ` · Nota: ${note}` : ""}${editedBody ? " · Texto editado por el aprobador" : ""}` });
}

export function rejectAIAction(id: ID, note: string) {
  const ctx = getCtx();
  const a = findScoped("aiActions", id, ctx);
  if (!a) throw new Error("Acción no encontrada");
  if (a.sensitive) requirePerm("ai.approve");
  repo.update("aiActions", id, { status: "rechazada", decidedBy: ctx.user.name, decidedAt: nowISO(), decisionNote: note });
  audit({ entity: "ai_action", entityId: id, caseId: a.caseId, action: "Acción IA rechazada", detail: `${a.title} · Motivo: ${note}` });
}
