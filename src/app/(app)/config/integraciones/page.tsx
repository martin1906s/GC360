"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, CheckCircle2, Copy, CreditCard, KeyRound, Landmark, Loader2, Mail, MessageCircle, Plug, Receipt, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useScoped } from "@/hooks/use-data";
import { useDemoState } from "@/hooks/use-demo-state";
import { Guard } from "@/components/layout/guard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/modal";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { InsurerChip } from "@/components/domain/chips";
import { cn, fromNow, sleep } from "@/lib/utils";

type Key = "m365" | "gmail" | "whatsapp" | "insurers" | "einvoice" | "payments";
interface IntegrationState { connected: boolean; connectedAt?: string; account?: string; processed?: number }

const CATALOG: { key: Key; name: string; vendor: string; icon: React.ElementType; color: string; description: string; metric: string }[] = [
  { key: "m365", name: "Microsoft 365 / Outlook", vendor: "Microsoft Graph", icon: Mail, color: "#0a66c2", description: "Recibe y envía correos corporativos desde la bandeja. Cada correo puede convertirse en caso.", metric: "correos sincronizados" },
  { key: "gmail", name: "Gmail / Google Workspace", vendor: "Gmail API", icon: Mail, color: "#c5221f", description: "Conecta buzones de Google Workspace a la bandeja omnicanal.", metric: "correos sincronizados" },
  { key: "whatsapp", name: "WhatsApp Business", vendor: "Meta Cloud API", icon: MessageCircle, color: "#128c4a", description: "Atiende clientes por WhatsApp con el asistente virtual y asesores.", metric: "mensajes procesados" },
  { key: "insurers", name: "Aseguradoras", vendor: "API / portal / correo", icon: ShieldCheck, color: "#2f5079", description: "Solicita cotizaciones y emisiones directamente a cada aseguradora.", metric: "cotizaciones enviadas" },
  { key: "einvoice", name: "Facturación electrónica", vendor: "Proveedor tecnológico DIAN", icon: Receipt, color: "#5b4b8a", description: "Emite las facturas de comisión y las valida ante la DIAN.", metric: "facturas emitidas" },
  { key: "payments", name: "Pagos en línea (PSE)", vendor: "Pasarela de pagos", icon: CreditCard, color: "#8a5a3c", description: "Permite a los clientes pagar cuotas desde el portal.", metric: "pagos recibidos" },
];

export default function IntegrationsPage() {
  return <Guard perm="config.edit"><Integrations /></Guard>;
}

function Integrations() {
  const [state, setState] = useDemoState<Record<string, IntegrationState>>("integrations-v1", {});
  const [open, setOpen] = useState<Key | null>(null);
  const connect = (k: Key, account: string) => setState((s) => ({ ...s, [k]: { connected: true, connectedAt: new Date().toISOString(), account, processed: Math.floor(Math.random() * 400 + 120) } }));
  const disconnect = (k: Key) => { setState((s) => ({ ...s, [k]: { connected: false } })); toast("Integración desconectada"); };
  const item = CATALOG.find((c) => c.key === open);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Integraciones" description="Conecta los canales de comunicación, aseguradoras y servicios financieros con GC360." />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {CATALOG.map((c) => {
          const st = state[c.key];
          return (
            <Card key={c.key} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-md text-white" style={{ background: c.color }}><c.icon className="size-5" /></span>
                  <div><p className="font-semibold">{c.name}</p><p className="text-xs text-fg-muted">{c.vendor}</p></div>
                </div>
                {st?.connected ? <Badge tone="green" dot>Conectado</Badge> : <Badge dot>Sin conectar</Badge>}
              </div>
              <p className="mt-3 flex-1 text-[13px] text-fg-muted">{c.description}</p>
              {st?.connected && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
                  <div><p className="text-fg-muted">Cuenta</p><p className="truncate font-medium">{st.account}</p></div>
                  <div><p className="text-fg-muted">Última sincronización</p><p className="font-medium">{fromNow(st.connectedAt!)}</p></div>
                  <div className="col-span-2"><p className="text-fg-muted">Actividad</p><p className="font-medium">{st.processed} {c.metric}</p></div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant={st?.connected ? "secondary" : "primary"} onClick={() => setOpen(c.key)}>{st?.connected ? "Configuración" : <><Plug /> Conectar</>}</Button>
                {st?.connected && <Button size="sm" variant="ghost" onClick={() => disconnect(c.key)}><Unplug /> Desconectar</Button>}
              </div>
            </Card>
          );
        })}
      </div>

      {item && (
        <Sheet open onClose={() => setOpen(null)} width="max-w-2xl" title={item.name} description={`Configuración de la conexión con ${item.vendor}`}>
          {open === "m365" && <OAuthWizard provider="Microsoft" scopes={["Leer y enviar correo (Mail.ReadWrite, Mail.Send)", "Leer el calendario (Calendars.Read)", "Ver el perfil básico (User.Read)"]} mailboxes={["servicio@granseguros.co", "comercial@granseguros.co", "siniestros@granseguros.co"]} state={state.m365} onConnect={(a) => connect("m365", a)} />}
          {open === "gmail" && <OAuthWizard provider="Google" scopes={["Leer y enviar correo (gmail.modify)", "Gestionar etiquetas (gmail.labels)", "Ver el perfil básico"]} mailboxes={["atencion@granseguros.co", "cotizaciones@granseguros.co"]} state={state.gmail} onConnect={(a) => connect("gmail", a)} />}
          {open === "whatsapp" && <WhatsAppWizard state={state.whatsapp} onConnect={(a) => connect("whatsapp", a)} />}
          {open === "insurers" && <InsurersConfig onConnect={() => connect("insurers", "4 aseguradoras")} />}
          {open === "einvoice" && <EInvoiceWizard state={state.einvoice} onConnect={(a) => connect("einvoice", a)} />}
          {open === "payments" && <PaymentsWizard state={state.payments} onConnect={(a) => connect("payments", a)} />}
        </Sheet>
      )}
    </div>
  );
}

