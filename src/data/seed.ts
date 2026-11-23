/**
 * Datos demostrativos 100% ficticios (sección 9 del documento de requerimientos).
 * Las fechas son relativas al momento de carga para que vencimientos y SLA tengan sentido.
 */
import type {
  AuditEvent, Case, Client, Commission, Conversation, Database, DocumentFile, Installment, Message,
  Offer, OfferCoverage, Policy, Task,
} from "@/domain/types";

const H = 3600_000;
const D = 24 * H;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const days = (n: number) => at(n * D);
const hours = (n: number) => at(n * H);

const G = "t_gran";
const A = "t_andes";

/* ───────── Coberturas de automóvil ───────── */
const AUTO_COV = [
  "Responsabilidad civil extracontractual",
  "Pérdida total por daños",
  "Pérdida parcial por daños",
  "Hurto total y parcial",
  "Asistencia en viaje 24/7",
  "Vehículo de reemplazo",
  "Accidentes personales conductor",
  "Gastos de transporte",
];
const cov = (included: boolean[], limits: Record<number, string> = {}): OfferCoverage[] =>
  AUTO_COV.map((name, i) => ({ name, included: included[i], limit: limits[i] }));

export function createSeed(): Database {
  const events: AuditEvent[] = [];
  let ev = 0;
  const log = (e: Omit<AuditEvent, "id">) => events.push({ id: `ev_seed_${++ev}`, ...e });

  /* ───────── Tenants ───────── */
  const tenants: Database["tenants"] = [
    {
      id: G, name: "Gran Seguros", legalName: "Gran Seguros Agencia de Seguros Ltda.", nit: "900.000.001-1",
      city: "Medellín", brandColor: "#2f5079", initials: "GS", plan: "Enterprise", vertical: "seguros",
      channels: { whatsapp: "+57 300 000 0001", email: "servicio@granseguros.demo", outlook: true, gmail: true },
      createdAt: days(-400), active: true,
    },
    {
      id: A, name: "Andes Corredores", legalName: "Andes Corredores de Seguros S.A.S.", nit: "900.000.002-2",
      city: "Bogotá", brandColor: "#0f766e", initials: "AC", plan: "Profesional", vertical: "seguros",
      channels: { whatsapp: "+57 300 000 0002", email: "hola@andescorredores.demo", outlook: false, gmail: true },
      createdAt: days(-90), active: true,
    },
  ];

  /* ───────── Usuarios ───────── */
  const users: Database["users"] = [
    { id: "u_admin", tenantId: G, name: "Laura Méndez", email: "laura.mendez@granseguros.demo", role: "admin", title: "Administradora de plataforma", color: "#4b5d78" },
    { id: "u_ger", tenantId: G, name: "Carolina Vélez", email: "carolina.velez@granseguros.demo", role: "gerencia", title: "Gerente general", color: "#2f5079" },
    { id: "u_ase1", tenantId: G, name: "Andrés Gómez", email: "andres.gomez@granseguros.demo", role: "asesor", title: "Asesor comercial senior", color: "#3b6e8f" },
    { id: "u_ase2", tenantId: G, name: "Valentina Ríos", email: "valentina.rios@granseguros.demo", role: "asesor", title: "Asesora comercial", color: "#3f7f7a" },
    { id: "u_ope", tenantId: G, name: "Felipe Cardona", email: "felipe.cardona@granseguros.demo", role: "operaciones", title: "Analista de operaciones", color: "#4f7a5a" },
    { id: "u_fin", tenantId: G, name: "Natalia Ospina", email: "natalia.ospina@granseguros.demo", role: "financiero", title: "Coordinadora de cartera", color: "#5b7a3a" },
    { id: "u_sup", tenantId: G, name: "Sebastián Mora", email: "sebastian.mora@granseguros.demo", role: "supervisor_ia", title: "Supervisor IA y calidad", color: "#7a4f6b" },
    { id: "u_afi", tenantId: G, name: "Diego Zapata", email: "diego.zapata@aliado.demo", role: "afiliado", title: "Afiliado externo", color: "#8a5a3c", sellerId: "s_3" },
    { id: "u_cli", tenantId: G, name: "Camilo Herrera", email: "camilo.herrera@correo.demo", role: "cliente", title: "Cliente", color: "#475569", clientId: "c_1" },
    { id: "u_a_ger", tenantId: A, name: "Mariana Paredes", email: "mariana@andescorredores.demo", role: "gerencia", title: "Directora", color: "#3f7f7a" },
    { id: "u_a_ase", tenantId: A, name: "Tomás Rueda", email: "tomas@andescorredores.demo", role: "asesor", title: "Asesor", color: "#3b6e8f" },
    { id: "u_a_cli", tenantId: A, name: "Lucía Benavides", email: "lucia.b@correo.demo", role: "cliente", title: "Cliente", color: "#475569", clientId: "ca_1" },
  ];

  /* ───────── Red comercial ───────── */
  const sellers: Database["sellers"] = [
    { id: "s_1", tenantId: G, name: "Andrés Gómez", type: "interno", email: "andres.gomez@granseguros.demo", phone: "+57 300 111 0001", city: "Medellín", commissionShare: 0.1, active: true, joinedAt: days(-900) },
    { id: "s_2", tenantId: G, name: "Valentina Ríos", type: "interno", email: "valentina.rios@granseguros.demo", phone: "+57 300 111 0002", city: "Medellín", commissionShare: 0.1, active: true, joinedAt: days(-500) },
    { id: "s_3", tenantId: G, name: "Diego Zapata", type: "afiliado", email: "diego.zapata@aliado.demo", phone: "+57 300 111 0003", city: "Envigado", commissionShare: 0.35, active: true, joinedAt: days(-300) },
    { id: "s_4", tenantId: G, name: "Concesionario Autonorte", type: "externo", email: "seguros@autonorte.demo", phone: "+57 604 000 0004", city: "Bello", commissionShare: 0.3, active: true, joinedAt: days(-200) },
    { id: "s_5", tenantId: G, name: "Paola Restrepo", type: "afiliado", email: "paola.r@aliado.demo", phone: "+57 300 111 0005", city: "Rionegro", commissionShare: 0.3, active: false, joinedAt: days(-700) },
    { id: "sa_1", tenantId: A, name: "Tomás Rueda", type: "interno", email: "tomas@andescorredores.demo", phone: "+57 300 222 0001", city: "Bogotá", commissionShare: 0.1, active: true, joinedAt: days(-80) },
  ];

  /* ───────── Catálogo de seguros ───────── */
  const insurers: Database["insurers"] = [
    { id: "ins_condor", tenantId: G, name: "Cóndor Seguros", short: "Cóndor", color: "#3b6e8f", rating: "AA+", contactEmail: "intermediarios@condor.demo", commissionRate: 0.12, active: true },
    { id: "ins_ceiba", tenantId: G, name: "Ceiba Aseguradora", short: "Ceiba", color: "#16a34a", rating: "AA", contactEmail: "canal@ceiba.demo", commissionRate: 0.13, active: true },
    { id: "ins_atlas", tenantId: G, name: "Atlas Protección", short: "Atlas", color: "#8a5a3c", rating: "AAA", contactEmail: "brokers@atlas.demo", commissionRate: 0.11, active: true },
    { id: "ins_faro", tenantId: G, name: "Faro Seguros", short: "Faro", color: "#9333ea", rating: "AA-", contactEmail: "agencias@faro.demo", commissionRate: 0.14, active: true },
    { id: "ins_horizonte", tenantId: G, name: "Horizonte Seguros", short: "Horizonte", color: "#3f7f7a", rating: "A+", contactEmail: "intermediacion@horizonte.demo", commissionRate: 0.12, active: false },
    { id: "insa_1", tenantId: A, name: "Páramo Seguros", short: "Páramo", color: "#3f7f7a", rating: "AA", contactEmail: "a@paramo.demo", commissionRate: 0.12, active: true },
    { id: "insa_2", tenantId: A, name: "Sabana Aseguradora", short: "Sabana", color: "#ca8a04", rating: "A", contactEmail: "b@sabana.demo", commissionRate: 0.1, active: true },
  ];

  const lineDefs = [
    ["auto", "AUT", "Automóviles", "Vehículos livianos y pesados, particulares y comerciales."],
    ["hogar", "HOG", "Hogar", "Vivienda, contenidos y responsabilidad civil familiar."],
    ["pyme", "PYM", "Multirriesgo empresarial", "Daños materiales, lucro cesante y RC para empresas."],
    ["rc", "RCE", "Responsabilidad civil", "RC profesional, extracontractual y de productos."],
    ["cumpl", "CUM", "Cumplimiento", "Garantías de contratos públicos y privados."],
    ["vida", "VID", "Vida y accidentes", "Vida individual, grupo y accidentes personales."],
    ["salud", "SAL", "Salud", "Planes complementarios y pólizas de salud."],
  ] as const;
  const lines: Database["lines"] = [
    ...lineDefs.map(([k, code, name, description]) => ({ id: `ln_${k}`, tenantId: G, code, name, description, active: true })),
    ...lineDefs.slice(0, 4).map(([k, code, name, description]) => ({ id: `lna_${k}`, tenantId: A, code, name, description, active: true })),
  ];

  const products: Database["products"] = [
    { id: "pr_1", tenantId: G, insurerId: "ins_condor", lineId: "ln_auto", name: "Auto Total Plus", coverages: AUTO_COV.slice(0, 7), deductible: "10% mín. 1 SMMLV", description: "Plan todo riesgo con vehículo de reemplazo." },
    { id: "pr_2", tenantId: G, insurerId: "ins_ceiba", lineId: "ln_auto", name: "Ceiba Movilidad", coverages: AUTO_COV.slice(0, 5), deductible: "Sin deducible pérdida total", description: "Plan todo riesgo esencial." },
    { id: "pr_3", tenantId: G, insurerId: "ins_atlas", lineId: "ln_auto", name: "Atlas Autos Premium", coverages: AUTO_COV, deductible: "$1.200.000 fijo", description: "Cobertura premium con accesorios." },
    { id: "pr_4", tenantId: G, insurerId: "ins_faro", lineId: "ln_hogar", name: "Hogar Seguro Faro", coverages: ["Incendio y aliados", "Terremoto", "Hurto de contenidos", "RC familiar", "Asistencia domiciliaria"], deductible: "3% del valor asegurado", description: "Protección integral de vivienda." },
    { id: "pr_5", tenantId: G, insurerId: "ins_condor", lineId: "ln_pyme", name: "Pyme Protegida", coverages: ["Daños materiales", "Lucro cesante", "Equipo electrónico", "Manejo global", "RC extracontractual"], deductible: "10% de la pérdida", description: "Multirriesgo para pequeñas y medianas empresas." },
    { id: "pr_6", tenantId: G, insurerId: "ins_atlas", lineId: "ln_cumpl", name: "Garantía Contratos Atlas", coverages: ["Seriedad de oferta", "Cumplimiento", "Anticipo", "Salarios y prestaciones", "Estabilidad de obra"], deductible: "N/A", description: "Pólizas de cumplimiento para contratistas." },
    { id: "pr_7", tenantId: G, insurerId: "ins_ceiba", lineId: "ln_rc", name: "RC Profesional Ceiba", coverages: ["Errores y omisiones", "Gastos de defensa", "Daño moral"], deductible: "$2.000.000", description: "RC para profesionales independientes." },
    { id: "pra_1", tenantId: A, insurerId: "insa_1", lineId: "lna_auto", name: "Páramo Autos", coverages: AUTO_COV.slice(0, 5), deductible: "10%", description: "Plan autos." },
  ];

  /* ───────── Clientes ───────── */
  const C = (o: Partial<Client> & Pick<Client, "id" | "name">): Client => ({
    tenantId: G, type: "persona", docType: "CC", docNumber: "1.000.000.000", email: "", phone: "", city: "Medellín",
    segment: "Personas", source: "WhatsApp", ownerId: "u_ase1", status: "cliente", createdAt: days(-200), tags: [], ...o,
  });
  const clients: Client[] = [
    C({ id: "c_1", name: "Camilo Herrera", docNumber: "1.017.000.101", email: "camilo.herrera@correo.demo", phone: "+57 310 000 0101", tags: ["Auto", "Renovación próxima"], createdAt: days(-370) }),
    C({ id: "c_2", name: "Distribuidora La Montaña S.A.S.", type: "empresa", docType: "NIT", docNumber: "901.000.102-3", email: "gerencia@lamontana.demo", phone: "+57 604 000 0102", segment: "Pymes", source: "Referido", ownerId: "u_ase2", tags: ["Pyme", "Multirriesgo"], contacts: [{ name: "Ricardo Ochoa", role: "Gerente", phone: "+57 311 000 0102", email: "r.ochoa@lamontana.demo" }, { name: "Sandra Gil", role: "Contadora", phone: "+57 311 000 1102", email: "contabilidad@lamontana.demo" }] }),
    C({ id: "c_3", name: "María Fernanda López", docNumber: "43.000.103", email: "mafe.lopez@correo.demo", phone: "+57 312 000 0103", city: "Envigado", source: "Afiliado", sellerId: "s_3", tags: ["Hogar"] }),
    C({ id: "c_4", name: "Constructora Altavista S.A.S.", type: "empresa", docType: "NIT", docNumber: "900.000.104-5", email: "licitaciones@altavista.demo", phone: "+57 604 000 0104", segment: "Corporativo", source: "Llamada", ownerId: "u_ase1", tags: ["Cumplimiento", "Licitaciones"], contacts: [{ name: "Hernán Quiroz", role: "Director jurídico", phone: "+57 313 000 0104", email: "h.quiroz@altavista.demo" }] }),
    C({ id: "c_5", name: "Juan Pablo Arango", docNumber: "71.000.105", email: "jp.arango@correo.demo", phone: "+57 314 000 0105", source: "Afiliado", sellerId: "s_3", tags: ["Auto", "Siniestro activo"] }),
    C({ id: "c_6", name: "Clínica Dental Sonrisa", type: "empresa", docType: "NIT", docNumber: "901.000.106-7", email: "admin@sonrisa.demo", phone: "+57 604 000 0106", segment: "Pymes", source: "Web", ownerId: "u_ase2", tags: ["RC profesional"] }),
    C({ id: "c_7", name: "Isabel Cristina Mejía", docNumber: "32.000.107", email: "isabel.mejia@correo.demo", phone: "+57 315 000 0107", segment: "Alto patrimonio", source: "Referido", tags: ["Vida", "Hogar"] }),
    C({ id: "c_8", name: "Transportes del Valle S.A.S.", type: "empresa", docType: "NIT", docNumber: "900.000.108-9", email: "flota@tvalle.demo", phone: "+57 602 000 0108", city: "Cali", segment: "Corporativo", source: "Correo", ownerId: "u_ase1", tags: ["Flota"] }),
    C({ id: "c_9", name: "Ana María Salazar", docNumber: "1.036.000.109", email: "ana.salazar@correo.demo", phone: "+57 316 000 0109", source: "Redes sociales", ownerId: "u_ase2", tags: ["Auto"] }),
    C({ id: "c_10", name: "Restaurante El Fogón", type: "empresa", docType: "NIT", docNumber: "901.000.110-1", email: "elfogon@correo.demo", phone: "+57 604 000 0110", segment: "Pymes", source: "Afiliado", sellerId: "s_4", tags: ["Pyme"] }),
    C({ id: "c_11", name: "Ricardo Montoya", docNumber: "98.000.111", email: "r.montoya@correo.demo", phone: "+57 317 000 0111", city: "Rionegro", source: "Llamada", tags: ["Salud"] }),
    C({ id: "c_12", name: "Gimnasio Activa", type: "empresa", docType: "NIT", docNumber: "901.000.112-2", email: "activa@correo.demo", phone: "+57 604 000 0112", segment: "Pymes", source: "Web", ownerId: "u_ase2", tags: ["RC"] }),
    // Prospectos
    C({ id: "c_13", name: "Santiago Cárdenas", status: "prospecto", docNumber: "1.152.000.113", email: "santiago.cardenas@correo.demo", phone: "+57 318 000 0113", createdAt: days(-6), tags: ["Auto"] }),
    C({ id: "c_14", name: "Paola Jiménez", status: "prospecto", docNumber: "1.040.000.114", email: "paola.jimenez@correo.demo", phone: "+57 319 000 0114", createdAt: hours(-3), tags: ["Auto"] }),
    C({ id: "c_15", name: "Inversiones Robledo S.A.S.", type: "empresa", docType: "NIT", status: "prospecto", docNumber: "901.000.115-4", email: "contacto@robledo.demo", phone: "+57 604 000 0115", segment: "Corporativo", source: "Correo", createdAt: days(-3), tags: ["Pyme"] }),
    C({ id: "c_16", name: "Laura Cristina Patiño", status: "prospecto", docNumber: "1.128.000.116", email: "laura.patino@correo.demo", phone: "+57 320 000 0116", source: "Redes sociales", ownerId: "u_ase2", createdAt: days(-4), tags: ["Hogar"] }),
    C({ id: "c_17", name: "Esteban Villa", status: "prospecto", docNumber: "1.017.000.117", email: "esteban.villa@correo.demo", phone: "+57 321 000 0117", source: "Afiliado", sellerId: "s_3", createdAt: days(-8), tags: ["Vida"] }),
    C({ id: "c_18", name: "Panadería La Espiga", type: "empresa", docType: "NIT", status: "prospecto", docNumber: "901.000.118-6", email: "espiga@correo.demo", phone: "+57 604 000 0118", segment: "Pymes", source: "Web", createdAt: days(-10), tags: ["Pyme"] }),
    C({ id: "c_19", name: "Daniela Castaño", status: "prospecto", docNumber: "1.000.000.119", email: "daniela.c@correo.demo", phone: "+57 322 000 0119", source: "WhatsApp", ownerId: "u_ase2", createdAt: days(-1), tags: ["Salud"] }),
    C({ id: "c_20", name: "Ingeniería Nova S.A.S.", type: "empresa", docType: "NIT", status: "prospecto", docNumber: "901.000.120-8", email: "nova@correo.demo", phone: "+57 604 000 0120", segment: "Corporativo", source: "Llamada", createdAt: days(-12), tags: ["Cumplimiento"] }),
    // Tenant Andes
    { id: "ca_1", tenantId: A, type: "persona", name: "Lucía Benavides", docType: "CC", docNumber: "52.000.201", email: "lucia.b@correo.demo", phone: "+57 301 000 0201", city: "Bogotá", segment: "Personas", source: "Web", ownerId: "u_a_ase", status: "cliente", createdAt: days(-60), tags: ["Auto"] },
    { id: "ca_2", tenantId: A, type: "empresa", name: "Café de la Sabana S.A.S.", docType: "NIT", docNumber: "901.000.202-1", email: "cafe@sabana.demo", phone: "+57 601 000 0202", city: "Chía", segment: "Pymes", source: "Referido", ownerId: "u_a_ase", status: "cliente", createdAt: days(-40), tags: ["Pyme"] },
    { id: "ca_3", tenantId: A, type: "persona", name: "Martín Quintero", docType: "CC", docNumber: "80.000.203", email: "martin.q@correo.demo", phone: "+57 301 000 0203", city: "Bogotá", segment: "Personas", source: "WhatsApp", ownerId: "u_a_ase", status: "prospecto", createdAt: days(-2), tags: ["Hogar"] },
  ];

  /* ───────── Casos ───────── */
  const K = (o: Partial<Case> & Pick<Case, "id" | "code" | "title" | "category" | "status" | "clientId">): Case => ({
    tenantId: G, description: "", priority: "media", assigneeId: "u_ase1", slaHours: 48, dueAt: days(2), createdAt: days(-1),
    updatedAt: days(-1), channel: "whatsapp", ...o,
  });
  const cases: Case[] = [
    K({ id: "k_1", code: "CAS-2026-0001", title: "Cotización seguro de hogar — apartamento Laureles", category: "cotizacion", status: "nuevo", clientId: "c_16", assigneeId: "u_ase2", lineId: "ln_hogar", priority: "media", createdAt: hours(-74), updatedAt: hours(-74), dueAt: hours(-26), conversationId: "cv_4", description: "La prospecta solicita cotizar hogar para apartamento propio de 85 m²." }),
    K({ id: "k_2", code: "CAS-2026-0002", title: "Consulta coberturas de RC para nueva sede", category: "consulta", status: "en_progreso", clientId: "c_6", assigneeId: "u_ase2", channel: "email", priority: "alta", slaHours: 24, createdAt: hours(-60), updatedAt: hours(-52), dueAt: hours(-36), conversationId: "cv_5", description: "La clínica abrirá una nueva sede y pregunta si su póliza RC la cubre." }),
    K({ id: "k_3", code: "CAS-2026-0003", title: "Cotización auto Mazda CX-30 2024 — placa KLM-482", category: "cotizacion", status: "cotizando", clientId: "c_13", lineId: "ln_auto", priority: "alta", slaHours: 24, createdAt: days(-5), updatedAt: days(-1), dueAt: hours(10), conversationId: "cv_2", opportunityId: "op_1", description: "Prospecto referido solicita póliza todo riesgo para vehículo nuevo." }),
    K({ id: "k_4", code: "CAS-2026-0004", title: "Renovación multirriesgo — Distribuidora La Montaña", category: "renovacion", status: "propuesta", clientId: "c_2", assigneeId: "u_ase2", lineId: "ln_pyme", policyId: "pol_2", channel: "outlook", createdAt: days(-9), updatedAt: days(-2), dueAt: days(5), opportunityId: "op_3", description: "Renovación anual con recotización en 3 aseguradoras." }),
    K({ id: "k_5", code: "CAS-2026-0005", title: "Póliza auto Renault Duster — Camilo Herrera", category: "cotizacion", status: "cerrado", clientId: "c_1", lineId: "ln_auto", policyId: "pol_1", createdAt: days(-372), updatedAt: days(-345), dueAt: days(-370), closedAt: days(-345), closeReason: "Póliza emitida y entregada", description: "Cotización inicial y emisión de póliza de automóvil." }),
    K({ id: "k_6", code: "CAS-2026-0006", title: "Siniestro — choque simple en Av. Las Vegas", category: "siniestro", status: "en_progreso", clientId: "c_5", assigneeId: "u_ope", lineId: "ln_auto", policyId: "pol_5", priority: "critica", slaHours: 8, createdAt: days(-2), updatedAt: hours(-20), dueAt: hours(-40), conversationId: "cv_3", description: "Cliente reporta colisión leve; requiere taller y trámite con aseguradora." }),
    K({ id: "k_7", code: "CAS-2026-0007", title: "Renovación póliza de cumplimiento — Altavista", category: "renovacion", status: "nuevo", clientId: "c_4", assigneeId: "u_ope", lineId: "ln_cumpl", policyId: "pol_4", priority: "alta", channel: "llamada", createdAt: hours(-55), updatedAt: hours(-55), dueAt: hours(-7), description: "Póliza vence en menos de 15 días; se requiere confirmar condiciones del contrato." }),
    K({ id: "k_8", code: "CAS-2026-0008", title: "Consulta estado de cuotas — póliza hogar", category: "cartera", status: "esperando_cliente", clientId: "c_3", assigneeId: "u_fin", priority: "baja", slaHours: 72, createdAt: days(-3), updatedAt: days(-1), dueAt: days(0.5), description: "La cliente pregunta cuántas cuotas le faltan y si puede pagar anticipado." }),
    K({ id: "k_9", code: "CAS-2026-0009", title: "Endoso: inclusión de nueva bodega", category: "modificacion", status: "en_progreso", clientId: "c_2", assigneeId: "u_ope", lineId: "ln_pyme", policyId: "pol_2", channel: "email", createdAt: days(-4), updatedAt: days(-1), dueAt: days(1), description: "Incluir bodega de Itagüí en la póliza multirriesgo." }),
    K({ id: "k_10", code: "CAS-2026-0010", title: "Solicitud de certificado de póliza", category: "soporte", status: "resuelto", clientId: "c_7", assigneeId: "u_ase1", priority: "baja", createdAt: days(-6), updatedAt: days(-5), dueAt: days(-4), closedAt: days(-5), description: "Certificado para trámite bancario." }),
    { id: "ka_1", tenantId: A, code: "CAS-2026-0001", title: "Cotización hogar — Martín Quintero", description: "Prospecto solicita hogar.", category: "cotizacion", status: "nuevo", priority: "media", clientId: "ca_3", assigneeId: "u_a_ase", slaHours: 48, dueAt: days(1), createdAt: days(-1), updatedAt: days(-1), channel: "whatsapp", conversationId: "cva_1" },
    { id: "ka_2", tenantId: A, code: "CAS-2026-0002", title: "Renovación auto — Lucía Benavides", description: "Renovación anual.", category: "renovacion", status: "en_progreso", priority: "media", clientId: "ca_1", assigneeId: "u_a_ase", slaHours: 48, dueAt: days(3), createdAt: days(-2), updatedAt: days(-1), channel: "email", policyId: "pola_1" },
  ];

  /* ───────── Oportunidades ───────── */
  const opportunities: Database["opportunities"] = [
    { id: "op_1", tenantId: G, clientId: "c_13", title: "Auto todo riesgo CX-30", lineId: "ln_auto", stage: "cotizando", value: 3_400_000, channel: "WhatsApp", ownerId: "u_ase1", caseId: "k_3", nextAction: "Presentar comparativo", nextActionDate: hours(8), createdAt: days(-5) },
    { id: "op_2", tenantId: G, clientId: "c_16", title: "Hogar apartamento Laureles", lineId: "ln_hogar", stage: "nuevo", value: 980_000, channel: "WhatsApp", ownerId: "u_ase2", caseId: "k_1", nextAction: "Solicitar escritura y avalúo", nextActionDate: hours(4), createdAt: days(-3) },
    { id: "op_3", tenantId: G, clientId: "c_2", title: "Renovación Pyme Protegida", lineId: "ln_pyme", stage: "propuesta", value: 12_800_000, channel: "Correo", ownerId: "u_ase2", caseId: "k_4", nextAction: "Llamar para decisión", nextActionDate: days(1), createdAt: days(-9) },
    { id: "op_4", tenantId: G, clientId: "c_15", title: "Multirriesgo corporativo", lineId: "ln_pyme", stage: "contacto", value: 24_000_000, channel: "Correo", ownerId: "u_ase1", nextAction: "Reunión de levantamiento", nextActionDate: days(2), createdAt: days(-3) },
    { id: "op_5", tenantId: G, clientId: "c_17", title: "Vida individual", lineId: "ln_vida", stage: "documentacion", value: 2_100_000, channel: "Afiliado", ownerId: "u_ase1", sellerId: "s_3", nextAction: "Recibir declaración de salud", nextActionDate: days(1), createdAt: days(-8) },
    { id: "op_6", tenantId: G, clientId: "c_18", title: "Pyme panadería", lineId: "ln_pyme", stage: "negociacion", value: 3_900_000, channel: "Web", ownerId: "u_ase2", nextAction: "Ajustar deducible", nextActionDate: days(3), createdAt: days(-10) },
    { id: "op_7", tenantId: G, clientId: "c_20", title: "Garantías contrato vial", lineId: "ln_cumpl", stage: "cotizando", value: 18_500_000, channel: "Llamada", ownerId: "u_ase1", nextAction: "Esperar oferta Atlas", nextActionDate: days(2), createdAt: days(-12) },
    { id: "op_8", tenantId: G, clientId: "c_19", title: "Salud complementaria familiar", lineId: "ln_salud", stage: "contacto", value: 5_600_000, channel: "WhatsApp", ownerId: "u_ase2", nextAction: "Enviar opciones de planes", nextActionDate: days(1), createdAt: days(-1) },
    { id: "op_9", tenantId: G, clientId: "c_9", title: "Auto Kia Picanto", lineId: "ln_auto", stage: "ganado", value: 1_850_000, channel: "Redes sociales", ownerId: "u_ase2", nextAction: "—", nextActionDate: days(-20), createdAt: days(-40) },
    { id: "op_10", tenantId: G, clientId: "c_14", title: "Auto Chevrolet Onix", lineId: "ln_auto", stage: "perdido", value: 2_300_000, channel: "WhatsApp", ownerId: "u_ase1", nextAction: "—", nextActionDate: days(-30), createdAt: days(-45), lostReason: "Precio — eligió otra agencia" },
    { id: "op_11", tenantId: G, clientId: "c_8", title: "Flota 12 vehículos", lineId: "ln_auto", stage: "negociacion", value: 42_000_000, channel: "Correo", ownerId: "u_ase1", nextAction: "Comité con gerencia", nextActionDate: days(4), createdAt: days(-20) },
    { id: "opa_1", tenantId: A, clientId: "ca_3", title: "Hogar Quintero", lineId: "lna_hogar", stage: "nuevo", value: 900_000, channel: "WhatsApp", ownerId: "u_a_ase", nextAction: "Contactar", nextActionDate: days(1), createdAt: days(-1) },
  ];

  /* ───────── Cotizaciones y ofertas ───────── */
  const quoteRequests: Database["quoteRequests"] = [
    { id: "qr_3", tenantId: G, caseId: "k_3", lineId: "ln_auto", risk: { marca: "Mazda", modelo: "CX-30 Grand Touring", anio: "2024", placa: "KLM-482", uso: "Particular", ciudad: "Medellín", valorAsegurado: "128000000", conductor: "Santiago Cárdenas" }, insurerIds: ["ins_condor", "ins_ceiba", "ins_atlas"], status: "ofertas_recibidas", createdAt: days(-4), createdBy: "u_ase1" },
    { id: "qr_4", tenantId: G, caseId: "k_4", lineId: "ln_pyme", risk: { actividad: "Distribución de alimentos", ubicacion: "Itagüí", valorEdificio: "1800000000", valorContenidos: "950000000" }, insurerIds: ["ins_condor", "ins_faro", "ins_atlas"], status: "propuesta_enviada", createdAt: days(-8), createdBy: "u_ase2" },
    { id: "qr_5", tenantId: G, caseId: "k_5", lineId: "ln_auto", risk: { marca: "Renault", modelo: "Duster Intens", anio: "2022", placa: "JHN-215", uso: "Particular", ciudad: "Medellín", valorAsegurado: "82000000", conductor: "Camilo Herrera" }, insurerIds: ["ins_condor", "ins_ceiba", "ins_atlas"], status: "aceptada", createdAt: days(-371), createdBy: "u_ase1" },
  ];

  const offers: Offer[] = [
    // Caso 3 — 3 ofertas ficticias con diferencias de prima, cobertura y deducible (F02)
    { id: "of_1", tenantId: G, quoteRequestId: "qr_3", caseId: "k_3", insurerId: "ins_condor", productName: "Auto Total Plus", premium: 3_420_000, insuredValue: 128_000_000, deductible: "10% mín. 1 SMMLV", coverages: cov([true, true, true, true, true, true, true, false], { 0: "$4.000 millones", 5: "10 días" }), exclusions: ["Conductor sin licencia vigente", "Uso como plataforma de transporte"], validityDays: 30, notes: "Incluye revisión técnico-mecánica gratis.", version: 1, status: "registrada", receivedAt: days(-3) },
    { id: "of_2", tenantId: G, quoteRequestId: "qr_3", caseId: "k_3", insurerId: "ins_ceiba", productName: "Ceiba Movilidad", premium: 2_980_000, insuredValue: 128_000_000, deductible: "Sin deducible en pérdida total · 15% parcial", coverages: cov([true, true, true, true, true, false, false, false], { 0: "$3.000 millones" }), exclusions: ["Conductor sin licencia vigente", "Eventos en vías no habilitadas", "Accesorios no declarados"], validityDays: 15, notes: "Requiere inspección previa.", version: 1, status: "registrada", receivedAt: days(-2) },
    { id: "of_3", tenantId: G, quoteRequestId: "qr_3", caseId: "k_3", insurerId: "ins_atlas", productName: "Atlas Autos Premium", premium: 3_890_000, insuredValue: 128_000_000, deductible: "$1.200.000 fijo", coverages: cov([true, true, true, true, true, true, true, true], { 0: "$5.000 millones", 5: "15 días" }), exclusions: ["Conductor sin licencia vigente"], validityDays: 30, notes: "Cobertura de accesorios hasta $5 millones.", version: 1, status: "registrada", receivedAt: days(-1) },
    // Caso 4
    { id: "of_4", tenantId: G, quoteRequestId: "qr_4", caseId: "k_4", insurerId: "ins_condor", productName: "Pyme Protegida", premium: 12_800_000, insuredValue: 2_750_000_000, deductible: "10% de la pérdida", coverages: [{ name: "Daños materiales", included: true }, { name: "Lucro cesante", included: true, limit: "6 meses" }, { name: "Equipo electrónico", included: true }, { name: "Manejo global", included: true }, { name: "RC extracontractual", included: true, limit: "$500 millones" }], exclusions: ["Guerra y terrorismo", "Desgaste natural"], validityDays: 30, notes: "Renovación con ajuste IPC.", version: 2, status: "registrada", receivedAt: days(-6) },
    { id: "of_5", tenantId: G, quoteRequestId: "qr_4", caseId: "k_4", insurerId: "ins_faro", productName: "Empresa Segura Faro", premium: 11_950_000, insuredValue: 2_750_000_000, deductible: "15% de la pérdida", coverages: [{ name: "Daños materiales", included: true }, { name: "Lucro cesante", included: true, limit: "3 meses" }, { name: "Equipo electrónico", included: true }, { name: "Manejo global", included: false }, { name: "RC extracontractual", included: true, limit: "$300 millones" }], exclusions: ["Guerra y terrorismo", "Desgaste natural", "Mercancía en tránsito"], validityDays: 20, notes: "", version: 1, status: "registrada", receivedAt: days(-5) },
    { id: "of_6", tenantId: G, quoteRequestId: "qr_4", caseId: "k_4", insurerId: "ins_atlas", productName: "Atlas Empresarial", premium: 13_600_000, insuredValue: 2_750_000_000, deductible: "8% de la pérdida", coverages: [{ name: "Daños materiales", included: true }, { name: "Lucro cesante", included: true, limit: "9 meses" }, { name: "Equipo electrónico", included: true }, { name: "Manejo global", included: true }, { name: "RC extracontractual", included: true, limit: "$800 millones" }], exclusions: ["Guerra y terrorismo"], validityDays: 30, notes: "Incluye asistencia empresarial.", version: 1, status: "registrada", receivedAt: days(-5) },
    // Caso 5 — histórico (aceptada Cóndor)
    { id: "of_7", tenantId: G, quoteRequestId: "qr_5", caseId: "k_5", insurerId: "ins_condor", productName: "Auto Total Plus", premium: 2_450_000, insuredValue: 82_000_000, deductible: "10% mín. 1 SMMLV", coverages: cov([true, true, true, true, true, true, true, false]), exclusions: ["Conductor sin licencia vigente"], validityDays: 30, notes: "", version: 1, status: "seleccionada", receivedAt: days(-370) },
    { id: "of_8", tenantId: G, quoteRequestId: "qr_5", caseId: "k_5", insurerId: "ins_ceiba", productName: "Ceiba Movilidad", premium: 2_190_000, insuredValue: 82_000_000, deductible: "15% parcial", coverages: cov([true, true, true, true, true, false, false, false]), exclusions: ["Conductor sin licencia vigente"], validityDays: 15, notes: "", version: 1, status: "descartada", receivedAt: days(-370) },
    { id: "of_9", tenantId: G, quoteRequestId: "qr_5", caseId: "k_5", insurerId: "ins_atlas", productName: "Atlas Autos Premium", premium: 2_870_000, insuredValue: 82_000_000, deductible: "$1.000.000 fijo", coverages: cov([true, true, true, true, true, true, true, true]), exclusions: [], validityDays: 30, notes: "", version: 1, status: "descartada", receivedAt: days(-369) },
  ];

  const proposals: Database["proposals"] = [
    { id: "pp_4", tenantId: G, caseId: "k_4", quoteRequestId: "qr_4", offerIds: ["of_4", "of_5", "of_6"], recommendedOfferId: "of_4", version: 1, status: "enviada", createdAt: days(-3), sentAt: days(-2), advisorId: "u_ase2" },
    { id: "pp_5", tenantId: G, caseId: "k_5", quoteRequestId: "qr_5", offerIds: ["of_7", "of_8", "of_9"], recommendedOfferId: "of_7", version: 1, status: "aceptada", createdAt: days(-368), sentAt: days(-368), acceptedOfferId: "of_7", acceptanceEvidence: "Confirmación por WhatsApp: «Listo, me quedo con Cóndor»", acceptedAt: days(-366), advisorId: "u_ase1" },
    { id: "pp_x", tenantId: G, caseId: "k_10", quoteRequestId: "qr_x", offerIds: [], version: 1, status: "rechazada", createdAt: days(-30), advisorId: "u_ase1" },
  ];

  /* ───────── Pólizas ───────── */
  const P = (o: Partial<Policy> & Pick<Policy, "id" | "number" | "clientId" | "insurerId" | "lineId" | "insuredItem" | "startDate" | "endDate" | "premium">): Policy => ({
    tenantId: G, insuredValue: 0, deductible: "10%", paymentMethod: "cuotas", installments: 10, commissionRate: 0.12, status: "vigente",
    validation: { status: "conforme", discrepancies: [], reviewedBy: "Felipe Cardona" }, ...o,
  });
  const policies: Policy[] = [
    P({ id: "pol_1", number: "CON-AU-2025-118402", clientId: "c_1", insurerId: "ins_condor", lineId: "ln_auto", caseId: "k_5", offerId: "of_7", proposalId: "pp_5", insuredItem: "Renault Duster Intens 2022 · JHN-215", startDate: days(-345), endDate: days(20), premium: 2_450_000, insuredValue: 82_000_000, deductible: "10% mín. 1 SMMLV", status: "por_vencer", sellerId: "s_1" }),
    P({ id: "pol_2", number: "CON-PY-2025-004417", clientId: "c_2", insurerId: "ins_condor", lineId: "ln_pyme", insuredItem: "Bodega principal y contenidos — Itagüí", startDate: days(-330), endDate: days(35), premium: 11_900_000, insuredValue: 2_600_000_000, deductible: "10% de la pérdida", status: "vigente", paymentMethod: "financiado", installments: 6, sellerId: "s_2" }),
    P({ id: "pol_3", number: "FAR-HO-2026-020931", clientId: "c_3", insurerId: "ins_faro", lineId: "ln_hogar", insuredItem: "Casa en Envigado — barrio La Magnolia", startDate: days(-120), endDate: days(245), premium: 1_380_000, insuredValue: 640_000_000, deductible: "3% del valor asegurado", commissionRate: 0.14, sellerId: "s_3" }),
    P({ id: "pol_4", number: "ATL-CU-2025-007781", clientId: "c_4", insurerId: "ins_atlas", lineId: "ln_cumpl", insuredItem: "Contrato de obra pública No. 045-2025", startDate: days(-353), endDate: days(12), premium: 8_750_000, insuredValue: 1_200_000_000, deductible: "N/A", status: "por_vencer", paymentMethod: "contado", installments: 1, commissionRate: 0.11, sellerId: "s_1" }),
    P({ id: "pol_5", number: "CEI-AU-2026-031250", clientId: "c_5", insurerId: "ins_ceiba", lineId: "ln_auto", insuredItem: "Toyota Corolla Cross 2023 · LPQ-903", startDate: days(-80), endDate: days(285), premium: 3_150_000, insuredValue: 115_000_000, deductible: "15% parcial", commissionRate: 0.13, sellerId: "s_3" }),
    P({ id: "pol_6", number: "CEI-RC-2026-001988", clientId: "c_6", insurerId: "ins_ceiba", lineId: "ln_rc", insuredItem: "RC profesional — 6 odontólogos", startDate: days(-200), endDate: days(165), premium: 4_600_000, insuredValue: 800_000_000, deductible: "$2.000.000", commissionRate: 0.13, paymentMethod: "cuotas", installments: 4, sellerId: "s_2" }),
    P({ id: "pol_7", number: "CON-AU-2026-120077", clientId: "c_9", insurerId: "ins_condor", lineId: "ln_auto", insuredItem: "Kia Picanto 2025 · MNB-110", startDate: days(-20), endDate: days(345), premium: 1_850_000, insuredValue: 62_000_000, deductible: "10% mín. 1 SMMLV", sellerId: "s_2", validation: { status: "con_discrepancias", discrepancies: [{ field: "Deducible", expected: "10% mín. 1 SMMLV", received: "15% mín. 1 SMMLV" }] } }),
    P({ id: "pol_8", number: "FAR-HO-2026-022100", clientId: "c_10", insurerId: "ins_faro", lineId: "ln_pyme", insuredItem: "Local comercial — Restaurante El Fogón", startDate: days(-60), endDate: days(305), premium: 2_900_000, insuredValue: 380_000_000, deductible: "10%", commissionRate: 0.14, sellerId: "s_4" }),
    { id: "pola_1", tenantId: A, number: "PAR-AU-2025-000301", clientId: "ca_1", insurerId: "insa_1", lineId: "lna_auto", insuredItem: "Mazda 2 2021 · BOG-778", startDate: days(-355), endDate: days(10), premium: 1_700_000, insuredValue: 58_000_000, deductible: "10%", paymentMethod: "contado", installments: 1, commissionRate: 0.12, status: "por_vencer", validation: { status: "conforme", discrepancies: [] } },
  ];

  /* ───────── Cartera y comisiones (derivadas — RN-12 datos ficticios) ───────── */
  const installments: Installment[] = [];
  const commissions: Commission[] = [];
  for (const p of policies) {
    const n = Math.max(1, p.installments);
    const amount = Math.round(p.premium / n);
    const start = new Date(p.startDate).getTime();
    for (let i = 0; i < n; i++) {
      const due = new Date(start + i * 30 * D);
      const isPast = due.getTime() < Date.now();
      // c_3 tiene 1 cuota vencida sin pagar para demostrar alertas
      const paid = isPast && !(p.id === "pol_3" && i === 3) && !(p.id === "pol_6" && i === 2);
      installments.push({ id: `in_${p.id}_${i + 1}`, tenantId: p.tenantId, policyId: p.id, number: i + 1, dueDate: due.toISOString(), amount, paid, paidAt: paid ? due.toISOString() : undefined });
    }
    const seller = sellers.find((s) => s.id === p.sellerId);
    const amountC = Math.round(p.premium * p.commissionRate);
    const ageDays = (Date.now() - start) / D;
    commissions.push({
      id: `cm_${p.id}`, tenantId: p.tenantId, policyId: p.id, insurerId: p.insurerId, sellerId: p.sellerId, base: p.premium, rate: p.commissionRate,
      amount: amountC, sellerAmount: Math.round(amountC * (seller?.commissionShare ?? 0)),
      status: ageDays > 90 ? "liquidada" : ageDays > 30 ? "por_liquidar" : "causada",
      period: new Date(p.startDate).toLocaleDateString("es-CO", { month: "short", year: "numeric" }),
    });
  }

  /* ───────── Siniestros, endosos ───────── */
  const claims: Database["claims"] = [
    { id: "clm_1", tenantId: G, caseId: "k_6", policyId: "pol_5", clientId: "c_5", description: "Colisión leve por alcance en semáforo de Av. Las Vegas. Daños en bómper trasero y stop izquierdo. Sin lesionados.", occurredAt: days(-2), status: "documentacion", amountClaimed: 4_300_000 },
  ];
  const endorsements: Database["endorsements"] = [
    { id: "en_1", tenantId: G, policyId: "pol_2", caseId: "k_9", type: "Inclusión de ubicación", description: "Agregar bodega en Itagüí, valor contenidos $320 millones.", status: "en_aseguradora", at: days(-3) },
    { id: "en_2", tenantId: G, policyId: "pol_6", type: "Inclusión de asegurado", description: "Incluir nueva odontóloga en la póliza.", status: "aplicado", at: days(-40) },
  ];

  /* ───────── Conversaciones ───────── */
  const conversations: Conversation[] = [
    { id: "cv_1", tenantId: G, channel: "whatsapp", contactName: "Paola Jiménez", contactHandle: "+57 319 000 0114", clientId: "c_14", status: "abierta", mode: "ia", unread: 2, lastMessageAt: hours(-0.4), caseIds: [] },
    { id: "cv_2", tenantId: G, channel: "whatsapp", contactName: "Santiago Cárdenas", contactHandle: "+57 318 000 0113", clientId: "c_13", status: "abierta", mode: "humano", assigneeId: "u_ase1", unread: 0, lastMessageAt: days(-1), caseIds: ["k_3"] },
    { id: "cv_3", tenantId: G, channel: "whatsapp", contactName: "Juan Pablo Arango", contactHandle: "+57 314 000 0105", clientId: "c_5", status: "abierta", mode: "humano", assigneeId: "u_ope", unread: 1, lastMessageAt: hours(-20), caseIds: ["k_6"] },
    { id: "cv_4", tenantId: G, channel: "whatsapp", contactName: "Laura Cristina Patiño", contactHandle: "+57 320 000 0116", clientId: "c_16", status: "abierta", mode: "ia", unread: 0, lastMessageAt: hours(-74), caseIds: ["k_1"] },
    { id: "cv_5", tenantId: G, channel: "email", contactName: "Clínica Dental Sonrisa", contactHandle: "admin@sonrisa.demo", clientId: "c_6", subject: "Cobertura RC nueva sede Poblado", status: "abierta", mode: "humano", assigneeId: "u_ase2", unread: 0, lastMessageAt: hours(-52), caseIds: ["k_2"] },
    { id: "cv_6", tenantId: G, channel: "outlook", contactName: "Inversiones Robledo", contactHandle: "contacto@robledo.demo", clientId: "c_15", subject: "Solicitud de cotización multirriesgo", status: "abierta", mode: "ia", unread: 1, lastMessageAt: hours(-5), caseIds: [] },
    { id: "cv_7", tenantId: G, channel: "email", contactName: "Desconocido", contactHandle: "jorge.p.demo@correo.demo", subject: "Info seguros de vida", status: "abierta", mode: "ia", unread: 1, lastMessageAt: hours(-9), caseIds: [] },
    { id: "cva_1", tenantId: A, channel: "whatsapp", contactName: "Martín Quintero", contactHandle: "+57 301 000 0203", clientId: "ca_3", status: "abierta", mode: "ia", unread: 1, lastMessageAt: hours(-6), caseIds: ["ka_1"] },
  ];

  const M = (conversationId: string, direction: Message["direction"], author: Message["author"], authorName: string, body: string, when: string, attachments?: Message["attachments"], tenantId = G): Message => ({
    id: `m_${conversationId}_${Math.random().toString(36).slice(2, 8)}`, tenantId, conversationId, direction, author, authorName, body, at: when, attachments, simulated: direction === "out",
  });
  const messages: Message[] = [
    M("cv_1", "in", "cliente", "Paola Jiménez", "Hola buenas tardes 👋 necesito asegurar mi vehículo, es un Chevrolet Tracker 2023 placa HTR-551", hours(-0.6)),
    M("cv_1", "in", "cliente", "Paola Jiménez", "Lo uso para ir al trabajo en Medellín. ¿Qué necesitan para cotizar?", hours(-0.4)),
    M("cv_2", "in", "cliente", "Santiago Cárdenas", "Buenos días, me recomendó Diego Zapata. Quiero asegurar mi Mazda CX-30 2024, placa KLM-482.", days(-5)),
    M("cv_2", "out", "ia", "Asistente GC360", "¡Hola Santiago! Con gusto te ayudo. Para cotizar con varias aseguradoras necesito: foto de la tarjeta de propiedad y de tu cédula. ¿Me las compartes?", days(-5) ),
    M("cv_2", "in", "cliente", "Santiago Cárdenas", "Listo, aquí van", days(-4.9), [{ name: "tarjeta_propiedad_KLM482.jpg", kind: "imagen", size: "1.2 MB" }, { name: "cedula_scardenas.pdf", kind: "pdf", size: "340 KB" }]),
    M("cv_2", "internal", "sistema", "Sistema", "Caso CAS-2026-0003 creado y asignado a Andrés Gómez.", days(-4.9)),
    M("cv_2", "out", "agente", "Andrés Gómez", "Santiago, ya tengo tus documentos. Estoy solicitando ofertas a 3 aseguradoras, mañana te envío el comparativo.", days(-1)),
    M("cv_3", "in", "cliente", "Juan Pablo Arango", "Hola, tuve un choque simple, me pegaron por detrás en la Av. Las Vegas. ¿Qué hago?", days(-2)),
    M("cv_3", "out", "ia", "Asistente GC360", "Lamento lo ocurrido, Juan Pablo. ¿Hay personas lesionadas? Por favor envía fotos de los daños y del otro vehículo. Ya estoy preparando el caso de siniestro.", days(-2)),
    M("cv_3", "in", "cliente", "Juan Pablo Arango", "No hay heridos. Prefiero hablar con un asesor por favor", days(-1.98), [{ name: "foto_bomper.jpg", kind: "imagen", size: "2.1 MB" }]),
    M("cv_3", "internal", "sistema", "Sistema", "Cliente solicitó atención humana. IA transfirió la conversación a Felipe Cardona con el contexto completo.", days(-1.98)),
    M("cv_3", "out", "agente", "Felipe Cardona", "Hola Juan Pablo, soy Felipe de operaciones. Ya tengo todo tu contexto. Te llamo en 10 minutos para guiarte con el taller.", days(-1.97)),
    M("cv_3", "in", "cliente", "Juan Pablo Arango", "Gracias Felipe. ¿Ya les llegó el informe de tránsito?", hours(-20), [{ name: "informe_transito.pdf", kind: "pdf", size: "820 KB" }]),
    M("cv_4", "in", "cliente", "Laura Cristina Patiño", "Hola! quisiera cotizar un seguro para mi apartamento en Laureles, son 85 m2", hours(-74)),
    M("cv_4", "out", "ia", "Asistente GC360", "¡Hola Laura! Gracias por escribirnos. Creé tu solicitud CAS-2026-0001. Una asesora te contactará para completar los datos.", hours(-74)),
    M("cv_5", "in", "cliente", "Clínica Dental Sonrisa", "Buenos días. Vamos a abrir una nueva sede en El Poblado el próximo mes. ¿Nuestra póliza de RC profesional cubre la nueva sede o debemos hacer algún endoso?", hours(-60)),
    M("cv_5", "out", "agente", "Valentina Ríos", "Buen día. Estoy revisando las condiciones con Ceiba y les confirmo hoy mismo.", hours(-52)),
    M("cv_6", "in", "cliente", "Inversiones Robledo", "Cordial saludo. Solicitamos cotización de póliza multirriesgo para nuestras oficinas (3 pisos, valor edificio $4.200 millones). Adjuntamos inventario de equipos.", hours(-5), [{ name: "inventario_equipos.xlsx", kind: "doc", size: "96 KB" }]),
    M("cv_7", "in", "cliente", "Desconocido", "Buenas noches, ¿manejan seguros de vida para mayores de 60 años? Gracias.", hours(-9)),
    M("cva_1", "in", "cliente", "Martín Quintero", "Hola, quiero cotizar seguro de hogar", hours(-6), undefined, A),
  ];

  /* ───────── Tareas ───────── */
  const T = (o: Partial<Task> & Pick<Task, "id" | "title" | "assigneeId" | "dueAt">): Task => ({ tenantId: G, type: "tarea", done: false, mandatory: false, origin: "manual", createdAt: days(-1), ...o });
  const tasks: Task[] = [
    T({ id: "t_1", title: "Presentar comparativo a Santiago Cárdenas", caseId: "k_3", clientId: "c_13", assigneeId: "u_ase1", dueAt: hours(8), mandatory: true, type: "seguimiento" }),
    T({ id: "t_2", title: "Solicitar escritura y avalúo del apartamento", caseId: "k_1", clientId: "c_16", assigneeId: "u_ase2", dueAt: hours(-20), mandatory: true, origin: "ia" }),
    T({ id: "t_3", title: "Llamar a Ricardo Ochoa para decisión de renovación", caseId: "k_4", clientId: "c_2", assigneeId: "u_ase2", dueAt: days(1), type: "llamada" }),
    T({ id: "t_4", title: "Enviar documentos del siniestro a Ceiba", caseId: "k_6", clientId: "c_5", assigneeId: "u_ope", dueAt: hours(4), mandatory: true }),
    T({ id: "t_5", title: "Confirmar con Atlas condiciones de renovación", caseId: "k_7", clientId: "c_4", assigneeId: "u_ope", dueAt: days(1), mandatory: true }),
    T({ id: "t_6", title: "Reunión de levantamiento con Inversiones Robledo", clientId: "c_15", assigneeId: "u_ase1", dueAt: days(2), type: "reunion" }),
    T({ id: "t_7", title: "Seguimiento cuota vencida — María Fernanda López", caseId: "k_8", clientId: "c_3", assigneeId: "u_fin", dueAt: hours(6), type: "seguimiento", origin: "automatizacion" }),
    T({ id: "t_8", title: "Revisar respuesta de Ceiba sobre cobertura nueva sede", caseId: "k_2", clientId: "c_6", assigneeId: "u_ase2", dueAt: hours(-10), mandatory: true }),
    T({ id: "t_9", title: "Recordatorio: renovación Camilo Herrera (20 días)", clientId: "c_1", assigneeId: "u_ase1", dueAt: days(2), type: "recordatorio", origin: "automatizacion" }),
    T({ id: "t_10", title: "Enviar certificado de póliza", caseId: "k_10", clientId: "c_7", assigneeId: "u_ase1", dueAt: days(-5), done: true }),
    T({ id: "ta_1", tenantId: A, title: "Contactar a Martín Quintero", caseId: "ka_1", clientId: "ca_3", assigneeId: "u_a_ase", dueAt: hours(5) }),
  ];

  /* ───────── Documentos ───────── */
  const Doc = (o: Partial<DocumentFile> & Pick<DocumentFile, "id" | "name" | "kind">): DocumentFile => ({ tenantId: G, version: 1, uploadedBy: "Andrés Gómez", at: days(-2), validation: "validado", restricted: false, size: "450 KB", ...o });
  const documents: DocumentFile[] = [
    Doc({ id: "d_1", name: "tarjeta_propiedad_KLM482.jpg", kind: "matricula", caseId: "k_3", clientId: "c_13", uploadedBy: "Santiago Cárdenas (WhatsApp)", at: days(-4.9), size: "1.2 MB" }),
    Doc({ id: "d_2", name: "cedula_scardenas.pdf", kind: "identidad", caseId: "k_3", clientId: "c_13", uploadedBy: "Santiago Cárdenas (WhatsApp)", at: days(-4.9), restricted: true, size: "340 KB" }),
    Doc({ id: "d_3", name: "oferta_condor_KLM482.pdf", kind: "cotizacion", caseId: "k_3", clientId: "c_13", at: days(-3) }),
    Doc({ id: "d_4", name: "oferta_ceiba_KLM482.pdf", kind: "cotizacion", caseId: "k_3", clientId: "c_13", at: days(-2) }),
    Doc({ id: "d_5", name: "oferta_atlas_KLM482.pdf", kind: "cotizacion", caseId: "k_3", clientId: "c_13", at: days(-1) }),
    Doc({ id: "d_6", name: "poliza_CON-AU-2025-118402.pdf", kind: "poliza", policyId: "pol_1", clientId: "c_1", caseId: "k_5", uploadedBy: "Felipe Cardona", at: days(-345), version: 2 }),
    Doc({ id: "d_7", name: "foto_bomper.jpg", kind: "siniestro", caseId: "k_6", clientId: "c_5", policyId: "pol_5", uploadedBy: "Juan Pablo Arango (WhatsApp)", at: days(-1.98), validation: "pendiente", restricted: true, size: "2.1 MB" }),
    Doc({ id: "d_8", name: "informe_transito.pdf", kind: "siniestro", caseId: "k_6", clientId: "c_5", policyId: "pol_5", uploadedBy: "Juan Pablo Arango (WhatsApp)", at: hours(-20), validation: "pendiente", restricted: true, size: "820 KB" }),
    Doc({ id: "d_9", name: "propuesta_renovacion_LaMontana_v1.pdf", kind: "propuesta", caseId: "k_4", clientId: "c_2", uploadedBy: "Valentina Ríos", at: days(-2) }),
    Doc({ id: "d_10", name: "poliza_ATL-CU-2025-007781.pdf", kind: "poliza", policyId: "pol_4", clientId: "c_4", uploadedBy: "Felipe Cardona", at: days(-353) }),
    Doc({ id: "d_11", name: "poliza_FAR-HO-2026-020931.pdf", kind: "poliza", policyId: "pol_3", clientId: "c_3", uploadedBy: "Felipe Cardona", at: days(-120) }),
    Doc({ id: "d_12", name: "poliza_CEI-AU-2026-031250.pdf", kind: "poliza", policyId: "pol_5", clientId: "c_5", uploadedBy: "Felipe Cardona", at: days(-80) }),
  ];

  /* ───────── IA ───────── */
  const aiActions: Database["aiActions"] = [
    { id: "ai_1", tenantId: G, kind: "seguimiento", title: "Enviar propuesta de renovación a Constructora Altavista", detail: "La póliza ATL-CU-2025-007781 vence en 12 días. Propongo enviar correo con condiciones de renovación y solicitar el acta de avance de obra.", payload: { channel: "email", to: "licitaciones@altavista.demo", body: "Estimado Hernán: su póliza de cumplimiento vence pronto. Para renovar, necesitamos el acta de avance de obra actualizada..." }, source: "Póliza ATL-CU-2025-007781 · Regla «Renovaciones 30/15 días»", instruction: "Preparar seguimiento de renovación a 15 días del vencimiento", agent: "Agente de operaciones", caseId: "k_7", status: "pendiente", sensitive: true, confidence: 0.91, createdAt: hours(-6) },
    { id: "ai_2", tenantId: G, kind: "responder", title: "Responder a Juan Pablo sobre informe de tránsito", detail: "Confirmar recepción del informe y explicar los siguientes pasos del trámite con Ceiba.", payload: { channel: "whatsapp", conversationId: "cv_3", body: "Hola Juan Pablo, recibimos el informe de tránsito ✅. Lo enviaremos hoy a Ceiba junto con las fotos. El siguiente paso es la inspección en taller; te confirmaremos la cita." }, source: "Conversación WhatsApp · Caso CAS-2026-0006", instruction: "Sugerir respuesta a mensaje entrante", agent: "Asistente comercial virtual", caseId: "k_6", conversationId: "cv_3", status: "pendiente", sensitive: true, confidence: 0.87, createdAt: hours(-19) },
    { id: "ai_3", tenantId: G, kind: "crear_tarea", title: "Crear tarea: solicitar escritura y avalúo", detail: "El caso de hogar requiere documentos para cotizar.", payload: {}, source: "Caso CAS-2026-0001", instruction: "Proponer tareas para casos nuevos", agent: "Agente de operaciones", caseId: "k_1", status: "ejecutada", sensitive: false, confidence: 0.94, createdAt: hours(-73), decidedBy: "Automática (no sensible)", decidedAt: hours(-73) },
    { id: "ai_4", tenantId: G, kind: "responder", title: "Ofrecer descuento del 10% a Distribuidora La Montaña", detail: "Propuesta de ofrecer descuento para cerrar la renovación.", payload: {}, source: "Caso CAS-2026-0004", instruction: "Sugerir estrategia de cierre", agent: "Asistente comercial virtual", caseId: "k_4", status: "rechazada", sensitive: true, confidence: 0.62, createdAt: days(-2), decidedBy: "Sebastián Mora", decidedAt: days(-2), decisionNote: "La agencia no puede ofrecer descuentos sobre la prima de la aseguradora." },
  ];

  const automations: Database["automations"] = [
    { id: "au_1", tenantId: G, name: "Renovaciones 30/15 días", description: "Crea caso de renovación y borrador de seguimiento antes del vencimiento.", trigger: "Póliza próxima a vencer", conditions: [{ field: "Días para vencimiento", op: "≤", value: "30" }, { field: "Estado póliza", op: "=", value: "Vigente / Por vencer" }], actions: [{ type: "Crear caso", target: "Renovación" }, { type: "Generar borrador IA", target: "Correo / WhatsApp" }, { type: "Asignar", target: "Ejecutivo de la cuenta" }], approval: "supervisor", active: true, runs: 47, lastRun: hours(-6) },
    { id: "au_2", tenantId: G, name: "Clasificación de mensajes entrantes", description: "La IA clasifica cada mensaje nuevo y propone crear o asociar un caso.", trigger: "Mensaje entrante (WhatsApp / correo)", conditions: [{ field: "Remitente", op: "≠", value: "Interno" }], actions: [{ type: "Clasificar con IA", target: "Categoría + prioridad" }, { type: "Proponer caso", target: "Bandeja" }], approval: "ninguna", active: true, runs: 1284, lastRun: hours(-0.4) },
    { id: "au_3", tenantId: G, name: "Escalamiento SLA vencido", description: "Notifica al supervisor cuando un caso supera su SLA.", trigger: "SLA vencido", conditions: [{ field: "Prioridad", op: "∈", value: "Alta, Crítica" }], actions: [{ type: "Notificar", target: "Gerencia" }, { type: "Subir prioridad", target: "+1 nivel" }], approval: "ninguna", active: true, runs: 36, lastRun: hours(-7) },
    { id: "au_4", tenantId: G, name: "Recordatorio de cuota vencida", description: "Programa seguimiento cuando una cuota supera 5 días de mora.", trigger: "Cuota vencida", conditions: [{ field: "Días de mora", op: "≥", value: "5" }], actions: [{ type: "Crear tarea", target: "Cartera" }, { type: "Borrador WhatsApp", target: "Cliente" }], approval: "supervisor", active: false, runs: 12, lastRun: days(-3) },
  ];

  const templates: Database["templates"] = [
    { id: "tp_1", tenantId: G, name: "Bienvenida y solicitud de documentos (auto)", channel: "whatsapp", category: "cotizacion", status: "aprobado", body: "¡Hola {{nombre}}! Gracias por escribir a Gran Seguros. Para cotizar tu vehículo con varias aseguradoras necesitamos: 1) tarjeta de propiedad, 2) cédula del conductor principal. Tu número de caso es {{caso}}." },
    { id: "tp_2", tenantId: G, name: "Envío de comparativo", channel: "email", category: "cotizacion", status: "aprobado", body: "Estimado(a) {{nombre}}: adjuntamos el cuadro comparativo de {{n}} aseguradoras para {{riesgo}}. Quedamos atentos a tu elección o a resolver dudas." },
    { id: "tp_3", tenantId: G, name: "Aviso de renovación", channel: "whatsapp", category: "renovacion", status: "aprobado", body: "Hola {{nombre}}, tu póliza {{poliza}} vence el {{fecha}}. Ya estamos preparando opciones de renovación para ti. ¿Hubo cambios en el bien asegurado?" },
    { id: "tp_4", tenantId: G, name: "Recepción de siniestro", channel: "whatsapp", category: "siniestro", status: "aprobado", body: "Lamentamos lo ocurrido, {{nombre}}. Creamos el caso {{caso}}. Envíanos fotos, informe de tránsito y datos del tercero. Un analista te acompañará en todo el proceso." },
    { id: "tp_5", tenantId: G, name: "Recordatorio de cuota", channel: "whatsapp", category: "cartera", status: "borrador", body: "Hola {{nombre}}, te recordamos que la cuota {{n}} de tu póliza {{poliza}} venció el {{fecha}}. ¿Te ayudamos con el pago?" },
  ];

  const agents: Database["agents"] = [
    { id: "ag_1", tenantId: G, name: "Asistente comercial virtual", purpose: "Atender WhatsApp y correo 24/7, calificar prospectos y recolectar documentos.", instructions: "Saluda con calidez, identifica el ramo, solicita los documentos mínimos y crea el caso. Nunca prometas precios ni coberturas sin ofertas registradas. Si el cliente pide un asesor, transfiere de inmediato.", tone: "Cercano y profesional", sources: ["Catálogo de productos", "Plantillas aprobadas", "FAQ comercial"], allowedActions: ["Responder consultas generales", "Crear caso", "Solicitar documentos", "Agendar llamada"], approvalRequired: ["Enviar comparativo", "Comunicaciones de siniestros"], channels: ["whatsapp", "email", "outlook"], schedule: "24/7 · prioridad fuera de horario laboral", active: true },
    { id: "ag_2", tenantId: G, name: "Agente de operaciones", purpose: "Seguimiento de renovaciones, siniestros, endosos y validación de pólizas.", instructions: "Compara la póliza recibida contra la oferta aceptada campo por campo. Programa avisos de renovación a 30 y 15 días. Escala a humano cualquier modificación contractual.", tone: "Preciso y formal", sources: ["Pólizas", "Ofertas registradas", "Condiciones de aseguradoras"], allowedActions: ["Crear tareas", "Validar póliza", "Preparar borradores"], approvalRequired: ["Solicitar emisión", "Solicitar endoso", "Comunicaciones a aseguradora"], channels: ["email"], schedule: "Lun–Sáb 6:00–22:00", active: true },
    { id: "ag_3", tenantId: G, name: "Copiloto gerencial", purpose: "Responder preguntas de gerencia sobre la operación con datos filtrados por permisos.", instructions: "Responde con cifras y tablas. Cita siempre la fuente de datos. Propón acciones concretas.", tone: "Ejecutivo", sources: ["Casos", "Pólizas", "Cartera", "Comisiones", "Pipeline"], allowedActions: ["Consultar datos", "Generar informes"], approvalRequired: [], channels: ["portal"], schedule: "Siempre", active: true },
  ];

  /* ───────── Auditoría inicial (≥10 eventos) ───────── */
  const evs: [string, AuditEvent["actorType"], AuditEvent["entity"], string, string, string, string | undefined, number][] = [
    ["Sistema", "sistema", "case", "k_3", "Caso creado", "CAS-2026-0003 creado desde WhatsApp", "k_3", -4.9 * 24],
    ["Asistente GC360", "ia", "case", "k_3", "Clasificación IA", "Clasificado como «Nueva cotización · Automóviles» (confianza 96%)", "k_3", -4.9 * 24],
    ["Andrés Gómez", "usuario", "case", "k_3", "Asignación", "Responsable: Andrés Gómez", "k_3", -4.8 * 24],
    ["Andrés Gómez", "usuario", "case", "k_3", "Solicitud a aseguradoras", "Solicitadas ofertas a Cóndor, Ceiba y Atlas", "k_3", -4 * 24],
    ["Andrés Gómez", "usuario", "offer", "of_1", "Oferta registrada", "Cóndor · Auto Total Plus · $3.420.000", "k_3", -3 * 24],
    ["Andrés Gómez", "usuario", "offer", "of_2", "Oferta registrada", "Ceiba · Ceiba Movilidad · $2.980.000", "k_3", -2 * 24],
    ["Andrés Gómez", "usuario", "offer", "of_3", "Oferta registrada", "Atlas · Autos Premium · $3.890.000", "k_3", -1 * 24],
    ["Sistema", "sistema", "case", "k_6", "Caso creado", "CAS-2026-0006 siniestro creado desde WhatsApp", "k_6", -48],
    ["Asistente GC360", "ia", "conversation", "cv_3", "Transferencia a humano", "Cliente solicitó asesor; IA transfirió a Felipe Cardona", "k_6", -47.5],
    ["Felipe Cardona", "usuario", "case", "k_6", "Cambio de estado", "Nuevo → En progreso", "k_6", -47],
    ["Valentina Ríos", "usuario", "proposal", "pp_4", "Propuesta enviada", "Propuesta v1 enviada a Distribuidora La Montaña", "k_4", -48],
    ["Sebastián Mora", "usuario", "ai_action", "ai_4", "Acción IA rechazada", "«Ofrecer descuento del 10%» — no permitido por política", "k_4", -47],
    ["Laura Méndez", "usuario", "config", "au_1", "Automatización actualizada", "Regla «Renovaciones 30/15 días» requiere aprobación de supervisor", undefined, -120],
    ["Laura Méndez", "usuario", "user", "u_afi", "Permisos", "Rol afiliado limitado a cartera propia", undefined, -200],
    ["Felipe Cardona", "usuario", "policy", "pol_7", "Validación de póliza", "Discrepancia detectada en deducible (esperado 10%, recibido 15%)", undefined, -19 * 24],
  ];
  evs.forEach(([actorName, actorType, entity, entityId, action, detail, caseId, h]) =>
    log({ tenantId: G, at: hours(h), actorName, actorType, entity, entityId, action, detail, caseId }),
  );
  ["k_1", "k_2", "k_4", "k_7", "k_8", "k_9", "k_10"].forEach((id) => {
    const c = cases.find((x) => x.id === id)!;
    log({ tenantId: G, at: c.createdAt, actorName: "Sistema", actorType: "sistema", entity: "case", entityId: id, caseId: id, action: "Caso creado", detail: `${c.code} creado desde ${c.channel}` });
  });
  log({ tenantId: A, at: days(-1), actorName: "Sistema", actorType: "sistema", entity: "case", entityId: "ka_1", caseId: "ka_1", action: "Caso creado", detail: "CAS-2026-0001 creado desde WhatsApp" });

  return {
    tenants, users, clients, sellers, opportunities, conversations, messages, cases, tasks, documents, events,
    insurers, lines, products, quoteRequests, offers, proposals, policies, installments, commissions, claims,
    endorsements, aiActions, automations, templates, agents,
  };
}
