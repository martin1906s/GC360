/** Datos de demostración para los módulos ERP (financiero y administrativo) y Academia. */

const D = 86400000;
const day = (n: number) => new Date(Date.now() + n * D).toISOString();

/* ───────── Financiero ───────── */

export const BANK_ACCOUNTS = [
  { id: "b1", bank: "Banco Andino", type: "Corriente", number: "****4821", balance: 186_450_000, currency: "COP" },
  { id: "b2", bank: "Banco del Valle", type: "Ahorros", number: "****1290", balance: 64_200_000, currency: "COP" },
  { id: "b3", bank: "Fiducia Rentable", type: "Fondo de inversión", number: "****0077", balance: 120_000_000, currency: "COP" },
];

export const CASHFLOW = [
  { semana: "Sem 48", ingresos: 42_000_000, egresos: 28_500_000 },
  { semana: "Sem 49", ingresos: 38_500_000, egresos: 61_200_000 },
  { semana: "Sem 50", ingresos: 55_100_000, egresos: 31_000_000 },
  { semana: "Sem 51", ingresos: 47_800_000, egresos: 35_400_000 },
  { semana: "Sem 52", ingresos: 61_300_000, egresos: 72_900_000 },
  { semana: "Sem 1", ingresos: 52_000_000, egresos: 30_200_000 },
];

export const BANK_MOVEMENTS = [
  { id: "mv1", date: day(-1), account: "b1", concept: "Pago comisiones Cóndor Seguros — octubre", amount: 18_420_000 },
  { id: "mv2", date: day(-2), account: "b1", concept: "Nómina quincena 2 — noviembre", amount: -42_600_000 },
  { id: "mv3", date: day(-3), account: "b2", concept: "Pago comisiones Ceiba Aseguradora", amount: 9_870_000 },
  { id: "mv4", date: day(-4), account: "b1", concept: "Arriendo sede Medellín", amount: -8_500_000 },
  { id: "mv5", date: day(-5), account: "b1", concept: "Liquidación afiliados — octubre", amount: -6_240_000 },
  { id: "mv6", date: day(-6), account: "b3", concept: "Rendimientos fondo de inversión", amount: 1_180_000 },
  { id: "mv7", date: day(-8), account: "b1", concept: "Licencias de software", amount: -3_900_000 },
];

export const PAYABLES = [
  { id: "cp1", vendor: "Inmobiliaria Laureles S.A.S.", concept: "Arriendo sede principal — diciembre", category: "Arriendo", amount: 8_500_000, dueDate: day(5), status: "pendiente" },
  { id: "cp2", vendor: "Diego Zapata (afiliado)", concept: "Comisiones noviembre", category: "Comisiones red", amount: 2_840_000, dueDate: day(3), status: "aprobada" },
  { id: "cp3", vendor: "Concesionario Autonorte", concept: "Comisiones noviembre", category: "Comisiones red", amount: 1_965_000, dueDate: day(3), status: "pendiente" },
  { id: "cp4", vendor: "Nube Corporativa S.A.S.", concept: "Servicios en la nube — noviembre", category: "Tecnología", amount: 4_200_000, dueDate: day(9), status: "pendiente" },
  { id: "cp5", vendor: "Papelería Central", concept: "Suministros de oficina", category: "Compras", amount: 680_000, dueDate: day(-2), status: "vencida" },
  { id: "cp6", vendor: "Seguridad Integral Ltda.", concept: "Vigilancia — diciembre", category: "Servicios", amount: 5_600_000, dueDate: day(12), status: "pendiente" },
  { id: "cp7", vendor: "Agencia Creativa Norte", concept: "Campaña redes sociales", category: "Marketing", amount: 12_500_000, dueDate: day(15), status: "pendiente" },
];

export const CHART_OF_ACCOUNTS = [
  { code: "1105", name: "Caja", nature: "Débito", balance: 2_400_000 },
  { code: "1110", name: "Bancos", nature: "Débito", balance: 250_650_000 },
  { code: "1305", name: "Comisiones por cobrar", nature: "Débito", balance: 38_900_000 },
  { code: "2205", name: "Proveedores", nature: "Crédito", balance: 36_285_000 },
  { code: "2408", name: "IVA por pagar", nature: "Crédito", balance: 7_390_000 },
  { code: "4150", name: "Ingresos por comisiones", nature: "Crédito", balance: 412_800_000 },
  { code: "5105", name: "Gastos de personal", nature: "Débito", balance: 254_300_000 },
  { code: "5120", name: "Arrendamientos", nature: "Débito", balance: 93_500_000 },
];

/* ───────── Administrativo ───────── */

