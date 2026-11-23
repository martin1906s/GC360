import type { Case, CaseCategory, CasePriority, CaseStatus, Channel, ID, Task } from "@/domain/types";
import { CASE_STATUS, PRIORITY } from "@/domain/constants";
import { addHours, nowISO, uid } from "@/lib/utils";
import { audit, findScoped, getCtx, repo, requirePerm, scoped } from "./core";
import { db } from "@/store/db";

/** Código único por tenant: CAS-2026-0001 (RN-01). */
export function nextCaseCode(tenantId: ID) {
  const year = new Date().getFullYear();
  const max = db()
    .cases.filter((c) => c.tenantId === tenantId)
    .reduce((m, c) => Math.max(m, Number(c.code.split("-")[2]) || 0), 0);
  return `CAS-${year}-${String(max + 1).padStart(4, "0")}`;
}

export interface NewCaseInput {
  title: string;
  description?: string;
  category: CaseCategory;
  priority: CasePriority;
  clientId: ID;
  assigneeId: ID;
  lineId?: ID;
  conversationId?: ID;
  policyId?: ID;
  channel: Channel;
  createdByAI?: boolean;
}

export function createCase(input: NewCaseInput): Case {
  const ctx = requirePerm("cases.edit");
  const now = nowISO();
  const sla = PRIORITY[input.priority].sla;
  const c: Case = {
    id: uid("k"),
    tenantId: ctx.tenant.id,
    code: nextCaseCode(ctx.tenant.id),
    status: "nuevo",
    slaHours: sla,
    dueAt: addHours(sla),
    createdAt: now,
    updatedAt: now,
    description: input.description ?? "",
    ...input,
  };
  repo.insert("cases", c);
  audit({
    entity: "case", entityId: c.id, caseId: c.id, action: "Caso creado",
    detail: `${c.code} creado ${input.createdByAI ? "por propuesta de IA aprobada por " + ctx.user.name : "manualmente"} · canal ${input.channel}`,
  });
  const assignee = db().users.find((u) => u.id === input.assigneeId);
  audit({ entity: "case", entityId: c.id, caseId: c.id, action: "Asignación", detail: `Responsable: ${assignee?.name ?? "—"} · SLA ${sla} h` });
  return c;
}

export function changeCaseStatus(caseId: ID, status: CaseStatus, note?: string) {
  const ctx = requirePerm("cases.edit");
  const c = findScoped("cases", caseId, ctx);
  if (!c) throw new Error("Caso no encontrado");
  if (status === "cerrado" || status === "resuelto") {
    const pending = scoped("tasks", ctx).filter((t) => t.caseId === caseId && t.mandatory && !t.done);
    if (pending.length && !note) {
      throw new Error(`Hay ${pending.length} actividad(es) obligatoria(s) pendiente(s). Cierra con justificación autorizada.`);
    }
    if (pending.length && note) requirePerm("cases.close");
  }
  repo.update("cases", caseId, {
    status, updatedAt: nowISO(),
    ...(status === "cerrado" || status === "resuelto" ? { closedAt: nowISO(), closeReason: note } : {}),
  });
  audit({ entity: "case", entityId: caseId, caseId, action: "Cambio de estado", detail: `${CASE_STATUS[c.status].label} → ${CASE_STATUS[status].label}${note ? ` · Justificación: ${note}` : ""}` });
}

export function updateCase(caseId: ID, patch: Partial<Pick<Case, "assigneeId" | "priority" | "dueAt" | "title" | "lineId">>) {
  const ctx = requirePerm("cases.edit");
  const c = findScoped("cases", caseId, ctx);
  if (!c) throw new Error("Caso no encontrado");
  repo.update("cases", caseId, { ...patch, updatedAt: nowISO() });
  if (patch.assigneeId && patch.assigneeId !== c.assigneeId) {
    const u = db().users.find((x) => x.id === patch.assigneeId);
    audit({ entity: "case", entityId: caseId, caseId, action: "Reasignación", detail: `Nuevo responsable: ${u?.name}` });
  }
  if (patch.priority && patch.priority !== c.priority) {
    audit({ entity: "case", entityId: caseId, caseId, action: "Cambio de prioridad", detail: `${PRIORITY[c.priority].label} → ${PRIORITY[patch.priority].label}` });
  }
}

export function addCaseNote(caseId: ID, text: string) {
  const ctx = requirePerm("cases.edit");
  if (!findScoped("cases", caseId, ctx)) throw new Error("Caso no encontrado");
  repo.update("cases", caseId, { updatedAt: nowISO() });
  audit({ entity: "case", entityId: caseId, caseId, action: "Nota interna", detail: text });
}

export function touchCase(caseId: ID) {
  repo.update("cases", caseId, { updatedAt: nowISO() });
}

/* ───────── Tareas / agenda (GC-RF-08, GC-RF-34) ───────── */

export function createTask(input: Omit<Task, "id" | "tenantId" | "createdAt" | "done"> & { done?: boolean }) {
  const ctx = getCtx();
  const t: Task = { id: uid("t"), tenantId: ctx.tenant.id, createdAt: nowISO(), done: false, ...input };
  repo.insert("tasks", t);
  if (t.caseId) {
    audit({ entity: "case", entityId: t.caseId, caseId: t.caseId, action: "Actividad creada", detail: `${t.title}${t.origin !== "manual" ? ` (origen: ${t.origin})` : ""}` });
    touchCase(t.caseId);
  }
  return t;
}

export function toggleTask(taskId: ID) {
  const ctx = getCtx();
  const t = findScoped("tasks", taskId, ctx);
  if (!t) return;
  repo.update("tasks", taskId, { done: !t.done });
  if (t.caseId) {
    audit({ entity: "case", entityId: t.caseId, caseId: t.caseId, action: t.done ? "Actividad reabierta" : "Actividad completada", detail: t.title });
    touchCase(t.caseId);
  }
}
