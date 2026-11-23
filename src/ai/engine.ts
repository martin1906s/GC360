/**
 * Motor de IA simulado y determinista.
 * En producción esta capa se reemplaza por un orquestador LLM (p. ej. Claude) con herramientas
 * autorizadas; aquí se conserva la misma interfaz para que la UI no cambie.
 */
import type { AIClassification, CaseCategory, CasePriority, Database, Insurer, Offer, User } from "@/domain/types";
import { CASE_CATEGORY, CASE_STATUS, PIPELINE } from "@/domain/constants";
import { scopeRows } from "@/services/core";
import { daysUntil, fmtDate, hoursSince, money } from "@/lib/utils";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const CATEGORY_RULES: [CaseCategory, string[]][] = [
  ["siniestro", ["choque", "chocaron", "accidente", "siniestro", "robaron", "hurto", "me pegaron", "inundacion", "incendio", "danos", "colision", "reclamacion"]],
  ["renovacion", ["renovar", "renovacion", "vence", "vencimiento", "se me vence"]],
  ["cartera", ["cuota", "pagar", "pago", "factura", "saldo", "mora", "debo", "financiacion"]],
  ["modificacion", ["endoso", "modificar", "cambiar", "incluir", "excluir", "cambio de placa", "agregar"]],
  ["soporte", ["certificado", "copia", "duplicado", "no me llega", "constancia"]],
  ["cotizacion", ["cotizar", "cotizacion", "asegurar", "seguro para", "precio", "cuanto cuesta", "poliza para", "quiero un seguro", "necesito un seguro"]],
];

const LINE_RULES: [string, string[]][] = [
  ["auto", ["vehiculo", "carro", "moto", "placa", "auto", "camioneta", "mazda", "chevrolet", "renault", "toyota", "kia", "tracker"]],
  ["hogar", ["apartamento", "casa", "hogar", "vivienda", "m2"]],
  ["pyme", ["multirriesgo", "oficina", "bodega", "negocio", "local comercial", "empresa"]],
  ["vida", ["vida", "mayores de 60"]],
  ["salud", ["salud", "medicina prepagada"]],
  ["rc", ["responsabilidad civil", " rc "]],
  ["cumpl", ["cumplimiento", "licitacion", "contrato de obra"]],
];

const BRANDS = ["Mazda", "Chevrolet", "Renault", "Toyota", "Kia", "Nissan", "Hyundai", "Ford", "Volkswagen", "BMW", "Mercedes"];
const CITIES = ["Medellín", "Bogotá", "Cali", "Envigado", "Itagüí", "Rionegro", "Bello", "Barranquilla", "Laureles", "Poblado"];

export function wantsHuman(text: string) {
  return /asesor|humano|persona real|hablar con alguien|agente real|una persona/.test(norm(text));
}

