/**
 * GC360 — Modelo de dominio.
 * Toda entidad crítica incorpora `tenantId` (RN-15 / separación SaaS).
 */

export type ID = string;
export type ISODate = string;

export interface TenantScoped {
  id: ID;
  tenantId: ID;
}

/* ─────────── SaaS / Seguridad ─────────── */

export interface Tenant {
  id: ID;
  name: string;
  legalName: string;
  nit: string;
  city: string;
  brandColor: string;
  initials: string;
  plan: "Enterprise" | "Profesional" | "Inicial";
  vertical: "seguros" | "inmobiliaria" | "veterinaria" | "hoteles";
  channels: { whatsapp: string; email: string; outlook: boolean; gmail: boolean };
  createdAt: ISODate;
  active: boolean;
}

export type Role =
  | "admin"
  | "gerencia"
  | "asesor"
  | "operaciones"
  | "financiero"
  | "supervisor_ia"
  | "afiliado"
  | "cliente";

export interface User extends TenantScoped {
  name: string;
  email: string;
  role: Role;
  title: string;
  color: string;
  clientId?: ID; // rol cliente
  sellerId?: ID; // rol afiliado
}

/* ─────────── Comercial ─────────── */

export type ClientType = "persona" | "empresa";
export type ClientStatus = "prospecto" | "cliente" | "inactivo";

export interface Client extends TenantScoped {
  type: ClientType;
  name: string;
  docType: "CC" | "NIT" | "CE";
  docNumber: string;
  email: string;
  phone: string;
  city: string;
  segment: "Personas" | "Pymes" | "Corporativo" | "Alto patrimonio";
  source: "WhatsApp" | "Correo" | "Referido" | "Web" | "Redes sociales" | "Llamada" | "Afiliado";
  ownerId: ID;
  sellerId?: ID;
  status: ClientStatus;
  createdAt: ISODate;
  tags: string[];
  contacts?: { name: string; role: string; phone: string; email: string }[];
}

export type PipelineStage =
  | "nuevo"
  | "contacto"
  | "documentacion"
  | "cotizando"
  | "propuesta"
  | "negociacion"
  | "ganado"
  | "perdido";

export interface Opportunity extends TenantScoped {
  clientId: ID;
  title: string;
  lineId: ID;
  stage: PipelineStage;
  value: number;
  channel: string;
  ownerId: ID;
  sellerId?: ID;
  caseId?: ID;
  nextAction: string;
  nextActionDate: ISODate;
  createdAt: ISODate;
  lostReason?: string;
}

export interface Seller extends TenantScoped {
  name: string;
  type: "interno" | "externo" | "afiliado";
  email: string;
  phone: string;
  city: string;
  commissionShare: number; // % de la comisión de intermediación que recibe
  active: boolean;
  joinedAt: ISODate;
}

/* ─────────── Comunicaciones & casos ─────────── */

export type Channel = "whatsapp" | "email" | "outlook" | "web" | "portal" | "llamada";

export type CaseCategory =
  | "cotizacion"
  | "soporte"
  | "renovacion"
  | "siniestro"
  | "cartera"
  | "modificacion"
  | "consulta";

export interface AIClassification {
  category: CaseCategory;
  confidence: number;
  lineId?: ID;
  priority: CasePriority;
  extracted: Record<string, string>;
  summary: string;
  wantsHuman: boolean;
}

export interface Conversation extends TenantScoped {
  channel: Channel;
  contactName: string;
  contactHandle: string;
  clientId?: ID;
  subject?: string;
  status: "abierta" | "cerrada";
  mode: "ia" | "humano";
  assigneeId?: ID;
  unread: number;
  lastMessageAt: ISODate;
  caseIds: ID[];
  ai?: AIClassification;
}

export interface Attachment {
  name: string;
  kind: "imagen" | "pdf" | "doc";
  size: string;
}

export interface Message extends TenantScoped {
  conversationId: ID;
  direction: "in" | "out" | "internal";
  author: "cliente" | "ia" | "agente" | "sistema";
  authorName: string;
  body: string;
  at: ISODate;
  attachments?: Attachment[];
  simulated?: boolean;
}

