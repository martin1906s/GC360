"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Captions, CheckCircle2, FileText, Lock, Maximize, Pause, Play, PlayCircle, RotateCcw, RotateCw, SkipForward } from "lucide-react";
import { COURSES } from "@/data/erp-demo";
import { useAcademy } from "@/hooks/use-academy";
import { useDemoState } from "@/hooks/use-demo-state";
import { Guard, NotFoundInTenant } from "@/components/layout/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, Tabs } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function CoursePlayerPage() {
  return <Guard perm="academy.view"><Player /></Guard>;
}

function Player() {
  const { id } = useParams<{ id: string }>();
  const course = COURSES.find((c) => c.id === id);
  const { done, progress, complete } = useAcademy();
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cc, setCc] = useState(true);
  const [tab, setTab] = useState<"descripcion" | "notas" | "recursos" | "evaluacion">("descripcion");
  const [notes, setNotes] = useDemoState<Record<string, string>>("academy-notes", {});
  const frame = useRef<HTMLDivElement>(null);
  const lesson = course?.lessons[idx];

  useEffect(() => {
    if (!course) return;
    const first = course.lessons.findIndex((l) => !done[l.id]);
    setIdx(first === -1 ? 0 : first);
    // solo al abrir el curso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id]);

  useEffect(() => {
    if (!playing || !lesson) return;
    const timer = setInterval(() => {
      setT((x) => {
        const next = x + 0.25 * speed;
        if (next >= lesson.duration) {
          setPlaying(false);
          if (!done[lesson.id]) {
            complete(lesson.id);
            toast.success("Lección completada", { description: lesson.title });
          }
          return lesson.duration;
        }
        return next;
      });
    }, 250);
    return () => { clearInterval(timer); };
  }, [playing, speed, lesson, done, complete]);

  if (!course || !lesson) return <NotFoundInTenant entity="curso" />;

  const go = (i: number) => { setIdx(i); setT(0); setPlaying(true); };
  const ended = t >= lesson.duration;
  const pointsShown = Math.min(lesson.points.length, Math.floor((t / lesson.duration) * (lesson.points.length + 1)) + (t > 0 ? 1 : 0));
  const caption = lesson.captions[Math.min(lesson.captions.length - 1, Math.floor((t / lesson.duration) * lesson.captions.length))];
  const allDone = course.lessons.every((l) => done[l.id]);

  return (
    <div className="animate-fade-in">
      <Link href="/academia" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-3.5" /> Academia</Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone={course.area === "Obligatorio" ? "red" : "slate"}>{course.area}</Badge>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{course.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">Instructor: {course.instructor} · {course.lessons.length} lecciones</p>
        </div>
        <div className="w-56"><div className="mb-1 flex justify-between text-xs text-fg-muted"><span>Tu avance</span><span className="font-medium text-fg">{progress[course.id]}%</span></div><Progress value={progress[course.id]} tone={progress[course.id] === 100 ? "green" : "blue"} /></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* Video */}
          <div ref={frame} className="overflow-hidden rounded-lg bg-ink-950 shadow-sm">
            <div className="relative aspect-video cursor-pointer select-none" onClick={() => (ended ? (setT(0), setPlaying(true)) : setPlaying(!playing))}>
              <div className="absolute inset-0 flex flex-col justify-center px-[8%] text-white">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Lección {idx + 1} de {course.lessons.length}</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight md:text-3xl">{lesson.title}</h2>
                <ul className="mt-6 space-y-3">
                  {lesson.points.map((p, i) => (
                    <li key={p} className={cn("flex items-center gap-3 text-base transition-all duration-500 md:text-lg", i < pointsShown ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0")}>
                      <span className="size-2 rounded-full bg-brand-400" />{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute right-4 top-4 flex items-center gap-2 text-xs text-slate-400"><span className="grid size-7 place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-white">{course.instructor.split(" ").map((n) => n[0]).join("")}</span>{course.instructor}</div>
              {cc && t > 0 && !ended && <p className="absolute inset-x-[10%] bottom-6 rounded bg-black/70 px-3 py-1.5 text-center text-sm text-white">{caption}</p>}
              {!playing && (
                <div className="absolute inset-0 grid place-items-center bg-black/30">
                  {ended ? (
                    <div className="text-center text-white">
                      <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
                      <p className="mt-2 font-medium">Lección completada</p>
                      {idx < course.lessons.length - 1 && <Button className="mt-4" onClick={(e) => { e.stopPropagation(); go(idx + 1); }}><SkipForward /> Siguiente lección</Button>}
                    </div>
                  ) : <span className="grid size-16 place-items-center rounded-full bg-white/90 text-ink-950 shadow-lg"><Play className="ml-1 size-7" /></span>}
                </div>
              )}
            </div>
            {/* Controles */}
            <div className="border-t border-white/10 px-4 py-2.5 text-white">
              <div className="group relative h-1.5 cursor-pointer rounded-full bg-white/20" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setT(((e.clientX - r.left) / r.width) * lesson.duration); }}>
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${(t / lesson.duration) * 100}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-1">
                <button className="rounded p-1.5 hover:bg-white/10" onClick={() => (ended ? (setT(0), setPlaying(true)) : setPlaying(!playing))} title={playing ? "Pausar" : "Reproducir"}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
                <button className="rounded p-1.5 hover:bg-white/10" onClick={() => setT((x) => Math.max(0, x - 10))} title="Retroceder 10 s"><RotateCcw className="size-4" /></button>
                <button className="rounded p-1.5 hover:bg-white/10" onClick={() => setT((x) => Math.min(lesson.duration - 1, x + 10))} title="Adelantar 10 s"><RotateCw className="size-4" /></button>
                <span className="ml-2 text-xs tabular-nums text-slate-300">{fmt(t)} / {fmt(lesson.duration)}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button className={cn("rounded p-1.5 hover:bg-white/10", !cc && "text-slate-500")} onClick={() => setCc(!cc)} title="Subtítulos"><Captions className="size-4" /></button>
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded bg-transparent px-1 py-1 text-xs hover:bg-white/10">
                    {[0.75, 1, 1.25, 1.5, 2].map((s) => <option key={s} value={s} className="text-ink-950">{s}x</option>)}
                  </select>
                  <button className="rounded p-1.5 hover:bg-white/10" onClick={() => frame.current?.requestFullscreen?.()} title="Pantalla completa"><Maximize className="size-4" /></button>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ key: "descripcion", label: "Descripción" }, { key: "notas", label: "Mis notas" }, { key: "recursos", label: "Recursos" }, { key: "evaluacion", label: "Evaluación" }]} />
            <CardContent>
              {tab === "descripcion" && <div className="space-y-2 text-sm"><p>{course.description}</p><p className="text-fg-muted">En esta lección: {lesson.points.join(", ").toLowerCase()}.</p></div>}
              {tab === "notas" && <Textarea value={notes[lesson.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [lesson.id]: e.target.value }))} placeholder={`Notas sobre «${lesson.title}». Se guardan automáticamente.`} className="min-h-[120px]" />}
              {tab === "recursos" && (
                <ul className="divide-y rounded-lg border">
                  {[`Presentación — ${lesson.title}.pdf`, "Guía de estudio del curso.pdf", "Glosario de términos.pdf"].map((r) => <li key={r} className="flex items-center gap-3 px-4 py-2.5"><FileText className="size-4 text-fg-subtle" /><span className="flex-1 text-[13px]">{r}</span><Button size="xs" variant="ghost" onClick={() => toast("Descargando…", { description: r })}>Descargar</Button></li>)}
                </ul>
              )}
              {tab === "evaluacion" && (allDone ? (
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="size-5" /> Completaste todas las lecciones. La evaluación está disponible en la pestaña «Evaluación» de la Academia.</div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-fg-muted"><Lock className="size-5" /> Completa todas las lecciones para habilitar la evaluación ({course.lessons.filter((l) => done[l.id]).length} de {course.lessons.length}).</div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <div className="border-b px-4 py-3"><p className="text-sm font-semibold">Contenido del curso</p></div>
          <ul className="divide-y">
            {course.lessons.map((l, i) => (
              <li key={l.id}>
                <button onClick={() => go(i)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50", i === idx && "bg-brand-50/60")}>
                  {done[l.id] ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <PlayCircle className={cn("size-5 shrink-0", i === idx ? "text-brand-600" : "text-fg-subtle")} />}
                  <div className="min-w-0 flex-1"><p className={cn("text-[13px]", i === idx && "font-medium")}>{i + 1}. {l.title}</p><p className="text-[11px] text-fg-muted">{fmt(l.duration)}</p></div>
                  {i === idx && playing && <span className="text-[10px] font-semibold uppercase text-brand-600">Reproduciendo</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