export const EMPLOYEES = [
  { id: "e1", name: "Laura Méndez", role: "Administradora de plataforma", area: "Tecnología", hired: "2021-03-01", salary: 6_800_000, contract: "Indefinido", status: "Activo", vacationDays: 9 },
  { id: "e2", name: "Carolina Vélez", role: "Gerente general", area: "Gerencia", hired: "2015-01-15", salary: 14_500_000, contract: "Indefinido", status: "Activo", vacationDays: 15 },
  { id: "e3", name: "Andrés Gómez", role: "Asesor comercial senior", area: "Comercial", hired: "2018-06-01", salary: 4_900_000, contract: "Indefinido", status: "Activo", vacationDays: 6 },
  { id: "e4", name: "Valentina Ríos", role: "Asesora comercial", area: "Comercial", hired: "2022-02-14", salary: 3_600_000, contract: "Indefinido", status: "Vacaciones", vacationDays: 2 },
  { id: "e5", name: "Felipe Cardona", role: "Analista de operaciones", area: "Operaciones", hired: "2020-09-07", salary: 4_200_000, contract: "Indefinido", status: "Activo", vacationDays: 11 },
  { id: "e6", name: "Natalia Ospina", role: "Coordinadora de cartera", area: "Financiero", hired: "2019-04-22", salary: 5_100_000, contract: "Indefinido", status: "Activo", vacationDays: 8 },
  { id: "e7", name: "Sebastián Mora", role: "Supervisor IA y calidad", area: "Tecnología", hired: "2024-08-01", salary: 5_400_000, contract: "Término fijo", status: "Activo", vacationDays: 4 },
  { id: "e8", name: "Julián Restrepo", role: "Auxiliar administrativo", area: "Administración", hired: "2025-01-13", salary: 2_100_000, contract: "Término fijo", status: "Activo", vacationDays: 3 },
];

export const LEAVE_REQUESTS = [
  { id: "lr1", employee: "Andrés Gómez", type: "Vacaciones", from: day(18), to: day(25), days: 6, status: "pendiente" },
  { id: "lr2", employee: "Felipe Cardona", type: "Permiso personal", from: day(4), to: day(4), days: 1, status: "pendiente" },
  { id: "lr3", employee: "Valentina Ríos", type: "Vacaciones", from: day(-6), to: day(6), days: 9, status: "aprobada" },
];

export const PURCHASE_REQUESTS = [
  { id: "oc1", number: "REQ-2026-041", item: "6 portátiles para asesores", area: "Comercial", requester: "Carolina Vélez", amount: 27_600_000, date: day(-3), status: "en_aprobacion", quotes: 3 },
  { id: "oc2", number: "REQ-2026-040", item: "Sillas ergonómicas (4)", area: "Operaciones", requester: "Felipe Cardona", amount: 3_960_000, date: day(-6), status: "aprobada", quotes: 2 },
  { id: "oc3", number: "REQ-2026-039", item: "Material POP feria de seguros", area: "Comercial", requester: "Andrés Gómez", amount: 5_200_000, date: day(-10), status: "orden_emitida", quotes: 3 },
  { id: "oc4", number: "REQ-2026-038", item: "Licencias de firma electrónica", area: "Tecnología", requester: "Laura Méndez", amount: 2_450_000, date: day(-14), status: "recibida", quotes: 2 },
  { id: "oc5", number: "REQ-2026-037", item: "Papelería trimestral", area: "Administración", requester: "Julián Restrepo", amount: 680_000, date: day(-20), status: "recibida", quotes: 1 },
];

export const VENDORS = [
  { id: "v1", name: "TecnoAndina S.A.S.", category: "Tecnología", nit: "900.111.222-1", contact: "ventas@tecnoandina.co", rating: 4.6, docs: "Completa", lastPurchase: day(-14) },
  { id: "v2", name: "Mobiliario Ergonómico Ltda.", category: "Mobiliario", nit: "900.333.444-2", contact: "pedidos@mobiliario.co", rating: 4.2, docs: "Completa", lastPurchase: day(-6) },
  { id: "v3", name: "Papelería Central", category: "Suministros", nit: "800.555.666-3", contact: "pedidos@papeleriacentral.co", rating: 3.8, docs: "RUT vencido", lastPurchase: day(-20) },
  { id: "v4", name: "Agencia Creativa Norte", category: "Marketing", nit: "901.777.888-4", contact: "hola@creativanorte.co", rating: 4.8, docs: "Completa", lastPurchase: day(-10) },
  { id: "v5", name: "Seguridad Integral Ltda.", category: "Servicios", nit: "860.999.000-5", contact: "comercial@segintegral.co", rating: 4.0, docs: "Pendiente certificación", lastPurchase: day(-30) },
];

