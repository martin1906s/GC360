import type { AgentConfig, AutomationRule, Client, ID, Opportunity, PipelineStage, Tenant } from "@/domain/types";
import { PIPELINE } from "@/domain/constants";
import { nowISO, uid } from "@/lib/utils";
import { audit, findScoped, getCtx, repo, requirePerm } from "./core";
import { useDB } from "@/store/db";

/* ───────── CRM (GC-RF-01/03/04) ───────── */

export function createClient(input: Omit<Client, "id" | "tenantId" | "createdAt" | "tags"> & { tags?: string[] }) {
  const ctx = requirePerm("crm.edit");
  const c: Client = { id: uid("c"), tenantId: ctx.tenant.id, createdAt: nowISO(), tags: [], ...input };
  repo.insert("clients", c);
  audit({ entity: "client", entityId: c.id, action: c.status === "prospecto" ? "Prospecto creado" : "Cliente creado", detail: `${c.name} · origen ${c.source}` });
  return c;
}

export function createOpportunity(input: Omit<Opportunity, "id" | "tenantId" | "createdAt">) {
  const ctx = requirePerm("crm.edit");
  const o: Opportunity = { id: uid("op"), tenantId: ctx.tenant.id, createdAt: nowISO(), ...input };
  repo.insert("opportunities", o);
  audit({ entity: "client", entityId: o.clientId, action: "Oportunidad creada", detail: o.title });
  return o;
}

export function moveOpportunity(id: ID, stage: PipelineStage, lostReason?: string) {
  const ctx = requirePerm("crm.edit");
  const o = findScoped("opportunities", id, ctx);
  if (!o || o.stage === stage) return;
  repo.update("opportunities", id, { stage, ...(lostReason ? { lostReason } : {}) });
  const label = (s: PipelineStage) => PIPELINE.find((p) => p.key === s)?.label;
  audit({ entity: "client", entityId: o.clientId, caseId: o.caseId, action: "Etapa de oportunidad", detail: `${o.title}: ${label(o.stage)} → ${label(stage)}` });
}

/* ───────── Configuración (GC-RF-37/49/52/53) ───────── */

export function toggleAutomation(id: ID) {
  const ctx = requirePerm("automations.edit");
  const a = findScoped("automations", id, ctx)!;
  repo.update("automations", id, { active: !a.active });
  audit({ entity: "automation", entityId: id, action: a.active ? "Automatización desactivada" : "Automatización activada", detail: a.name });
}

export function saveAutomation(rule: Omit<AutomationRule, "id" | "tenantId" | "runs"> & { id?: ID }) {
  const ctx = requirePerm("automations.edit");
  if (rule.id) {
    repo.update("automations", rule.id, rule);
    audit({ entity: "automation", entityId: rule.id, action: "Automatización actualizada", detail: rule.name });
    return rule.id;
  }
  const id = uid("au");
  repo.insert("automations", { ...rule, id, tenantId: ctx.tenant.id, runs: 0 });
  audit({ entity: "automation", entityId: id, action: "Automatización creada", detail: `${rule.name} · aprobación: ${rule.approval}` });
  return id;
}

export function saveAgent(agent: AgentConfig) {
  requirePerm("automations.edit");
  repo.update("agents", agent.id, agent);
  audit({ entity: "config", entityId: agent.id, action: "Agente IA actualizado", detail: `${agent.name}: instrucciones, fuentes y límites` });
}

export function toggleInsurer(id: ID) {
  requirePerm("config.edit");
  const i = findScoped("insurers", id)!;
  repo.update("insurers", id, { active: !i.active });
  audit({ entity: "config", entityId: id, action: i.active ? "Aseguradora desactivada" : "Aseguradora activada", detail: i.name });
}

export function toggleLine(id: ID) {
  requirePerm("config.edit");
  const l = findScoped("lines", id)!;
  repo.update("lines", id, { active: !l.active });
  audit({ entity: "config", entityId: id, action: l.active ? "Ramo desactivado" : "Ramo activado", detail: l.name });
}

export function updateTenantBranding(patch: Partial<Tenant>) {
  const ctx = requirePerm("saas.manage");
  useDB.getState().updateTenant(ctx.tenant.id, patch);
  audit({ entity: "config", entityId: ctx.tenant.id, action: "Configuración de tenant", detail: Object.keys(patch).join(", ") });
}

export function currentUserName() {
  return getCtx().user.name;
}
