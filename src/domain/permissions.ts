import type { Role } from "./types";

/**
 * Matriz de permisos por rol (GC-RF-50).
 * En producción esta matriz se evalúa en el backend; aquí la capa de servicios la aplica
 * antes de cada lectura/escritura para que la UI no sea la única barrera.
 */
export const PERMISSIONS = {
  "dashboard.view": "Ver dashboard gerencial",
  "inbox.view": "Ver bandeja omnicanal",
  "inbox.reply": "Responder conversaciones",
  "cases.view": "Ver casos",
  "cases.edit": "Crear y editar casos",
  "cases.close": "Cerrar casos con justificación",
  "crm.view": "Ver clientes y prospectos",
  "crm.edit": "Editar clientes y oportunidades",
  "quotes.edit": "Gestionar cotizaciones y propuestas",
  "policies.view": "Ver pólizas",
  "policies.edit": "Registrar y validar pólizas",
  "claims.edit": "Gestionar siniestros y endosos",
  "finance.view": "Ver cartera y comisiones",
  "finance.edit": "Modificar cartera y liquidar comisiones",
  "network.view": "Ver red comercial",
  "ai.use": "Usar asistente IA",
  "ai.approve": "Aprobar acciones de IA",
  "automations.edit": "Configurar automatizaciones",
  "config.edit": "Configurar catálogos de seguros",
  "users.manage": "Administrar usuarios y roles",
  "audit.view": "Ver auditoría",
  "saas.manage": "Administrar tenants SaaS",
  "analytics.view": "Ver analítica e informes",
  "academy.view": "Ver Academia",
  "erp.view": "Ver módulos administrativos/financieros",
  "portal.view": "Portal de cliente",
} as const;

export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS).filter((p) => p !== "portal.view") as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,
  gerencia: ALL.filter((p) => !["saas.manage", "users.manage"].includes(p)),
  asesor: [
    "dashboard.view", "inbox.view", "inbox.reply", "cases.view", "cases.edit", "crm.view", "crm.edit",
    "quotes.edit", "policies.view", "network.view", "ai.use", "academy.view", "analytics.view",
  ],
  operaciones: [
    "dashboard.view", "inbox.view", "inbox.reply", "cases.view", "cases.edit", "cases.close", "crm.view",
    "quotes.edit", "policies.view", "policies.edit", "claims.edit", "ai.use", "academy.view", "finance.view",
  ],
  financiero: [
    "dashboard.view", "cases.view", "crm.view", "policies.view", "finance.view", "finance.edit",
    "ai.use", "academy.view", "analytics.view", "erp.view",
  ],
  supervisor_ia: [
    "dashboard.view", "inbox.view", "cases.view", "crm.view", "policies.view", "ai.use", "ai.approve",
    "automations.edit", "audit.view", "academy.view",
  ],
  afiliado: ["dashboard.view", "crm.view", "cases.view", "policies.view", "finance.view", "ai.use", "academy.view"],
  cliente: ["portal.view"],
};

export const can = (role: Role | undefined, perm: Permission) => !!role && ROLE_PERMISSIONS[role].includes(perm);

export class PermissionError extends Error {
  constructor(perm: Permission) {
    super(`Permiso requerido: ${PERMISSIONS[perm]}`);
  }
}