export const INVENTORY = [
  { id: "i1", sku: "PAP-001", name: "Resma papel carta", category: "Papelería", stock: 18, min: 20, unit: "resma", cost: 18_500 },
  { id: "i2", sku: "PAP-014", name: "Carpetas de presentación", category: "Papelería", stock: 240, min: 100, unit: "und", cost: 2_300 },
  { id: "i3", sku: "POP-003", name: "Pendones institucionales", category: "Material POP", stock: 4, min: 6, unit: "und", cost: 145_000 },
  { id: "i4", sku: "POP-010", name: "Brochure seguros de autos", category: "Material POP", stock: 1_250, min: 500, unit: "und", cost: 950 },
  { id: "i5", sku: "TEC-021", name: "Diademas para call center", category: "Tecnología", stock: 7, min: 5, unit: "und", cost: 189_000 },
  { id: "i6", sku: "CAF-002", name: "Café molido 500 g", category: "Cafetería", stock: 3, min: 8, unit: "paquete", cost: 24_000 },
];

export const ASSETS = [
  { id: "a1", code: "AF-0101", name: "Portátil Lenovo ThinkPad", category: "Cómputo", assignedTo: "Andrés Gómez", cost: 4_600_000, acquired: "2024-02-10", lifeYears: 3 },
  { id: "a2", code: "AF-0102", name: "Portátil Lenovo ThinkPad", category: "Cómputo", assignedTo: "Valentina Ríos", cost: 4_600_000, acquired: "2024-02-10", lifeYears: 3 },
  { id: "a3", code: "AF-0215", name: "Servidor de respaldo", category: "Cómputo", assignedTo: "Sede Medellín", cost: 18_900_000, acquired: "2023-07-01", lifeYears: 5 },
  { id: "a4", code: "AF-0310", name: "Escritorio en L", category: "Mobiliario", assignedTo: "Felipe Cardona", cost: 1_350_000, acquired: "2022-05-20", lifeYears: 10 },
  { id: "a5", code: "AF-0402", name: "Vehículo Renault Kangoo", category: "Vehículos", assignedTo: "Mensajería", cost: 72_000_000, acquired: "2023-01-15", lifeYears: 5 },
  { id: "a6", code: "AF-0501", name: "Proyector Epson", category: "Audiovisual", assignedTo: "Sala de juntas", cost: 2_900_000, acquired: "2025-03-03", lifeYears: 5 },
];

export const OFFICES = [
  { id: "o1", name: "Sede principal Medellín", address: "Cra. 43A #1-50, El Poblado", staff: 18, rooms: ["Sala de juntas", "Sala de capacitación", "Cabina 1"], lease: 8_500_000, leaseEnd: day(240) },
  { id: "o2", name: "Punto de atención Envigado", address: "Cl. 37 Sur #43-12", staff: 4, rooms: ["Sala de reuniones"], lease: 3_200_000, leaseEnd: day(95) },
  { id: "o3", name: "Oficina Bogotá (coworking)", address: "Cl. 93 #11-27", staff: 2, rooms: ["Cabina compartida"], lease: 2_400_000, leaseEnd: day(30) },
];

export const ROOM_BOOKINGS = [
  { id: "rb1", room: "Sala de juntas", office: "o1", date: day(0), from: "09:00", to: "10:30", who: "Carolina Vélez", purpose: "Comité comercial" },
  { id: "rb2", room: "Sala de capacitación", office: "o1", date: day(1), from: "14:00", to: "17:00", who: "Laura Méndez", purpose: "Capacitación GC360" },
  { id: "rb3", room: "Sala de reuniones", office: "o2", date: day(2), from: "10:00", to: "11:00", who: "Andrés Gómez", purpose: "Cita cliente Constructora Altavista" },
];

/* ───────── Academia ───────── */

export interface Lesson {
  id: string;
  title: string;
  duration: number; // segundos
  points: string[];
  captions: string[];
}
export interface Course {
  id: string;
  title: string;
  area: string;
  instructor: string;
  description: string;
  progress: number;
  lessons: Lesson[];
}

const L = (id: string, title: string, duration: number, points: string[], captions: string[]): Lesson => ({ id, title, duration, points, captions });