/* ───────── Componentes de apoyo ───────── */

function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {steps.map((s, i) => (
        <li key={s} className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium", i < current ? "bg-emerald-50 text-emerald-700" : i === current ? "bg-brand-600 text-white" : "bg-slate-100 text-fg-muted")}>
          <span className="grid size-4 place-items-center">{i < current ? <Check className="size-3.5" /> : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <div className="flex gap-2"><Input readOnly value={value} className="font-mono text-xs" /><Button variant="secondary" size="icon" onClick={() => { navigator.clipboard?.writeText(value); toast("Copiado"); }}><Copy /></Button></div>
    </Field>
  );
}

function TestRun({ checks, onDone, label = "Probar conexión y activar" }: { checks: string[]; onDone: () => void; label?: string }) {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    setLog([]);
    for (const c of checks) { await sleep(550); setLog((l) => [...l, c]); }
    setRunning(false);
    onDone();
    toast.success("Integración activa");
  };
  return (
    <div className="space-y-3">
      <Button onClick={run} loading={running}><RefreshCw /> {label}</Button>
      {log.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border bg-slate-50 p-3 text-[13px]">
          {log.map((l) => <li key={l} className="flex items-center gap-2 animate-fade-in"><CheckCircle2 className="size-4 text-emerald-600" />{l}</li>)}
          {running && <li className="flex items-center gap-2 text-fg-muted"><Loader2 className="size-4 animate-spin" /> Verificando…</li>}
        </ul>
      )}
    </div>
  );
}

function ConnectedSummary({ state, children }: { state: IntegrationState; children?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="size-6 text-emerald-600" />
        <div><p className="font-medium text-emerald-900">Conectado a {state.account}</p><p className="text-xs text-emerald-800">Desde {fromNow(state.connectedAt!)} · {state.processed} registros procesados</p></div>
      </div>
      {children}
    </div>
  );
}

/* ───────── Correo (Microsoft / Google) ───────── */