export function classify(text: string, linePrefix = "ln_"): AIClassification {
  const t = norm(text);
  let best: CaseCategory = "consulta";
  let hits = 0;
  for (const [cat, kws] of CATEGORY_RULES) {
    const h = kws.filter((k) => t.includes(k)).length;
    if (h > hits) {
      hits = h;
      best = cat;
    }
  }
  let lineKey: string | undefined;
  let lineHits = 0;
  for (const [k, kws] of LINE_RULES) {
    const h = kws.filter((w) => t.includes(w)).length;
    if (h > lineHits) {
      lineHits = h;
      lineKey = k;
    }
  }

  const extracted: Record<string, string> = {};
  const placa = text.match(/\b([A-Za-z]{3})[\s-]?(\d{3})\b/);
  if (placa) extracted["Placa"] = `${placa[1].toUpperCase()}-${placa[2]}`;
  const year = text.match(/\b(19[89]\d|20[0-3]\d)\b/);
  if (year) extracted["Modelo (año)"] = year[1];
  const brand = BRANDS.find((b) => t.includes(norm(b)));
  if (brand) {
    const model = text.match(new RegExp(`${brand}\\s+([A-Za-z0-9-]+)`, "i"));
    extracted["Vehículo"] = model ? `${brand} ${model[1]}` : brand;
  }
  const city = CITIES.find((c) => t.includes(norm(c)));
  if (city) extracted["Ciudad / zona"] = city;
  const m2 = text.match(/(\d{2,4})\s?m2/i);
  if (m2) extracted["Área"] = `${m2[1]} m²`;
  const value = text.match(/\$\s?([\d.]+)\s?(millones)?/i);
  if (value) extracted["Valor mencionado"] = value[0];
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (email) extracted["Correo"] = email[0];
  if (/trabajo|particular/.test(t) && lineKey === "auto") extracted["Uso"] = "Particular";
  if (/sin heridos|no hay heridos/.test(t)) extracted["Lesionados"] = "No";

  const human = wantsHuman(text);
  const priority: CasePriority =
    best === "siniestro" ? "critica" : human ? "alta" : best === "renovacion" || best === "modificacion" ? "alta" : best === "cotizacion" ? "media" : "baja";
  const confidence = Math.min(0.98, 0.62 + hits * 0.12 + lineHits * 0.06 + Object.keys(extracted).length * 0.02);
  const lineName = lineKey ? LINE_LABEL[lineKey] : undefined;

  return {
    category: best,
    confidence: Number(confidence.toFixed(2)),
    lineId: lineKey ? `${linePrefix}${lineKey}` : undefined,
    priority,
    extracted,
    wantsHuman: human,
    summary: `${CASE_CATEGORY[best].label}${lineName ? ` · ${lineName}` : ""}. ${
      Object.keys(extracted).length ? `Datos detectados: ${Object.entries(extracted).map(([k, v]) => `${k} ${v}`).join(", ")}.` : "No se detectaron datos estructurados."
    }${human ? " El cliente solicita atención humana." : ""}`,
  };
}

const LINE_LABEL: Record<string, string> = {
  auto: "Automóviles", hogar: "Hogar", pyme: "Multirriesgo empresarial", vida: "Vida", salud: "Salud", rc: "Responsabilidad civil", cumpl: "Cumplimiento",
};

export function suggestReply(category: CaseCategory, name: string, caseCode?: string, lineName?: string): string {
  const first = name.split(" ")[0];
  const ref = caseCode ? ` Tu número de caso es ${caseCode}.` : "";
  switch (category) {
    case "cotizacion":
      return lineName === "Automóviles"
        ? `¡Hola ${first}! Gracias por escribir a Gran Seguros. Para cotizar tu vehículo con varias aseguradoras necesito: 1) foto de la tarjeta de propiedad y 2) cédula del conductor principal.${ref} Te enviaremos un comparativo con las mejores opciones.`
        : `¡Hola ${first}! Con gusto te ayudamos con tu seguro${lineName ? ` de ${lineName.toLowerCase()}` : ""}.${ref} Un asesor revisará tu solicitud y te pedirá la información necesaria para cotizar con varias aseguradoras.`;
    case "siniestro":
      return `Lamentamos lo ocurrido, ${first}. ¿Hay personas lesionadas? Por favor envíanos fotos de los daños, el informe de tránsito (si aplica) y los datos del tercero.${ref} Un analista de operaciones te acompañará en todo el proceso.`;
    case "renovacion":
      return `Hola ${first}, ya estamos preparando las opciones de renovación de tu póliza.${ref} ¿Hubo algún cambio en el bien asegurado o en tus datos de contacto?`;
    case "cartera":
      return `Hola ${first}, revisamos el estado de tu póliza y te compartimos el detalle de cuotas en breve.${ref} Recuerda que los pagos se realizan directamente a la aseguradora o por los medios autorizados.`;
    case "modificacion":
      return `Hola ${first}, recibimos tu solicitud de modificación.${ref} La tramitaremos con la aseguradora; cualquier cambio contractual requiere confirmación antes de aplicarse.`;
    case "soporte":
      return `Hola ${first}, con gusto. Estamos generando el documento solicitado y te lo enviaremos por este medio.${ref}`;
    default:
      return `Hola ${first}, gracias por contactarnos.${ref} ¿Podrías contarnos un poco más para dirigir tu solicitud al área correcta?`;
  }
}