export type CaseStatus =
  | "nuevo"
  | "en_progreso"
  | "esperando_cliente"
  | "cotizando"
  | "propuesta"
  | "emision"
  | "resuelto"
  | "cerrado";

export type CasePriority = "baja" | "media" | "alta" | "critica";

export interface Case extends TenantScoped {
  code: string;
  title: string;
  description: string;
  category: CaseCategory;
  status: CaseStatus;
  priority: CasePriority;
  clientId: ID;
  assigneeId: ID;
  lineId?: ID;
  conversationId?: ID;
  policyId?: ID;
  opportunityId?: ID;
  slaHours: number;
  dueAt: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
  closedAt?: ISODate;
  closeReason?: string;
  channel: Channel;
}

export interface Task extends TenantScoped {
  title: string;
  type: "tarea" | "llamada" | "reunion" | "recordatorio" | "seguimiento";
  caseId?: ID;
  clientId?: ID;
  assigneeId: ID;
  dueAt: ISODate;
  done: boolean;
  mandatory: boolean;
  origin: "manual" | "ia" | "automatizacion";
  createdAt: ISODate;
}

export interface DocumentFile extends TenantScoped {
  name: string;
  kind: "identidad" | "matricula" | "poliza" | "siniestro" | "cotizacion" | "propuesta" | "otro";
  caseId?: ID;
  clientId?: ID;
  policyId?: ID;
  version: number;
  uploadedBy: string;
  at: ISODate;
  validation: "pendiente" | "validado" | "rechazado";
  restricted: boolean;
  size: string;
}

/** Línea de tiempo inalterable + auditoría (RF-15, RF-51, RN-13). */
export interface AuditEvent extends TenantScoped {
  at: ISODate;
  actorId?: ID;
  actorName: string;
  actorType: "usuario" | "ia" | "sistema" | "cliente";
  entity: "case" | "policy" | "client" | "offer" | "proposal" | "ai_action" | "config" | "user" | "conversation" | "automation";
  entityId: ID;
  caseId?: ID;
  action: string;
  detail: string;
}

/* ─────────── Seguros ─────────── */

export interface Insurer extends TenantScoped {
  name: string;
  short: string;
  color: string;
  rating: string;
  contactEmail: string;
  commissionRate: number;
  active: boolean;
}