function OAuthWizard({ provider, scopes, mailboxes, state, onConnect }: { provider: string; scopes: string[]; mailboxes: string[]; state?: IntegrationState; onConnect: (account: string) => void }) {
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [selected, setSelected] = useState<string[]>(mailboxes.slice(0, 2));
  const [rules, setRules] = useState({ autoCase: true, classify: true, signature: true });
  const [interval, setIntervalMin] = useState("1");
  const account = `admin@granseguros.co`;

  if (state?.connected) {
    return (
      <ConnectedSummary state={state}>
        <p className="text-sm font-medium">Buzones conectados</p>
        <ul className="divide-y rounded-lg border">{mailboxes.map((m) => <li key={m} className="flex items-center justify-between px-4 py-2.5 text-[13px]">{m}<Badge tone="green">Sincronizando</Badge></li>)}</ul>
      </ConnectedSummary>
    );
  }

  return (
    <div>
      <Steps steps={["Autorizar cuenta", "Buzones", "Reglas", "Prueba"]} current={step} />
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">Un administrador de {provider} autoriza a GC360 a leer y enviar correo en nombre de la empresa. La autorización se puede revocar en cualquier momento.</p>
          {!consent ? (
            <Button onClick={async () => { setAuthorizing(true); await sleep(900); setAuthorizing(false); setConsent(true); }} loading={authorizing} variant="secondary" className="w-full justify-center"><KeyRound /> Iniciar sesión con {provider}</Button>
          ) : (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">GC360 solicita los siguientes permisos</p>
              <p className="text-xs text-fg-muted">Cuenta: {account}</p>
              <ul className="mt-3 space-y-2">{scopes.map((s) => <li key={s} className="flex items-center gap-2 text-[13px]"><ShieldCheck className="size-4 text-brand-600" />{s}</li>)}</ul>
              <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setConsent(false)}>Cancelar</Button><Button onClick={() => setStep(1)}>Aceptar</Button></div>
            </div>
          )}
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">Elige qué buzones llegan a la bandeja omnicanal.</p>
          <ul className="divide-y rounded-lg border">
            {mailboxes.map((m) => (
              <li key={m} className="flex items-center gap-3 px-4 py-2.5">
                <input type="checkbox" checked={selected.includes(m)} onChange={(e) => setSelected(e.target.checked ? [...selected, m] : selected.filter((x) => x !== m))} className="accent-brand-600" />
                <span className="flex-1 text-[13px]">{m}</span>
                <Badge>{m.startsWith("siniestros") ? "Operaciones" : "Comercial"}</Badge>
              </li>
            ))}
          </ul>
          <div className="flex justify-end"><Button disabled={!selected.length} onClick={() => setStep(2)}>Continuar</Button></div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          {([["autoCase", "Proponer un caso por cada correo nuevo"], ["classify", "Clasificar los correos con IA"], ["signature", "Agregar la firma corporativa a las respuestas"]] as const).map(([k, l]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border px-4 py-3"><span className="text-sm">{l}</span><Switch checked={rules[k]} onChange={(v) => setRules({ ...rules, [k]: v })} /></div>
          ))}
          <Field label="Frecuencia de sincronización"><Select value={interval} onChange={(e) => setIntervalMin(e.target.value)}><option value="1">En tiempo real (notificaciones)</option><option value="5">Cada 5 minutos</option><option value="15">Cada 15 minutos</option></Select></Field>
          <div className="flex justify-end"><Button onClick={() => setStep(3)}>Continuar</Button></div>
        </div>
      )}
      {step === 3 && <TestRun checks={["Token de acceso válido", `${selected.length} buzón(es) accesibles`, "Correo de prueba recibido", "Correo de prueba enviado", "Suscripción a notificaciones activa"]} onDone={() => onConnect(selected[0])} />}
    </div>
  );
}

/* ───────── WhatsApp ───────── */

