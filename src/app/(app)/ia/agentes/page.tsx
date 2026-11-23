"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Mic, MicOff, Play, Save, ShieldAlert, BotMessageSquare } from "lucide-react";
import { useScoped } from "@/hooks/use-data";
import { saveAgent } from "@/services/crm";
import { classify, suggestReply } from "@/ai/engine";
import { CASE_CATEGORY, CHANNEL_META } from "@/domain/constants";
import type { AgentConfig, Channel } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Field, Input, Switch, Textarea } from "@/components/ui/form";
import { cn, sleep } from "@/lib/utils";

const ALL_SOURCES = ["Catálogo de productos", "Plantillas aprobadas", "FAQ comercial", "Pólizas", "Ofertas registradas", "Condiciones de aseguradoras", "Casos", "Cartera", "Comisiones", "Pipeline"];
const ALL_ACTIONS = ["Responder consultas generales", "Crear caso", "Solicitar documentos", "Agendar llamada", "Crear tareas", "Validar póliza", "Preparar borradores", "Consultar datos", "Generar informes", "Enviar comparativo", "Comunicaciones de siniestros", "Solicitar emisión", "Solicitar endoso", "Comunicaciones a aseguradora"];

export default function AgentsPage() {
  return <Guard perm="automations.edit"><Agents /></Guard>;
}

/* Tipado mínimo de Web Speech API */
type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void; onend: () => void; onerror: () => void };

function Agents() {
  const agents = useScoped("agents");
  const [sel, setSel] = useState(agents[0]?.id);
  const agent = agents.find((a) => a.id === sel);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Agentes IA" description="Define cómo trabaja cada asistente: instrucciones por voz o texto, información que consulta y acciones que puede realizar." />
      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {agents.map((a) => (
            <button key={a.id} onClick={() => setSel(a.id)} className={cn("w-full rounded-lg border bg-white p-4 text-left transition", sel === a.id ? "border-brand-500 ring-4 ring-brand-500/10" : "hover:border-slate-300")}>
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-ink-900 text-white"><Bot className="size-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.name}</p><p className="text-[11px] text-fg-muted">{a.active ? "Activo" : "Inactivo"} · {a.schedule.split("·")[0]}</p></div>
                <span className={cn("size-2 rounded-full", a.active ? "bg-emerald-500" : "bg-slate-300")} />
              </div>
            </button>
          ))}
        </div>
        {agent && <AgentEditor key={agent.id} agent={agent} />}
      </div>
    </div>
  );
}

