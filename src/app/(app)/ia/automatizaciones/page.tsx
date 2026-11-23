"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ClipboardList, Filter, Play, Plus, ShieldCheck, Trash2, UserCheck, Workflow, Zap } from "lucide-react";
import { useScoped } from "@/hooks/use-data";
import { saveAutomation, toggleAutomation } from "@/services/crm";
import type { AutomationRule } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/modal";
import { cn, fromNow, sleep } from "@/lib/utils";

const TRIGGERS = ["Mensaje entrante (WhatsApp / correo)", "Póliza próxima a vencer", "SLA vencido", "Cuota vencida", "Caso creado", "Oferta registrada", "Cliente sin respuesta"];
const FIELDS = ["Días para vencimiento", "Prioridad", "Categoría del caso", "Canal", "Días de mora", "Ramo", "Remitente", "Estado póliza"];
const OPS = ["=", "≠", "≤", "≥", "∈"];
const ACTIONS = ["Clasificar con IA", "Crear caso", "Crear tarea", "Asignar", "Generar borrador IA", "Notificar", "Subir prioridad", "Proponer caso", "Enviar plantilla"];

export default function AutomationsPage() {
  return <Guard perm="automations.edit"><Automations /></Guard>;
}

function Automations() {
  const rules = useScoped("automations");
  const [editing, setEditing] = useState<Partial<AutomationRule> | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const test = async (r: AutomationRule) => {
    setTesting(r.id);
    setLog([]);
    const steps = [`Disparador evaluado: «${r.trigger}»`, ...r.conditions.map((c) => `✓ Condición cumplida: ${c.field} ${c.op} ${c.value}`), ...r.actions.map((a) => `Acción: ${a.type} → ${a.target}`), r.approval !== "ninguna" ? `Queda pendiente de aprobación (${r.approval})` : "✓ Ejecutada sin aprobación (acción no sensible)", "Registro de auditoría creado"];
    for (const s of steps) { await sleep(380); setLog((l) => [...l, s]); }
    setTesting(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Centro de automatizaciones" description="Reglas que ejecutan tareas automáticamente cuando se cumplen ciertas condiciones." actions={<Button onClick={() => setEditing({ name: "", description: "", trigger: TRIGGERS[0], conditions: [{ field: FIELDS[0], op: "≤", value: "" }], actions: [{ type: ACTIONS[0], target: "" }], approval: "supervisor", active: true })}><Plus /> Nueva regla</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        {rules.map((r) => (
          <Card key={r.id} className={cn("p-5", !r.active && "opacity-70")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-600"><Workflow className="size-5" /></div>
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">{r.description}</p>
                </div>
              </div>
              <Switch checked={r.active} onChange={() => { toggleAutomation(r.id); toast(r.active ? "Regla desactivada" : "Regla activada"); }} />
            </div>
            <FlowPreview r={r} />
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <p className="text-[11px] text-fg-muted">{r.runs.toLocaleString("es-CO")} ejecuciones{r.lastRun ? ` · última ${fromNow(r.lastRun)}` : ""}</p>
              <div className="flex gap-1.5">
                <Button size="xs" variant="ghost" onClick={() => test(r)} loading={testing === r.id}><Play /> Probar</Button>
                <Button size="xs" variant="secondary" onClick={() => setEditing(r)}>Editar</Button>
              </div>
            </div>
            {log.length > 0 && (testing === r.id || log[0]?.includes(r.trigger)) && (
              <div className="mt-3 space-y-1 rounded-lg bg-ink-950 p-3 font-mono text-[11px] text-emerald-300">
                {log.map((l) => <p key={l} className="animate-fade-in">{l}</p>)}
              </div>
            )}
          </Card>
        ))}
      </div>
      {editing && <Builder rule={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FlowPreview({ r }: { r: AutomationRule }) {
  const Node = ({ icon, label, items, tone }: { icon: React.ReactNode; label: string; items: string[]; tone: string }) => (
    <div className={cn("rounded-lg border-l-4 bg-slate-50 px-3 py-2", tone)}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{icon}{label}</p>
      {items.map((i) => <p key={i} className="text-[12px] font-medium">{i}</p>)}
    </div>
  );
  return (
    <div className="mt-4 space-y-1.5">
      <Node icon={<Zap className="size-3" />} label="Disparador" items={[r.trigger]} tone="border-amber-400" />
      <ArrowDown className="mx-auto size-3 text-fg-subtle" />
      <Node icon={<Filter className="size-3" />} label="Condiciones" items={r.conditions.map((c) => `${c.field} ${c.op} ${c.value}`)} tone="border-blue-400" />
      <ArrowDown className="mx-auto size-3 text-fg-subtle" />
      <Node icon={<ClipboardList className="size-3" />} label="Acciones" items={r.actions.map((a) => `${a.type}${a.target ? ` → ${a.target}` : ""}`)} tone="border-violet-400" />
      <ArrowDown className="mx-auto size-3 text-fg-subtle" />
      <div className="flex gap-2">
        <div className="flex-1"><Node icon={<UserCheck className="size-3" />} label="Aprobación" items={[r.approval === "ninguna" ? "Automática" : `Requiere ${r.approval}`]} tone={r.approval === "ninguna" ? "border-slate-300" : "border-rose-400"} /></div>
        <div className="flex-1"><Node icon={<ShieldCheck className="size-3" />} label="Registro" items={["Auditoría + trazabilidad"]} tone="border-emerald-400" /></div>
      </div>
    </div>
  );
}

function Builder({ rule, onClose }: { rule: Partial<AutomationRule>; onClose: () => void }) {
  const [r, setR] = useState(rule as AutomationRule);
  const save = () => {
    if (!r.name) return toast.error("Asigna un nombre a la regla");
    saveAutomation(r);
    toast.success("Regla guardada", { description: "El cambio quedó en el historial de auditoría." });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} width="max-w-xl" title={rule.id ? "Editar automatización" : "Nueva automatización"} description="Define cuándo se activa la regla y qué debe hacer." footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar regla</Button></>}>
      <div className="space-y-5">
        <Field label="Nombre"><Input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
        <Field label="Descripción"><Input value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Field>
        <Section icon={<Zap />} title="1. Disparador" tone="bg-amber-50 text-amber-700">
          <Select value={r.trigger} onChange={(e) => setR({ ...r, trigger: e.target.value })}>{TRIGGERS.map((t) => <option key={t}>{t}</option>)}</Select>
        </Section>
        <Section icon={<Filter />} title="2. Condiciones" tone="bg-blue-50 text-blue-700">
          {r.conditions.map((c, i) => (
            <div key={i} className="flex gap-2">
              <Select value={c.field} onChange={(e) => setR({ ...r, conditions: r.conditions.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) })}>{FIELDS.map((f) => <option key={f}>{f}</option>)}</Select>
              <Select value={c.op} className="w-20" onChange={(e) => setR({ ...r, conditions: r.conditions.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)) })}>{OPS.map((o) => <option key={o}>{o}</option>)}</Select>
              <Input value={c.value} placeholder="valor" onChange={(e) => setR({ ...r, conditions: r.conditions.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
              <Button size="icon" variant="ghost" onClick={() => setR({ ...r, conditions: r.conditions.filter((_, j) => j !== i) })}><Trash2 /></Button>
            </div>
          ))}
          <Button size="xs" variant="ghost" onClick={() => setR({ ...r, conditions: [...r.conditions, { field: FIELDS[1], op: "=", value: "" }] })}><Plus /> Condición</Button>
        </Section>
        <Section icon={<ClipboardList />} title="3. Acciones" tone="bg-brand-50 text-brand-700">
          {r.actions.map((a, i) => (
            <div key={i} className="flex gap-2">
              <Select value={a.type} onChange={(e) => setR({ ...r, actions: r.actions.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })}>{ACTIONS.map((x) => <option key={x}>{x}</option>)}</Select>
              <Input value={a.target} placeholder="destino / responsable" onChange={(e) => setR({ ...r, actions: r.actions.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)) })} />
              <Button size="icon" variant="ghost" onClick={() => setR({ ...r, actions: r.actions.filter((_, j) => j !== i) })}><Trash2 /></Button>
            </div>
          ))}
          <Button size="xs" variant="ghost" onClick={() => setR({ ...r, actions: [...r.actions, { type: ACTIONS[2], target: "" }] })}><Plus /> Acción</Button>
        </Section>
        <Section icon={<UserCheck />} title="4. Aprobación humana" tone="bg-rose-50 text-rose-700">
          <Select value={r.approval} onChange={(e) => setR({ ...r, approval: e.target.value as AutomationRule["approval"] })}>
            <option value="ninguna">Sin aprobación (solo acciones no sensibles)</option>
            <option value="supervisor">Supervisor IA</option>
            <option value="gerencia">Gerencia</option>
          </Select>
        </Section>
        <div className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm">Regla activa</span><Switch checked={r.active} onChange={(v) => setR({ ...r, active: v })} /></div>
        <Badge tone="green"><ShieldCheck className="size-3" /> 5. Todas las ejecuciones se registran en auditoría</Badge>
      </div>
    </Sheet>
  );
}

function Section({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className={cn("grid size-6 place-items-center rounded-md [&_svg]:size-3.5", tone)}>{icon}</span>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