function WhatsAppWizard({ state, onConnect }: { state?: IntegrationState; onConnect: (account: string) => void }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ waba: "104857392018273", phoneId: "112233445566778", phone: "+57 300 000 0001", token: "" });
  const [templates, setTemplates] = useState([
    { name: "bienvenida_cotizacion", category: "Utilidad", status: "Aprobada" },
    { name: "aviso_renovacion", category: "Utilidad", status: "Aprobada" },
    { name: "recordatorio_cuota", category: "Utilidad", status: "En revisión" },
    { name: "recepcion_siniestro", category: "Utilidad", status: "Borrador" },
  ]);
  if (state?.connected) {
    return (
      <ConnectedSummary state={state}>
        <p className="text-sm font-medium">Plantillas</p>
        <ul className="divide-y rounded-lg border">{templates.map((t) => <li key={t.name} className="flex items-center justify-between px-4 py-2.5 font-mono text-xs">{t.name}<Badge tone={t.status === "Aprobada" ? "green" : "amber"}>{t.status}</Badge></li>)}</ul>
      </ConnectedSummary>
    );
  }
  return (
    <div>
      <Steps steps={["Cuenta de Meta", "Webhook", "Plantillas", "Prueba"]} current={step} />
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">Datos de la cuenta de WhatsApp Business registrada en Meta Business Manager.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID de la cuenta (WABA)"><Input value={f.waba} onChange={(e) => setF({ ...f, waba: e.target.value })} /></Field>
            <Field label="ID del número de teléfono"><Input value={f.phoneId} onChange={(e) => setF({ ...f, phoneId: e.target.value })} /></Field>
            <Field label="Número visible para clientes"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Token de acceso permanente"><Input type="password" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} placeholder="EAAG…" /></Field>
          </div>
          <div className="flex justify-end"><Button disabled={!f.token} onClick={() => setStep(1)}>Continuar</Button></div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">Copia estos datos en la configuración del webhook de la app de Meta para recibir los mensajes en tiempo real.</p>
          <CopyField label="URL del webhook" value="https://api.gc360.co/webhooks/whatsapp/t_gran" />
          <CopyField label="Token de verificación" value="gc360-verify-8f2a91" />
          <p className="text-xs text-fg-muted">Eventos a suscribir: <span className="font-mono">messages</span>, <span className="font-mono">message_status</span>.</p>
          <div className="flex justify-end"><Button onClick={() => setStep(2)}>Ya lo configuré</Button></div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">Los mensajes que inicia la empresa (avisos, recordatorios) requieren plantillas aprobadas por Meta.</p>
          <ul className="divide-y rounded-lg border">
            {templates.map((t) => (
              <li key={t.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 font-mono text-xs">{t.name}</span><span className="text-xs text-fg-muted">{t.category}</span>
                <Badge tone={t.status === "Aprobada" ? "green" : t.status === "En revisión" ? "amber" : "slate"}>{t.status}</Badge>
                {t.status === "Borrador" && <Button size="xs" variant="ghost" onClick={() => { setTemplates((xs) => xs.map((x) => (x.name === t.name ? { ...x, status: "En revisión" } : x))); toast("Plantilla enviada a revisión de Meta"); }}>Enviar a revisión</Button>}
              </li>
            ))}
          </ul>
          <div className="flex justify-end"><Button onClick={() => setStep(3)}>Continuar</Button></div>
        </div>
      )}
      {step === 3 && <TestRun checks={["Token válido para la cuenta " + f.waba, "Webhook verificado", "Mensaje de prueba enviado a " + f.phone, "Confirmación de entrega recibida"]} onDone={() => onConnect(f.phone)} />}
    </div>
  );
}

/* ───────── Aseguradoras ───────── */

