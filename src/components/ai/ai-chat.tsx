"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Database, BotMessageSquare } from "lucide-react";
import { answerQuery, EXAMPLE_QUERIES, type AIAnswer } from "@/ai/engine";
import { useCurrent } from "@/hooks/use-data";
import { db } from "@/store/db";
import { cn, sleep } from "@/lib/utils";

interface Turn {
  id: string;
  role: "user" | "ai";
  text: string;
  answer?: AIAnswer;
  streaming?: boolean;
}

/** Chat IA reutilizable: página del asistente, copiloto lateral y tablero. */
export function AIChat({ context, initialQuery, compact, suggestions = EXAMPLE_QUERIES }: { context?: string; initialQuery?: string; compact?: boolean; suggestions?: string[] }) {
  const { user } = useCurrent();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const ask = async (q: string) => {
    if (!q.trim() || !user || busy) return;
    setInput("");
    setBusy(true);
    const id = Math.random().toString(36).slice(2);
    setTurns((t) => [...t, { id: id + "u", role: "user", text: q }, { id, role: "ai", text: "", streaming: true }]);
    await sleep(500 + Math.random() * 400);
    const answer = answerQuery(q, user, db());
    // efecto de escritura progresiva
    const words = answer.text.split(" ");
    for (let i = 1; i <= words.length; i += 3) {
      const partial = words.slice(0, i).join(" ");
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, text: partial } : x)));
      await sleep(18);
    }
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, text: answer.text, answer, streaming: false } : x)));
    setBusy(false);
  };

  useEffect(() => {
    if (initialQuery && !ran.current && user) {
      ran.current = true;
      ask(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, user]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4 scroll-thin">
        {turns.length === 0 && (
          <div className={cn("text-center", compact ? "py-6" : "py-12")}>
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-ink-900 text-white">
              <BotMessageSquare className="size-6" />
            </div>
            <p className="font-semibold">¿En qué te ayudo, {user?.name.split(" ")[0]}?</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
              Consulto información interna filtrada por tu empresa y permisos{context ? ` · contexto: ${context}` : ""}.
            </p>
            <div className={cn("mx-auto mt-5 grid gap-2", compact ? "max-w-sm" : "max-w-xl sm:grid-cols-2")}>
              {suggestions.slice(0, compact ? 4 : 6).map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-lg border bg-white px-3 py-2 text-left text-[13px] text-fg-muted transition hover:border-brand-300 hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t) =>
          t.role === "user" ? (
            <div key={t.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white">{t.text}</div>
            </div>
          ) : (
            <div key={t.id} className="flex gap-2.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-900 text-white">
                <BotMessageSquare className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="rounded-xl rounded-tl-md bg-slate-100 px-3.5 py-2.5 text-sm leading-relaxed">
                  {t.text || (
                    <span className="inline-flex gap-1">
                      <span className="typing-dot size-1.5 rounded-full bg-slate-400" />
                      <span className="typing-dot size-1.5 rounded-full bg-slate-400" />
                      <span className="typing-dot size-1.5 rounded-full bg-slate-400" />
                    </span>
                  )}
                </div>
                {t.answer?.table && t.answer.table.rows.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border bg-white scroll-thin">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>{t.answer.table.columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-fg-muted">{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {t.answer.table.rows.map((r, i) => (
                          <tr key={i} className="border-t">{r.map((v, j) => <td key={j} className="whitespace-nowrap px-3 py-1.5">{v}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {t.answer?.links && t.answer.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.answer.links.map((l) =>
                      l.href.startsWith("?q=") ? (
                        <button key={l.label} onClick={() => ask(l.label)} className="rounded-full border bg-white px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-50">{l.label}</button>
                      ) : (
                        <Link key={l.label} href={l.href} className="rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">{l.label} →</Link>
                      ),
                    )}
                  </div>
                )}
                {t.answer && t.answer.sources.length > 0 && (
                  <p className="flex items-center gap-1 text-[11px] text-fg-subtle">
                    <Database className="size-3" /> Fuentes: {t.answer.sources.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ),
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t bg-white p-3"
      >
        <div className="flex items-end gap-2 rounded-lg border bg-white p-1.5 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            placeholder="Pregunta en lenguaje natural… ej. «casos pendientes más de 48 horas»"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button disabled={!input.trim() || busy} className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white disabled:opacity-40">
            <ArrowUp className="size-4" />
          </button>
        </div>
        
      </form>
    </div>
  );
}