function AgentEditor({ agent }: { agent: AgentConfig }) {
  const [a, setA] = useState(agent);
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRec | null>(null);
  const [testMsg, setTestMsg] = useState("Hola, me robaron el carro anoche, ¿qué hago?");
  const [testOut, setTestOut] = useState<null | { category: string; reply: string; needsApproval: boolean; confidence: number }>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => () => { rec.current?.stop(); }, []);

  const toggleVoice = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return toast.error("Tu navegador no soporta dictado por voz", { description: "Prueba en Chrome o Edge." });
    if (listening) { rec.current?.stop(); return; }
    const r = new Ctor();
    r.lang = "es-CO";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) setA((s) => ({ ...s, instructions: `${s.instructions.trim()} ${text.trim()}`.trim() }));
    };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast.error("No se pudo acceder al micrófono"); };
    rec.current = r;
    r.start();
    setListening(true);
    toast("Escuchando… dicta la instrucción", { icon: <Mic className="size-4 text-rose-500" /> });
  };

  const toggle = (k: "sources" | "allowedActions" | "approvalRequired", v: string) => setA((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));

  const runTest = async () => {
    setTesting(true);
    setTestOut(null);
    await sleep(900);
    const c = classify(testMsg);
    const needsApproval = c.category === "siniestro" ? a.approvalRequired.includes("Comunicaciones de siniestros") : c.category === "modificacion";
    setTestOut({ category: CASE_CATEGORY[c.category].label, reply: suggestReply(c.category, "Cliente"), needsApproval, confidence: c.confidence });
    setTesting(false);
  };

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader title={a.name} description={a.purpose} action={<><span className="text-xs text-fg-muted">Activo</span><Switch checked={a.active} onChange={(v) => setA({ ...a, active: v })} /></>} />
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><Input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></Field>
            <Field label="Tono"><Input value={a.tone} onChange={(e) => setA({ ...a, tone: e.target.value })} /></Field>
            <Field label="Propósito" className="sm:col-span-2"><Input value={a.purpose} onChange={(e) => setA({ ...a, purpose: e.target.value })} /></Field>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted">Instrucciones (texto o voz)</span>
              <Button size="xs" variant={listening ? "danger" : "secondary"} onClick={toggleVoice}>{listening ? <><MicOff /> Detener dictado</> : <><Mic /> Dictar por voz</>}</Button>
            </div>
            <Textarea value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} className={cn("min-h-[120px]", listening && "border-rose-300 ring-4 ring-rose-500/10")} />
            {listening && <p className="mt-1 flex items-center gap-1.5 text-[11px] text-rose-600"><span className="size-2 animate-pulse rounded-full bg-rose-500" /> Grabando </p>}
          </div>
          <ChipGroup label="Fuentes autorizadas" all={ALL_SOURCES} selected={a.sources} onToggle={(v) => toggle("sources", v)} tone="indigo" />
          <ChipGroup label="Acciones permitidas" all={ALL_ACTIONS} selected={a.allowedActions} onToggle={(v) => toggle("allowedActions", v)} tone="green" />
          <ChipGroup label="Requieren aprobación humana" all={ALL_ACTIONS} selected={a.approvalRequired} onToggle={(v) => toggle("approvalRequired", v)} tone="red" />
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-muted">Canales</p>
            <div className="flex flex-wrap gap-1.5">
              {(["whatsapp", "email", "outlook", "portal"] as Channel[]).map((c) => (
                <button key={c} onClick={() => setA({ ...a, channels: a.channels.includes(c) ? a.channels.filter((x) => x !== c) : [...a.channels, c] })} className={cn("rounded-full border px-2.5 py-1 text-xs", a.channels.includes(c) ? "border-brand-300 bg-brand-50 text-brand-700" : "text-fg-muted")}>{CHANNEL_META[c].label}</button>
              ))}
            </div>
          </div>
          <Field label="Horario de operación"><Input value={a.schedule} onChange={(e) => setA({ ...a, schedule: e.target.value })} /></Field>
          <div className="flex justify-end"><Button onClick={() => { saveAgent(a); toast.success("Agente actualizado", { description: "Cambio registrado en auditoría." }); }}><Save /> Guardar configuración</Button></div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader title="Probar agente" icon={<BotMessageSquare />} description="Prueba sin enviar mensajes" />
        <CardContent className="space-y-3">
          <Textarea value={testMsg} onChange={(e) => setTestMsg(e.target.value)} className="min-h-[80px]" />
          <Button variant="ai" className="w-full" onClick={runTest} loading={testing}><Play /> Simular mensaje entrante</Button>
          {testOut && (
            <div className="animate-fade-in space-y-2 rounded-lg bg-slate-50 p-3 text-[13px]">
              <div className="flex flex-wrap gap-1.5"><Badge tone="blue">{testOut.category}</Badge><Badge tone="slate">Confianza {Math.round(testOut.confidence * 100)}%</Badge></div>
              <p className="rounded-lg bg-white p-2.5">{testOut.reply}</p>
              {testOut.needsApproval ? <p className="flex items-center gap-1.5 text-xs text-amber-700"><ShieldAlert className="size-3.5" /> Según la configuración, esta respuesta quedaría pendiente de aprobación.</p> : <p className="text-xs text-emerald-700">✓ Acción permitida sin aprobación.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChipGroup({ label, all, selected, onToggle, tone }: { label: string; all: string[]; selected: string[]; onToggle: (v: string) => void; tone: "indigo" | "green" | "red" }) {
  const on = { indigo: "border-indigo-300 bg-indigo-50 text-indigo-700", green: "border-emerald-300 bg-emerald-50 text-emerald-700", red: "border-rose-300 bg-rose-50 text-rose-700" }[tone];
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-fg-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {all.map((s) => <button key={s} onClick={() => onToggle(s)} className={cn("rounded-full border px-2.5 py-1 text-xs transition", selected.includes(s) ? on : "text-fg-muted hover:bg-slate-50")}>{s}</button>)}
      </div>
    </div>
  );
}
