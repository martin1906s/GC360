"use client";

import { useState } from "react";
import Link from "next/link";
import { COURSES } from "@/data/erp-demo";
import { useAcademy } from "@/hooks/use-academy";
import { CheckCircle2, Clock, FileText, GraduationCap, PlayCircle, Send, Trophy } from "lucide-react";
import { useCurrent } from "@/hooks/use-data";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { KpiCard, PageHeader, Progress, Tabs } from "@/components/ui/misc";
import { Input } from "@/components/ui/form";
import { cn, sleep } from "@/lib/utils";

const LIBRARY = [
  ["Guía comparativa de coberturas de automóviles", "PDF · 12 págs."], ["Glosario de términos de seguros", "Documento interno"], ["Checklist de documentos por ramo", "Plantilla"],
  ["Proceso de reclamación de siniestros", "Procedimiento"], ["Argumentario comercial — Hogar", "Presentación"], ["Condiciones generales por aseguradora", "Biblioteca"],
];
const QUIZ = [
  { q: "¿Quién asume el riesgo en un contrato de seguro intermediado por un bróker?", options: ["El bróker", "La aseguradora", "El cliente"], a: 1 },
  { q: "El deducible es…", options: ["El valor que paga la aseguradora siempre", "La parte de la pérdida a cargo del asegurado", "La comisión del intermediario"], a: 1 },
  { q: "¿Una póliza próxima a vencer se renueva automáticamente en GC360?", options: ["Sí, siempre", "No, genera aviso y caso sugerido", "Solo si es de autos"], a: 1 },
];

export default function AcademyPage() {
  return <Guard perm="academy.view"><Academy /></Guard>;
}

function Academy() {
  const { progress } = useAcademy();
  const [tab, setTab] = useState<"cursos" | "biblioteca" | "evaluacion" | "tutor">("cursos");
  return (
    <div className="animate-fade-in">
      <PageHeader title={"Academia GC360"} description="Formación de empleados y vendedores: cursos, biblioteca de productos de seguros, evaluaciones y tutor de IA." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <KpiCard label="Cursos disponibles" value={COURSES.length} icon={<GraduationCap />} tone="blue" />
        <KpiCard label="Completados" value={COURSES.filter((c) => progress[c.id] === 100).length} icon={<CheckCircle2 />} tone="green" />
        <KpiCard label="Horas de formación" value="7,8 h" icon={<Clock />} tone="indigo" />
        <KpiCard label="Puntaje promedio" value="86 / 100" icon={<Trophy />} tone="amber" />
      </div>
      <Card>
        <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "cursos", label: "Cursos" }, { key: "biblioteca", label: "Biblioteca" }, { key: "evaluacion", label: "Evaluación" }, { key: "tutor", label: "Tutor IA" }]} />
        <CardContent>
          {tab === "cursos" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {COURSES.map((c) => {
                const pr = progress[c.id] ?? 0;
                const mins = Math.round(c.lessons.reduce((s, l) => s + l.duration, 0) / 60);
                return (
                  <div key={c.id} className="flex flex-col rounded-lg border p-4">
                    <Badge tone={c.area === "Obligatorio" ? "red" : "slate"} className="self-start">{c.area}</Badge>
                    <p className="mt-3 font-medium">{c.title}</p>
                    <p className="mt-1 text-xs text-fg-muted">{c.lessons.length} lecciones · {mins} min · {c.instructor}</p>
                    <div className="mt-auto flex items-center gap-3 pt-4"><Progress value={pr} tone={pr === 100 ? "green" : "blue"} /><span className="w-9 text-right text-xs tabular-nums text-fg-muted">{pr}%</span></div>
                    <Link href={`/academia/${c.id}`} className={buttonVariants({ size: "sm", variant: pr === 100 ? "secondary" : "primary", className: "mt-4 w-full" })}><PlayCircle /> {pr === 0 ? "Iniciar" : pr === 100 ? "Repasar" : "Continuar"}</Link>
                  </div>
                );
              })}
            </div>
          )}
          {tab === "biblioteca" && (
            <ul className="divide-y rounded-lg border">
              {LIBRARY.map(([t, k]) => <li key={t} className="flex items-center gap-3 px-4 py-3"><FileText className="size-4 text-fg-subtle" /><span className="flex-1 text-[13px] font-medium">{t}</span><span className="text-xs text-fg-muted">{k}</span></li>)}
            </ul>
          )}
          {tab === "evaluacion" && <Quiz />}
          {tab === "tutor" && <Tutor />}
        </CardContent>
      </Card>
    </div>
  );
}

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);
  const score = QUIZ.filter((q, i) => answers[i] === q.a).length;
  return (
    <div className="max-w-2xl space-y-5">
      {QUIZ.map((q, i) => (
        <div key={i}>
          <p className="text-sm font-medium">{i + 1}. {q.q}</p>
          <div className="mt-2 space-y-1.5">
            {q.options.map((o, j) => (
              <label key={o} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[13px]", done && j === q.a && "border-emerald-300 bg-emerald-50", done && answers[i] === j && j !== q.a && "border-rose-300 bg-rose-50")}>
                <input type="radio" name={`q${i}`} disabled={done} checked={answers[i] === j} onChange={() => setAnswers({ ...answers, [i]: j })} className="accent-brand-600" />{o}
              </label>
            ))}
          </div>
        </div>
      ))}
      {done ? <p className="text-sm font-semibold">Resultado: {score} / {QUIZ.length}</p> : <Button onClick={() => setDone(true)} disabled={Object.keys(answers).length < QUIZ.length}>Calificar</Button>}
    </div>
  );
}

function Tutor() {
  const { user } = useCurrent();
  const [msgs, setMsgs] = useState<{ me: boolean; t: string }[]>([{ me: false, t: `Hola ${user?.name.split(" ")[0]}. Soy el tutor de la Academia. Pregúntame sobre productos, coberturas o procesos de la agencia.` }]);
  const [q, setQ] = useState("");
  const ask = async () => {
    if (!q) return;
    const text = q;
    setQ("");
    setMsgs((m) => [...m, { me: true, t: text }]);
    await sleep(700);
    const n = text.toLowerCase();
    const a = n.includes("deducible") ? "El deducible es la porción de la pérdida que asume el asegurado. Puede ser un porcentaje (p. ej. 10% de la pérdida), un valor fijo, o un mínimo en SMMLV. Al comparar ofertas, revisa si aplica distinto para pérdida total y parcial." : n.includes("cumplimiento") ? "Las pólizas de cumplimiento garantizan obligaciones contractuales: seriedad de oferta, cumplimiento, anticipo, salarios y estabilidad de obra. Se exigen frecuentemente en contratación pública." : "Buena pregunta. En la versión productiva responderé con base en la biblioteca de la Academia y las condiciones de cada aseguradora. Mientras tanto, revisa el curso «Fundamentos de intermediación».";
    setMsgs((m) => [...m, { me: false, t: a }]);
  };
  return (
    <div className="max-w-2xl">
      <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
        {msgs.map((m, i) => <div key={i} className={cn("flex", m.me && "justify-end")}><p className={cn("max-w-[80%] rounded-lg px-3 py-2 text-[13px]", m.me ? "bg-brand-600 text-white" : "border bg-white")}>{m.t}</p></div>)}
      </div>
      <div className="mt-3 flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ej. ¿Qué es el deducible?" /><Button onClick={ask}><Send /></Button></div>
      
    </div>
  );
}
