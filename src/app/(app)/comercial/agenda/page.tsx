"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Bot, Phone, Users, Bell, ListChecks, Repeat } from "lucide-react";
import { useCurrent, useLookups, useScoped } from "@/hooks/use-data";
import { toggleTask } from "@/services/cases";
import type { Task } from "@/domain/types";
import { Guard } from "@/components/layout/guard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/misc";
import { UserChip } from "@/components/domain/chips";
import { cn, fmtTime } from "@/lib/utils";

const ICON: Record<Task["type"], React.ReactNode> = {
  tarea: <ListChecks className="size-4" />, llamada: <Phone className="size-4" />, reunion: <Users className="size-4" />, recordatorio: <Bell className="size-4" />, seguimiento: <Repeat className="size-4" />,
};

export default function AgendaPage() {
  return <Guard perm="cases.view"><Agenda /></Guard>;
}

function Agenda() {
  const { user } = useCurrent();
  const { clients } = useLookups();
  const tasks = useScoped("tasks");
  const cases = useScoped("cases");
  const [scope, setScope] = useState<"mine" | "team">(user?.role === "gerencia" || user?.role === "admin" ? "team" : "mine");
  const [show, setShow] = useState<"pending" | "all">("pending");

  const groups = useMemo(() => {
    const xs = tasks.filter((t) => (scope === "mine" ? t.assigneeId === user?.id : true)).filter((t) => (show === "pending" ? !t.done : true)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const now = startOfDay(new Date()).getTime();
    const map = new Map<string, Task[]>();
    xs.forEach((t) => {
      const d = new Date(t.dueAt);
      const key = !t.done && d.getTime() < now ? "Vencidas" : isToday(d) ? "Hoy" : isTomorrow(d) ? "Mañana" : format(d, "EEEE d 'de' MMMM", { locale: es });
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return [...map.entries()];
  }, [tasks, scope, show, user]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Agenda comercial"
        description="Tareas, llamadas y recordatorios pendientes."
        actions={<><Segmented value={scope} onChange={setScope} options={[{ key: "mine", label: "Mías" }, { key: "team", label: "Equipo" }]} /><Segmented value={show} onChange={setShow} options={[{ key: "pending", label: "Pendientes" }, { key: "all", label: "Todas" }]} /></>}
      />
      {groups.length === 0 && <Card><EmptyState title="Agenda despejada" description="No hay actividades en esta vista." /></Card>}
      <div className="space-y-5">
        {groups.map(([day, items]) => (
          <div key={day}>
            <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", day === "Vencidas" ? "text-rose-600" : "text-fg-muted")}>{day} · {items.length}</p>
            <Card>
              <ul className="divide-y">
                {items.map((t) => {
                  const c = cases.find((x) => x.id === t.caseId);
                  return (
                    <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="size-4 cursor-pointer accent-brand-600" />
                      <span className="w-12 text-xs tabular-nums text-fg-muted">{fmtTime(t.dueAt)}</span>
                      <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-fg-muted">{ICON[t.type]}</span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[13px] font-medium", t.done && "text-fg-subtle line-through")}>{t.title}</p>
                        <p className="text-[11px] text-fg-muted">
                          {t.clientId && clients.get(t.clientId)?.name}
                          {c && <> · <Link href={`/casos/${c.id}`} className="font-medium text-brand-700 hover:underline">{c.code}</Link></>}
                        </p>
                      </div>
                      {t.mandatory && <Badge tone="red">Obligatoria</Badge>}
                      {t.origin !== "manual" && <Badge tone="teal"><Bot className="size-3" /> {t.origin === "ia" ? "IA" : "Automatización"}</Badge>}
                      <UserChip id={t.assigneeId} showName={scope === "team"} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