/* ───────── Resumen de ofertas (GC-RF-35) ───────── */

export function summarizeOffers(offers: Offer[], insurers: Insurer[]) {
  if (offers.length === 0) return { text: "No hay ofertas registradas para resumir.", bullets: [] as string[], recommendedId: undefined as string | undefined, pending: [] as string[] };
  const name = (o: Offer) => insurers.find((i) => i.id === o.insurerId)?.short ?? "—";
  const cheapest = [...offers].sort((a, b) => a.premium - b.premium)[0];
  const covCount = (o: Offer) => o.coverages.filter((c) => c.included).length;
  const broadest = [...offers].sort((a, b) => covCount(b) - covCount(a) || a.premium - b.premium)[0];
  const scored = offers.map((o) => ({ o, score: covCount(o) / o.coverages.length * 0.6 + (cheapest.premium / o.premium) * 0.3 + (o.exclusions.length <= 1 ? 0.1 : 0) }));
  const rec = scored.sort((a, b) => b.score - a.score)[0].o;
  const spread = Math.max(...offers.map((o) => o.premium)) - cheapest.premium;

  const bullets = [
    `Prima más baja: ${name(cheapest)} con ${money(cheapest.premium)} (diferencia máxima entre ofertas: ${money(spread)}).`,
    `Cobertura más amplia: ${name(broadest)} con ${covCount(broadest)} de ${broadest.coverages.length} coberturas incluidas.`,
    ...offers
      .filter((o) => o.coverages.some((c) => !c.included))
      .map((o) => `${name(o)} no incluye: ${o.coverages.filter((c) => !c.included).map((c) => c.name.toLowerCase()).join(", ")}.`),
    ...offers.map((o) => `Deducible ${name(o)}: ${o.deductible}.`),
  ];
  const pending = [
    ...offers.filter((o) => o.validityDays < 20).map((o) => `La oferta de ${name(o)} vence en ${o.validityDays} días.`),
    ...offers.filter((o) => /inspecci/i.test(o.notes)).map((o) => `${name(o)} requiere inspección previa del riesgo.`),
  ];
  return {
    text: `Analicé ${offers.length} ofertas registradas. La opción con mejor balance precio/cobertura es ${name(rec)} — ${rec.productName}. Las exclusiones se muestran completas en el comparador.`,
    bullets,
    recommendedId: rec.id,
    pending,
  };
}

/* ───────── Consultas en lenguaje natural (GC-RF-36) ───────── */

export interface AIAnswer {
  text: string;
  table?: { columns: string[]; rows: (string | number)[][] };
  links?: { label: string; href: string }[];
  sources: string[];
}

export const EXAMPLE_QUERIES = [
  "¿Cuáles son las pólizas por vencer?",
  "Casos pendientes más de 48 horas",
  "Resumen de comisiones",
  "Cuotas vencidas en cartera",
  "Estado del pipeline comercial",
  "Siniestros abiertos",
  "Carga de casos por asesor",
];