function InsurersConfig({ onConnect }: { onConnect: () => void }) {
  const insurers = useScoped("insurers").filter((i) => i.active);
  const [cfg, setCfg] = useDemoState<Record<string, { method: string; env: string; ok: boolean }>>("insurer-cfg-v1", {});
  const [editing, setEditing] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [f, setF] = useState({ method: "API REST", env: "Pruebas", endpoint: "", clientId: "", secret: "" });
  const save = async (id: string) => {
    setTesting(true);
    await sleep(1300);
    setCfg((c) => ({ ...c, [id]: { method: f.method, env: f.env, ok: true } }));
    setTesting(false);
    setEditing(null);
    toast.success("Conexión verificada", { description: "Cotización de prueba recibida correctamente" });
    onConnect();
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">Cada aseguradora se conecta según lo que ofrezca: API (cotización y emisión automática), portal web o correo electrónico.</p>
      <ul className="divide-y rounded-lg border">
        {insurers.map((i) => {
          const c = cfg[i.id];
          return (
            <li key={i.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <InsurerChip id={i.id} />
                <span className="flex-1 text-xs text-fg-muted">{c ? `${c.method} · ${c.env}` : "Sin configurar (cotización manual)"}</span>
                {c?.ok ? <Badge tone="green" dot>Conectada</Badge> : <Badge dot>Manual</Badge>}
                <Button size="xs" variant="secondary" onClick={() => { setEditing(editing === i.id ? null : i.id); setF({ method: "API REST", env: "Pruebas", endpoint: `https://api.${i.short.toLowerCase()}.com.co/intermediarios/v2`, clientId: "", secret: "" }); }}>Configurar</Button>
              </div>
              {editing === i.id && (
                <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                  <Field label="Método de conexión"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option>API REST</option><option>Portal web (robot)</option><option>Correo electrónico</option></Select></Field>
                  <Field label="Ambiente"><Select value={f.env} onChange={(e) => setF({ ...f, env: e.target.value })}><option>Pruebas</option><option>Producción</option></Select></Field>
                  {f.method === "Correo electrónico" ? (
                    <Field label="Correo de cotizaciones" className="sm:col-span-2"><Input defaultValue={i.contactEmail} /></Field>
                  ) : (
                    <>
                      <Field label="URL del servicio" className="sm:col-span-2"><Input value={f.endpoint} onChange={(e) => setF({ ...f, endpoint: e.target.value })} className="font-mono text-xs" /></Field>
                      <Field label="Usuario / Client ID"><Input value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} /></Field>
                      <Field label="Clave / Client secret"><Input type="password" value={f.secret} onChange={(e) => setF({ ...f, secret: e.target.value })} /></Field>
                    </>
                  )}
                  <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button loading={testing} onClick={() => save(i.id)}><RefreshCw /> Guardar y probar</Button></div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────── Facturación electrónica ───────── */

function EInvoiceWizard({ state, onConnect }: { state?: IntegrationState; onConnect: (account: string) => void }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ provider: "Proveedor tecnológico autorizado", prefix: "FE", from: "1001", to: "5000", resolution: "18764000001234" });
  const [cert, setCert] = useState(false);
  if (state?.connected) return <ConnectedSummary state={state}><p className="text-sm text-fg-muted">Resolución {f.resolution} · prefijo {f.prefix} · rango {f.from}–{f.to}</p></ConnectedSummary>;
  return (
    <div>
      <Steps steps={["Proveedor", "Resolución DIAN", "Certificado", "Set de pruebas"]} current={step} />
      {step === 0 && <div className="space-y-4"><Field label="Proveedor tecnológico"><Select value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })}><option>Proveedor tecnológico autorizado</option><option>Facturación propia (software propio)</option></Select></Field><Field label="Usuario de la API"><Input defaultValue="granseguros-api" /></Field><div className="flex justify-end"><Button onClick={() => setStep(1)}>Continuar</Button></div></div>}
      {step === 1 && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Número de resolución"><Input value={f.resolution} onChange={(e) => setF({ ...f, resolution: e.target.value })} /></Field><Field label="Prefijo"><Input value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })} /></Field><Field label="Desde"><Input value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field><Field label="Hasta"><Input value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field></div><div className="flex justify-end"><Button onClick={() => setStep(2)}>Continuar</Button></div></div>}
      {step === 2 && <div className="space-y-4"><p className="text-sm text-fg-muted">Carga el certificado de firma digital de la empresa (.p12).</p><button onClick={() => { setCert(true); toast.success("Certificado cargado"); }} className={cn("flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm", cert ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "text-fg-muted hover:bg-slate-50")}>{cert ? <><CheckCircle2 className="size-4" /> certificado_granseguros.p12 · vence dic 2027</> : <><Landmark className="size-4" /> Seleccionar certificado</>}</button><div className="flex justify-end"><Button disabled={!cert} onClick={() => setStep(3)}>Continuar</Button></div></div>}
      {step === 3 && <TestRun label="Enviar set de pruebas a la DIAN" checks={["Firma digital válida", "Resolución vigente", "8 facturas de prueba aceptadas", "4 notas crédito de prueba aceptadas", "Habilitación para producción"]} onDone={() => onConnect(`Resolución ${f.resolution}`)} />}
    </div>
  );
}

/* ───────── Pagos ───────── */

function PaymentsWizard({ state, onConnect }: { state?: IntegrationState; onConnect: (account: string) => void }) {
  const [f, setF] = useState({ merchant: "508029", key: "", methods: ["PSE", "Tarjeta de crédito"] });
  if (state?.connected) return <ConnectedSummary state={state}><p className="text-sm text-fg-muted">Medios habilitados: {f.methods.join(", ")}</p></ConnectedSummary>;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código de comercio"><Input value={f.merchant} onChange={(e) => setF({ ...f, merchant: e.target.value })} /></Field>
        <Field label="Llave privada"><Input type="password" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></Field>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Medios de pago</p>
        <div className="flex flex-wrap gap-1.5">{["PSE", "Tarjeta de crédito", "Nequi", "Efectivo (corresponsal)"].map((m) => <button key={m} onClick={() => setF({ ...f, methods: f.methods.includes(m) ? f.methods.filter((x) => x !== m) : [...f.methods, m] })} className={cn("rounded-md border px-2.5 py-1 text-xs", f.methods.includes(m) ? "border-brand-300 bg-brand-50 text-brand-700" : "text-fg-muted")}>{m}</button>)}</div>
      </div>
      <CopyField label="URL de confirmación" value="https://api.gc360.co/webhooks/pagos/t_gran" />
      {f.key ? <TestRun checks={["Credenciales válidas", "Transacción de prueba aprobada", "Confirmación recibida en GC360"]} onDone={() => onConnect(`Comercio ${f.merchant}`)} /> : <p className="text-xs text-fg-muted">Ingresa la llave privada para probar la conexión.</p>}
    </div>
  );
}
