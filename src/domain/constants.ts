import type {
  AIActionStatus,
  CaseCategory,
  CasePriority,
  CaseStatus,
  Channel,
  PipelineStage,
  PolicyStatus,
  Role,
} from "./types";

export type Tone = "slate" | "blue" | "indigo" | "violet" | "green" | "amber" | "red" | "teal" | "pink" | "orange";

export interface Meta {
  label: string;
  tone: Tone;
}

export const ROLE_META: Record<Role, Meta & { description: string }> = {
  admin: { label: "Administrador GC360", tone: "violet", description: "Configuración de empresa, roles, políticas IA y auditoría." },
  gerencia: { label: "Gerencia", tone: "indigo", description: "Visión general, indicadores y aprobaciones." },
  asesor: { label: "Asesor comercial", tone: "blue", description: "Prospectos, comunicaciones, cotizaciones y cierres." },
  operaciones: { label: "Analista de operaciones", tone: "teal", description: "Pólizas, endosos, renovaciones y siniestros." },
  financiero: { label: "Financiero / cartera", tone: "green", description: "Cartera, cobros y comisiones." },
  supervisor_ia: { label: "Supervisor IA", tone: "pink", description: "Revisa acciones propuestas por agentes de IA." },
  afiliado: { label: "Vendedor externo / afiliado", tone: "orange", description: "Solo su cartera y comisiones." },
  cliente: { label: "Cliente / asegurado", tone: "slate", description: "Portal acotado a sus datos." },
};

export const CASE_STATUS: Record<CaseStatus, Meta> = {
  nuevo: { label: "Nuevo", tone: "blue" },
  en_progreso: { label: "En progreso", tone: "indigo" },
  esperando_cliente: { label: "Esperando cliente", tone: "amber" },
  cotizando: { label: "Cotizando", tone: "violet" },
  propuesta: { label: "Propuesta enviada", tone: "teal" },
  emision: { label: "En emisión", tone: "orange" },
  resuelto: { label: "Resuelto", tone: "green" },
  cerrado: { label: "Cerrado", tone: "slate" },
};

export const CASE_CATEGORY: Record<CaseCategory, Meta> = {
  cotizacion: { label: "Nueva cotización", tone: "blue" },
  soporte: { label: "Soporte", tone: "slate" },
  renovacion: { label: "Renovación", tone: "teal" },
  siniestro: { label: "Siniestro", tone: "red" },
  cartera: { label: "Cartera", tone: "green" },
  modificacion: { label: "Modificación / endoso", tone: "violet" },
  consulta: { label: "Consulta general", tone: "indigo" },
};

export const PRIORITY: Record<CasePriority, Meta & { sla: number }> = {
  baja: { label: "Baja", tone: "slate", sla: 72 },
  media: { label: "Media", tone: "blue", sla: 48 },
  alta: { label: "Alta", tone: "amber", sla: 24 },
  critica: { label: "Crítica", tone: "red", sla: 8 },
};

export const PIPELINE: { key: PipelineStage; label: string; tone: Tone; probability: number }[] = [
  { key: "nuevo", label: "Nuevo", tone: "slate", probability: 0.1 },
  { key: "contacto", label: "En contacto", tone: "blue", probability: 0.2 },
  { key: "documentacion", label: "Documentación", tone: "indigo", probability: 0.35 },
  { key: "cotizando", label: "Cotizando", tone: "violet", probability: 0.5 },
  { key: "propuesta", label: "Propuesta enviada", tone: "teal", probability: 0.65 },
  { key: "negociacion", label: "Negociación", tone: "amber", probability: 0.8 },
  { key: "ganado", label: "Ganado", tone: "green", probability: 1 },
  { key: "perdido", label: "Perdido", tone: "red", probability: 0 },
];

export const POLICY_STATUS: Record<PolicyStatus, Meta> = {
  en_emision: { label: "En emisión", tone: "orange" },
  vigente: { label: "Vigente", tone: "green" },
  por_vencer: { label: "Por vencer", tone: "amber" },
  vencida: { label: "Vencida", tone: "red" },
  cancelada: { label: "Cancelada", tone: "slate" },
};

export const AI_STATUS: Record<AIActionStatus, Meta> = {
  sugerida: { label: "Sugerida", tone: "blue" },
  pendiente: { label: "Pendiente de aprobación", tone: "amber" },
  aprobada: { label: "Aprobada", tone: "teal" },
  ejecutada: { label: "Ejecutada", tone: "green" },
  rechazada: { label: "Rechazada", tone: "red" },
  error: { label: "Error", tone: "red" },
};

export const CHANNEL_META: Record<Channel, Meta & { demo: boolean }> = {
  whatsapp: { label: "WhatsApp Business", tone: "green", demo: true },
  email: { label: "Gmail", tone: "red", demo: true },
  outlook: { label: "Microsoft 365", tone: "blue", demo: true },
  web: { label: "Formulario web", tone: "indigo", demo: true },
  portal: { label: "Portal cliente", tone: "violet", demo: false },
  llamada: { label: "Llamada registrada", tone: "slate", demo: false },
};

export const CLAIM_STATUS: Record<string, Meta> = {
  reportado: { label: "Reportado", tone: "blue" },
  documentacion: { label: "Documentación", tone: "amber" },
  en_aseguradora: { label: "En aseguradora", tone: "violet" },
  aprobado: { label: "Aprobado", tone: "green" },
  objetado: { label: "Objetado", tone: "red" },
  pagado: { label: "Pagado", tone: "teal" },
};

export const COMMISSION_STATUS: Record<string, Meta> = {
  causada: { label: "Causada", tone: "blue" },
  por_liquidar: { label: "Por liquidar", tone: "amber" },
  liquidada: { label: "Liquidada", tone: "green" },
};

export const TONE_CLASSES: Record<Tone, { bg: string; text: string; ring: string; dot: string; solid: string }> = {
  slate: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200", dot: "bg-slate-400", solid: "bg-slate-500" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", dot: "bg-blue-500", solid: "bg-blue-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200", dot: "bg-indigo-500", solid: "bg-indigo-500" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200", dot: "bg-violet-500", solid: "bg-violet-500" },
  green: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", solid: "bg-emerald-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-800", ring: "ring-amber-200", dot: "bg-amber-500", solid: "bg-amber-500" },
  red: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", dot: "bg-rose-500", solid: "bg-rose-500" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200", dot: "bg-teal-500", solid: "bg-teal-500" },
  pink: { bg: "bg-pink-50", text: "text-pink-700", ring: "ring-pink-200", dot: "bg-pink-500", solid: "bg-pink-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", dot: "bg-orange-500", solid: "bg-orange-500" },
};