export function answerQuery(q: string, user: User, data: Database): AIAnswer {
  const t = norm(q);
  const S = <K extends keyof Omit<Database, "tenants">>(k: K) => scopeRows(k, data[k] as never, user, data) as Database[K];
  const clients = S("clients");
  const users = data.users.filter((u) => u.tenantId === user.tenantId);
  const cname = (id: string) => clients.find((c) => c.id === id)?.name ?? data.clients.find((c) => c.id === id && c.tenantId === user.tenantId)?.name ?? "—";
  const uname = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const iname = (id: string) => data.insurers.find((i) => i.id === id)?.short ?? "—";
  const scopeNote = user.role === "afiliado" ? " (filtrado a tu cartera de afiliado)" : "";

  // Caso específico
  const caseCode = q.match(/CAS-\d{4}-\d{4}/i)?.[0]?.toUpperCase();
  if (caseCode) {
    const c = S("cases").find((x) => x.code === caseCode);
    if (!c) return { text: `No encontré el caso ${caseCode} dentro de los datos que tienes autorizados.`, sources: ["Casos (filtrados por tenant y permisos)"] };
    const offers = S("offers").filter((o) => o.caseId === c.id);
    return {
      text: `${c.code} — ${c.title}. Estado: ${CASE_STATUS[c.status].label}, prioridad ${c.priority}, responsable ${uname(c.assigneeId)}. Cliente: ${cname(c.clientId)}. ${offers.length ? `Tiene ${offers.length} ofertas registradas; la más económica es ${iname([...offers].sort((a, b) => a.premium - b.premium)[0].insurerId)}.` : "Aún no tiene ofertas registradas."}`,
      links: [{ label: `Abrir ${c.code}`, href: `/casos/${c.id}` }],
      sources: [`Caso ${c.code}`, "Ofertas registradas"],
    };
  }

  if (/vencer|vencimiento|renovac/.test(t)) {
    const rows = S("policies")
      .filter((p) => daysUntil(p.endDate) <= 45 && daysUntil(p.endDate) >= 0)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
    return {
      text: rows.length
        ? `Hay ${rows.length} pólizas que vencen en los próximos 45 días${scopeNote}. Recomiendo iniciar renovación en las que tienen menos de 15 días.`
        : `No hay pólizas por vencer en los próximos 45 días${scopeNote}.`,
      table: { columns: ["Póliza", "Cliente", "Aseguradora", "Vence", "Días"], rows: rows.map((p) => [p.number, cname(p.clientId), iname(p.insurerId), fmtDate(p.endDate), daysUntil(p.endDate)]) },
      links: [{ label: "Ir a renovaciones", href: "/renovaciones" }],
      sources: ["Pólizas", "Calendario de vencimientos"],
    };
  }

  if (/48|pendiente|atrasad|sla|demorad|sin respuesta/.test(t)) {
    const rows = S("cases")
      .filter((c) => !["resuelto", "cerrado"].includes(c.status) && hoursSince(c.updatedAt) > 48)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    return {
      text: rows.length
        ? `Encontré ${rows.length} casos sin actualización hace más de 48 horas${scopeNote}. Acciones sugeridas: reasignar los críticos, enviar seguimiento a clientes en espera y escalar SLA vencidos a gerencia.`
        : "No hay casos pendientes por más de 48 horas. ¡Buen trabajo del equipo!",
      table: { columns: ["Caso", "Cliente", "Estado", "Responsable", "Horas sin gestión"], rows: rows.map((c) => [c.code, cname(c.clientId), CASE_STATUS[c.status].label, uname(c.assigneeId), hoursSince(c.updatedAt)]) },
      links: rows.slice(0, 3).map((c) => ({ label: c.code, href: `/casos/${c.id}` })),
      sources: ["Casos", "Línea de tiempo de casos"],
    };
  }

  if (/comisi/.test(t)) {
    const rows = S("commissions");
    const total = rows.reduce((s, c) => s + c.amount, 0);
    const byIns = Object.entries(rows.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.insurerId]: (acc[c.insurerId] ?? 0) + c.amount }), {}));
    return {
      text: `Comisiones de intermediación registradas${scopeNote}: ${money(total)} en ${rows.length} pólizas. Por liquidar: ${money(rows.filter((c) => c.status !== "liquidada").reduce((s, c) => s + c.amount, 0))}.`,
      table: { columns: ["Aseguradora", "Comisión"], rows: byIns.map(([id, v]) => [iname(id), money(v)]) },
      links: [{ label: "Ver cartera y comisiones", href: "/financiero" }],
      sources: ["Comisiones", "Pólizas"],
    };
  }

  if (/cartera|cuota|mora|saldo|pago/.test(t)) {
    const pols = S("policies");
    const rows = S("installments").filter((i) => !i.paid && new Date(i.dueDate) < new Date());
    return {
      text: rows.length ? `Hay ${rows.length} cuotas vencidas sin pago registrado por ${money(rows.reduce((s, i) => s + i.amount, 0))}. Sugiero activar el recordatorio de cuota (requiere aprobación).` : "No hay cuotas vencidas.",
      table: { columns: ["Póliza", "Cliente", "Cuota", "Venció", "Valor"], rows: rows.map((i) => { const p = pols.find((x) => x.id === i.policyId); return [p?.number ?? "—", p ? cname(p.clientId) : "—", i.number, fmtDate(i.dueDate), money(i.amount)]; }) },
      sources: ["Cuotas", "Pólizas"],
    };
  }

  if (/siniestro|reclamac/.test(t)) {
    const rows = S("claims").filter((c) => c.status !== "pagado");
    return {
      text: `${rows.length} siniestro(s) abierto(s).`,
      table: { columns: ["Caso", "Cliente", "Estado", "Valor reclamado"], rows: rows.map((c) => [data.cases.find((k) => k.id === c.caseId)?.code ?? "—", cname(c.clientId), c.status, money(c.amountClaimed)]) },
      links: rows.map((c) => ({ label: "Abrir caso", href: `/casos/${c.caseId}` })),
      sources: ["Siniestros"],
    };
  }

  if (/pipeline|oportunidad|embudo|ventas|venta/.test(t)) {
    const ops = S("opportunities");
    const rows = PIPELINE.map((s) => { const xs = ops.filter((o) => o.stage === s.key); return [s.label, xs.length, money(xs.reduce((a, o) => a + o.value, 0))]; });
    const weighted = ops.reduce((a, o) => a + o.value * (PIPELINE.find((s) => s.key === o.stage)?.probability ?? 0), 0);
    return {
      text: `El pipeline tiene ${ops.filter((o) => !["ganado", "perdido"].includes(o.stage)).length} oportunidades activas. Valor ponderado por probabilidad: ${money(weighted)}.`,
      table: { columns: ["Etapa", "Oportunidades", "Prima estimada"], rows },
      links: [{ label: "Abrir pipeline", href: "/comercial/pipeline" }],
      sources: ["Oportunidades"],
    };
  }

  if (/asesor|productividad|carga|equipo/.test(t)) {
    const open = S("cases").filter((c) => !["resuelto", "cerrado"].includes(c.status));
    const by = users.filter((u) => ["asesor", "operaciones", "financiero"].includes(u.role)).map((u) => [u.name, open.filter((c) => c.assigneeId === u.id).length, open.filter((c) => c.assigneeId === u.id && new Date(c.dueAt) < new Date()).length]);
    return { text: "Distribución de casos abiertos por responsable:", table: { columns: ["Responsable", "Abiertos", "SLA vencido"], rows: by }, sources: ["Casos", "Usuarios"] };
  }

  const client = clients.find((c) => t.includes(norm(c.name.split(" ")[0])) && t.includes(norm(c.name.split(" ")[1] ?? "")));
  if (client) {
    const pols = S("policies").filter((p) => p.clientId === client.id);
    const cs = S("cases").filter((c) => c.clientId === client.id);
    return {
      text: `${client.name}: ${client.status}, ${pols.length} póliza(s) y ${cs.length} caso(s). ${pols.map((p) => `${p.number} vence ${fmtDate(p.endDate)}`).join("; ")}`,
      links: [{ label: "Ficha 360°", href: `/crm/clientes/${client.id}` }],
      sources: ["Clientes", "Pólizas", "Casos"],
    };
  }

  return {
    text: "Puedo consultar casos, pólizas, renovaciones, cartera, comisiones, siniestros y el pipeline — siempre filtrado por tu empresa y permisos. Prueba alguna de estas preguntas:",
    links: EXAMPLE_QUERIES.slice(0, 4).map((x) => ({ label: x, href: `?q=${encodeURIComponent(x)}` })),
    sources: [],
  };
}