export interface InsuranceLine extends TenantScoped {
  code: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Product extends TenantScoped {
  insurerId: ID;
  lineId: ID;
  name: string;
  coverages: string[];
  deductible: string;
  description: string;
}

export interface QuoteRequest extends TenantScoped {
  caseId: ID;
  lineId: ID;
  risk: Record<string, string>;
  insurerIds: ID[];
  status: "borrador" | "solicitada" | "ofertas_recibidas" | "propuesta_enviada" | "aceptada" | "rechazada";
  createdAt: ISODate;
  createdBy: ID;
}

export interface OfferCoverage {
  name: string;
  included: boolean;
  limit?: string;
}

export interface Offer extends TenantScoped {
  quoteRequestId: ID;
  caseId: ID;
  insurerId: ID;
  productName: string;
  premium: number;
  insuredValue: number;
  deductible: string;
  coverages: OfferCoverage[];
  exclusions: string[];
  validityDays: number;
  notes: string;
  version: number;
  status: "registrada" | "seleccionada" | "descartada";
  receivedAt: ISODate;
}

export interface Proposal extends TenantScoped {
  caseId: ID;
  quoteRequestId: ID;
  offerIds: ID[];
  recommendedOfferId?: ID;
  version: number;
  status: "borrador" | "enviada" | "aceptada" | "rechazada";
  createdAt: ISODate;
  sentAt?: ISODate;
  acceptedOfferId?: ID;
  acceptanceEvidence?: string;
  acceptedAt?: ISODate;
  advisorId: ID;
}

export type PolicyStatus = "en_emision" | "vigente" | "por_vencer" | "vencida" | "cancelada";

export interface Policy extends TenantScoped {
  number: string;
  clientId: ID;
  insurerId: ID;
  lineId: ID;
  caseId?: ID;
  offerId?: ID;
  proposalId?: ID;
  sellerId?: ID;
  insuredItem: string;
  startDate: ISODate;
  endDate: ISODate;
  premium: number;
  insuredValue: number;
  deductible: string;
  paymentMethod: "contado" | "financiado" | "cuotas";
  installments: number;
  commissionRate: number;
  status: PolicyStatus;
  validation: {
    status: "pendiente" | "conforme" | "con_discrepancias";
    discrepancies: { field: string; expected: string; received: string }[];
    reviewedBy?: string;
  };
}

export interface Installment extends TenantScoped {
  policyId: ID;
  number: number;
  dueDate: ISODate;
  amount: number;
  paid: boolean;
  paidAt?: ISODate;
}

export interface Commission extends TenantScoped {
  policyId: ID;
  insurerId: ID;
  sellerId?: ID;
  base: number;
  rate: number;
  amount: number;
  sellerAmount: number;
  status: "causada" | "por_liquidar" | "liquidada";
  period: string;
}

export interface Claim extends TenantScoped {
  caseId: ID;
  policyId: ID;
  clientId: ID;
  description: string;
  occurredAt: ISODate;
  status: "reportado" | "documentacion" | "en_aseguradora" | "aprobado" | "objetado" | "pagado";
  claimNumber?: string;
  amountClaimed: number;
}

export interface Endorsement extends TenantScoped {
  policyId: ID;
  caseId?: ID;
  type: string;
  description: string;
  status: "solicitado" | "en_aseguradora" | "aplicado" | "rechazado";
  at: ISODate;
}

/* ─────────── IA & automatización ─────────── */

export type AIActionStatus = "sugerida" | "pendiente" | "aprobada" | "ejecutada" | "rechazada" | "error";

export interface AIAction extends TenantScoped {
  kind: "responder" | "crear_caso" | "crear_tarea" | "seguimiento" | "solicitar_emision" | "escalar" | "modificacion";
  title: string;
  detail: string;
  payload: Record<string, unknown>;
  source: string;
  instruction: string;
  agent: string;
  caseId?: ID;
  conversationId?: ID;
  status: AIActionStatus;
  sensitive: boolean;
  confidence: number;
  createdAt: ISODate;
  decidedBy?: string;
  decidedAt?: ISODate;
  decisionNote?: string;
}

export interface AutomationRule extends TenantScoped {
  name: string;
  description: string;
  trigger: string;
  conditions: { field: string; op: string; value: string }[];
  actions: { type: string; target: string }[];
  approval: "ninguna" | "supervisor" | "gerencia";
  active: boolean;
  runs: number;
  lastRun?: ISODate;
}

export interface Template extends TenantScoped {
  name: string;
  channel: "whatsapp" | "email";
  category: CaseCategory;
  body: string;
  status: "borrador" | "aprobado";
}

export interface AgentConfig extends TenantScoped {
  name: string;
  purpose: string;
  instructions: string;
  tone: string;
  sources: string[];
  allowedActions: string[];
  approvalRequired: string[];
  channels: Channel[];
  schedule: string;
  active: boolean;
}

/* ─────────── Base de datos simulada ─────────── */

export interface Database {
  tenants: Tenant[];
  users: User[];
  clients: Client[];
  sellers: Seller[];
  opportunities: Opportunity[];
  conversations: Conversation[];
  messages: Message[];
  cases: Case[];
  tasks: Task[];
  documents: DocumentFile[];
  events: AuditEvent[];
  insurers: Insurer[];
  lines: InsuranceLine[];
  products: Product[];
  quoteRequests: QuoteRequest[];
  offers: Offer[];
  proposals: Proposal[];
  policies: Policy[];
  installments: Installment[];
  commissions: Commission[];
  claims: Claim[];
  endorsements: Endorsement[];
  aiActions: AIAction[];
  automations: AutomationRule[];
  templates: Template[];
  agents: AgentConfig[];
}

export type TableName = Exclude<keyof Database, "tenants">;
export type Row<T extends keyof Database> = Database[T][number];
