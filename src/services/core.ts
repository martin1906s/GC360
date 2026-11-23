import { db, useDB } from "@/store/db";
import { useSession } from "@/store/session";
import { can, PermissionError, type Permission } from "@/domain/permissions";
import type { AuditEvent, Database, ID, Row, TableName, Tenant, User } from "@/domain/types";
import { nowISO, uid } from "@/lib/utils";

export interface Ctx {
  user: User;
  tenant: Tenant;
}

/** Contexto de ejecución: equivale al token/JWT validado en el backend. */
export function getCtx(): Ctx {
  const { userId, tenantId } = useSession.getState();
  const data = db();
  const user = data.users.find((u) => u.id === userId);
  const tenant = data.tenants.find((t) => t.id === tenantId);
  if (!user || !tenant || user.tenantId !== tenant.id) throw new Error("Sesión no válida");
  return { user, tenant };
}

export function requirePerm(perm: Permission): Ctx {
  const ctx = getCtx();
  if (!can(ctx.user.role, perm)) throw new PermissionError(perm);
  return ctx;
}

/**
 * Filtro de ámbito (RN-09, RN-15): tenant + restricciones por rol.
 * Toda lectura pasa por aquí — también la IA.
 */
export function scopeRows<T extends TableName>(table: T, rows: Row<T>[], user: User, data: Database): Row<T>[] {
  const byTenant = rows.filter((r) => (r as { tenantId: ID }).tenantId === user.tenantId);
  if (user.role === "afiliado" && user.sellerId) {
    const myClients = new Set(data.clients.filter((c) => c.sellerId === user.sellerId).map((c) => c.id));
    const myCases = new Set(data.cases.filter((c) => myClients.has(c.clientId)).map((c) => c.id));
    const myPolicies = new Set(data.policies.filter((p) => p.sellerId === user.sellerId || myClients.has(p.clientId)).map((p) => p.id));
    return byTenant.filter((r) => {
      const x = r as unknown as Record<string, unknown>;
      if (table === "clients") return myClients.has(x.id as ID);
      if (table === "commissions" || table === "policies" || table === "opportunities") return x.sellerId === user.sellerId || myClients.has(x.clientId as ID);
      if ("clientId" in x) return myClients.has(x.clientId as ID);
      if ("policyId" in x) return myPolicies.has(x.policyId as ID);
      if ("caseId" in x) return myCases.has(x.caseId as ID);
      return table === "insurers" || table === "lines" || table === "products" || table === "sellers" ? (table !== "sellers" || x.id === user.sellerId) : false;
    });
  }
  if (user.role === "cliente" && user.clientId) {
    const myCases = new Set(data.cases.filter((c) => c.clientId === user.clientId).map((c) => c.id));
    const myPolicies = new Set(data.policies.filter((p) => p.clientId === user.clientId).map((p) => p.id));
    const myConvs = new Set(data.conversations.filter((c) => c.clientId === user.clientId).map((c) => c.id));
    return byTenant.filter((r) => {
      const x = r as unknown as Record<string, unknown>;
      if (table === "messages") return myConvs.has(x.conversationId as ID) && x.direction !== "internal";
      if (table === "aiActions" || table === "events") return false;
      if (table === "clients") return x.id === user.clientId;
      if (table === "documents") return x.clientId === user.clientId;
      if ("clientId" in x) return x.clientId === user.clientId;
      if ("policyId" in x) return myPolicies.has(x.policyId as ID);
      if ("caseId" in x) return myCases.has(x.caseId as ID);
      return table === "insurers" || table === "lines";
    });
  }
  return byTenant;
}

export function scoped<T extends TableName>(table: T, ctx = getCtx()): Row<T>[] {
  const data = db();
  return scopeRows(table, data[table] as Row<T>[], ctx.user, data);
}

/** Obtiene un registro aplicando aislamiento: un id de otro tenant devuelve undefined (criterio 15). */
export function findScoped<T extends TableName>(table: T, id: ID, ctx = getCtx()): Row<T> | undefined {
  return scoped(table, ctx).find((r) => (r as { id: ID }).id === id);
}

export function audit(e: Omit<AuditEvent, "id" | "tenantId" | "at" | "actorName" | "actorType" | "actorId"> & Partial<Pick<AuditEvent, "actorName" | "actorType">>, ctx = getCtx()) {
  const event: AuditEvent = {
    id: uid("ev"),
    tenantId: ctx.tenant.id,
    at: nowISO(),
    actorId: e.actorType && e.actorType !== "usuario" ? undefined : ctx.user.id,
    actorName: e.actorName ?? ctx.user.name,
    actorType: e.actorType ?? "usuario",
    ...e,
  };
  useDB.getState().insert("events", event);
  return event;
}

export const repo = {
  insert: <T extends TableName>(table: T, row: Row<T>) => useDB.getState().insert(table, row),
  update: <T extends TableName>(table: T, id: ID, patch: Partial<Row<T>>) => useDB.getState().update(table, id, patch),
  remove: <T extends TableName>(table: T, id: ID) => useDB.getState().remove(table, id),
};
