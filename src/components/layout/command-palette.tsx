"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Briefcase, CornerDownLeft, FileText, Paperclip, Search, User } from "lucide-react";
import { useSession } from "@/store/session";
import { useCurrent, useScoped } from "@/hooks/use-data";
import { QUICK_LINKS } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Búsqueda global con permisos aplicados. */
export function CommandPalette() {
  const open = useSession((s) => s.commandOpen);
  const setOpen = useSession((s) => s.setCommand);
  const router = useRouter();
  const { can } = useCurrent();
  const clients = useScoped("clients");
  const cases = useScoped("cases");
  const policies = useScoped("policies");
  const docs = useScoped("documents");
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useSession.getState().commandOpen);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const n = norm(q.trim());
    const pages = QUICK_LINKS.filter((l) => can(l.perm) && (!n || norm(l.label).includes(n))).map((l) => ({ id: l.href, group: "Ir a", title: l.label, subtitle: l.module, href: l.href, icon: <l.icon className="size-4" /> }));
    if (!n) return pages.slice(0, 8);
    const out: Result[] = [];
    if (can("crm.view"))
      clients.filter((c) => norm(`${c.name} ${c.docNumber} ${c.email} ${c.phone}`).includes(n)).slice(0, 5).forEach((c) => out.push({ id: c.id, group: "Clientes", title: c.name, subtitle: `${c.docType} ${c.docNumber} · ${c.status}`, href: `/crm/clientes/${c.id}`, icon: <User className="size-4" /> }));
    cases.filter((c) => norm(`${c.code} ${c.title}`).includes(n)).slice(0, 5).forEach((c) => out.push({ id: c.id, group: "Casos", title: c.code, subtitle: c.title, href: `/casos/${c.id}`, icon: <Briefcase className="size-4" /> }));
    policies.filter((p) => norm(`${p.number} ${p.insuredItem}`).includes(n)).slice(0, 5).forEach((p) => out.push({ id: p.id, group: "Pólizas", title: p.number, subtitle: p.insuredItem, href: `/polizas/${p.id}`, icon: <FileText className="size-4" /> }));
    docs.filter((d) => norm(d.name).includes(n)).slice(0, 4).forEach((d) => out.push({ id: d.id, group: "Documentos", title: d.name, subtitle: d.kind, href: d.caseId ? `/casos/${d.caseId}` : d.policyId ? `/polizas/${d.policyId}` : "/", icon: <Paperclip className="size-4" /> }));
    return [...out, ...pages.slice(0, 3)];
  }, [q, clients, cases, policies, docs, can]);

  if (!open || typeof document === "undefined") return null;

  const go = (r: Result) => {
    setOpen(false);
    router.push(r.href);
  };

  let lastGroup = "";
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/40 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-xl animate-fade-in overflow-hidden rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-4 text-fg-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setIdx((i) => Math.min(results.length - 1, i + 1));
              if (e.key === "ArrowUp") setIdx((i) => Math.max(0, i - 1));
              if (e.key === "Enter" && results[idx]) go(results[idx]);
            }}
            placeholder="Cliente, número de caso, póliza, placa, documento…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
          />
          <kbd className="rounded border px-1.5 text-[10px] text-fg-muted">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2 scroll-thin">
          {results.length === 0 && <p className="py-10 text-center text-sm text-fg-muted">Sin resultados dentro de tus permisos.</p>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? ((lastGroup = r.group), <p key={r.group + "h"} className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{r.group}</p>) : null;
            return (
              <div key={r.group + r.id}>
                {header}
                <button onMouseEnter={() => setIdx(i)} onClick={() => go(r)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === idx ? "bg-brand-50" : "")}>
                  <span className={cn("grid size-8 place-items-center rounded-lg", i === idx ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-fg-muted")}>{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="truncate text-xs text-fg-muted">{r.subtitle}</p>
                  </div>
                  {i === idx && <CornerDownLeft className="size-3.5 text-fg-subtle" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t bg-slate-50 px-4 py-2 text-[11px] text-fg-muted">↑↓ para navegar · Enter para abrir</div>
      </div>
    </div>,
    document.body,
  );
}