export const COURSES: Course[] = [
  {
    id: "fundamentos", title: "Fundamentos de intermediación de seguros", area: "Obligatorio", instructor: "Carolina Vélez", progress: 100,
    description: "Rol del intermediario, relación con aseguradoras y obligaciones frente al cliente.",
    lessons: [
      L("f1", "¿Qué hace un bróker de seguros?", 95, ["Asesora al cliente", "Compara varias aseguradoras", "Acompaña durante toda la vigencia"], ["El intermediario representa los intereses del cliente.", "Su valor está en comparar y asesorar con objetividad.", "La aseguradora asume el riesgo; el bróker gestiona la relación."]),
      L("f2", "La comisión de intermediación", 80, ["La paga la aseguradora", "Se causa con la póliza emitida", "Se liquida a la red comercial"], ["La comisión no es un costo adicional para el cliente.", "Se registra cuando la póliza queda emitida y pagada."]),
      L("f3", "Obligaciones con el cliente", 110, ["Información clara", "No ocultar exclusiones", "Protección de datos"], ["Toda propuesta debe mostrar exclusiones y deducibles.", "La decisión final siempre es del cliente."]),
    ],
  },
  {
    id: "autos", title: "Seguro de automóviles: coberturas y deducibles", area: "Producto", instructor: "Andrés Gómez", progress: 65,
    description: "Coberturas principales, deducibles y cómo comparar ofertas de autos.",
    lessons: [
      L("a1", "Coberturas básicas del seguro de autos", 120, ["Responsabilidad civil", "Pérdida total y parcial", "Hurto"], ["La responsabilidad civil cubre daños a terceros.", "La pérdida total aplica cuando la reparación supera el 75% del valor.", "El hurto puede ser total o parcial."]),
      L("a2", "Entender el deducible", 90, ["Porcentaje de la pérdida", "Mínimo en SMMLV", "Valor fijo"], ["El deducible es la parte de la pérdida que asume el asegurado.", "Un deducible más alto suele bajar la prima."]),
      L("a3", "Asistencias y vehículo de reemplazo", 75, ["Grúa y conductor elegido", "Vehículo de reemplazo", "Gastos de transporte"], ["Las asistencias diferencian mucho a las aseguradoras.", "Revisa los días de vehículo de reemplazo."]),
      L("a4", "Cómo presentar un comparativo", 100, ["Prima vs. cobertura", "Exclusiones visibles", "Recomendación justificada"], ["Presenta al menos tres opciones.", "Explica por qué recomiendas una de ellas."]),
    ],
  },
  {
    id: "cumplimiento", title: "Pólizas de cumplimiento para contratistas", area: "Producto", instructor: "Felipe Cardona", progress: 20,
    description: "Amparos de cumplimiento, documentos requeridos y tiempos de expedición.",
    lessons: [
      L("c1", "Amparos de la póliza de cumplimiento", 105, ["Seriedad de la oferta", "Cumplimiento", "Anticipo", "Salarios y prestaciones"], ["Cada amparo cubre una obligación distinta del contrato.", "Los porcentajes los define el contratante."]),
      L("c2", "Documentos para suscripción", 85, ["Estados financieros", "Experiencia del contratista", "Copia del contrato"], ["La aseguradora evalúa la capacidad del contratista.", "Prepara los documentos antes de solicitar la cotización."]),
    ],
  },
  {
    id: "gc360", title: "Atención omnicanal y uso de GC360", area: "Plataforma", instructor: "Laura Méndez", progress: 40,
    description: "Bandeja, casos, cotizaciones y supervisión de la IA en GC360.",
    lessons: [
      L("g1", "La bandeja omnicanal", 70, ["WhatsApp y correo en un solo lugar", "Clasificación automática", "Crear casos"], ["Todos los mensajes llegan a la misma bandeja.", "La IA sugiere el tipo de solicitud y los datos clave."]),
      L("g2", "Gestión de casos", 80, ["Responsable y tiempos", "Actividades obligatorias", "Historial"], ["Cada caso tiene un responsable y un tiempo objetivo.", "El historial registra cada cambio."]),
      L("g3", "Aprobar acciones de la IA", 65, ["Revisar la propuesta", "Editar antes de aprobar", "Rechazar con motivo"], ["Las acciones sensibles requieren aprobación humana."]),
    ],
  },
  {
    id: "cierre", title: "Técnicas de cierre y manejo de objeciones", area: "Comercial", instructor: "Carolina Vélez", progress: 0,
    description: "Cómo responder a las objeciones más comunes y cerrar la venta.",
    lessons: [
      L("t1", "Objeción: «está muy caro»", 90, ["Valor vs. precio", "Ajustar deducible", "Comparar coberturas"], ["Muestra lo que el cliente pierde con una opción más barata.", "Ofrece alternativas de deducible."]),
      L("t2", "Seguimiento efectivo", 75, ["Cuándo volver a contactar", "Canal adecuado", "Próxima acción clara"], ["Cada contacto debe terminar con una próxima acción acordada."]),
    ],
  },
  {
    id: "datos", title: "Protección de datos personales", area: "Cumplimiento", instructor: "Laura Méndez", progress: 0,
    description: "Tratamiento de datos de clientes, autorizaciones y seguridad.",
    lessons: [
      L("d1", "Autorización de tratamiento de datos", 70, ["Consentimiento previo", "Finalidad clara", "Derechos del titular"], ["Solicita la autorización antes de guardar datos sensibles."]),
      L("d2", "Buenas prácticas de seguridad", 60, ["Contraseñas seguras", "No compartir documentos por canales personales", "Reportar incidentes"], ["Los documentos de clientes solo se comparten desde la plataforma."]),
    ],
  },
];
