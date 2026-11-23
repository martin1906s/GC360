"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { createCase } from "@/services/cases";
import { CASE_CATEGORY, CHANNEL_META, PRIORITY } from "@/domain/constants";
import type { CaseCategory, CasePriority, Channel } from "@/domain/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

/** Creación manual de caso. */
export function NewCaseModal({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId?: string }) {
  const router = useRouter();
  const { user } = useCurrent();
  const { users } = useLookups();
  const clients = useScoped("clients");
  const lines = useScoped("lines");
  const [f, setF] = useState({ title: "", description: "", category: "cotizacion" as CaseCategory, priority: "media" as CasePriority, clientId: clientId ?? "", assigneeId: user?.id ?? "", lineId: "", channel: "llamada" as Channel });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.title || !f.clientId) return toast.error("Título y cliente son obligatorios");
    try {
      const c = createCase({ ...f, lineId: f.lineId || undefined });
      toast.success(`Caso ${c.code} creado`);
      onClose();
      router.push(`/casos/${c.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Nuevo caso" description="Registra una nueva solicitud y asígnale un responsable." footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}><Briefcase /> Crear caso</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" required className="sm:col-span-2"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Cotización auto — placa ABC-123" /></Field>
        <Field label="Cliente / solicitante" required>
          <Select value={f.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="">Seleccionar…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Canal de origen">
          <Select value={f.channel} onChange={(e) => set("channel", e.target.value)}>
            {Object.entries(CHANNEL_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Clasificación">
          <Select value={f.category} onChange={(e) => set("category", e.target.value)}>
            {Object.entries(CASE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Ramo">
          <Select value={f.lineId} onChange={(e) => set("lineId", e.target.value)}>
            <option value="">No aplica</option>
            {lines.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Prioridad" hint={`SLA ${PRIORITY[f.priority].sla} h`}>
          <Select value={f.priority} onChange={(e) => set("priority", e.target.value)}>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Responsable">
          <Select value={f.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
            {[...users.values()].filter((u) => !["cliente", "afiliado"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Descripción" className="sm:col-span-2"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
