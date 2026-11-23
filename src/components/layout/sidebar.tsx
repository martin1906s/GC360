"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { NAVIGATION } from "@/config/navigation";
import { useCurrent, useScoped } from "@/hooks/use-data";
import { useSession } from "@/store/session";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const path = usePathname();
  const { can, tenant } = useCurrent();
  const collapsed = useSession((s) => s.sidebarCollapsed);
  const toggle = useSession((s) => s.toggleSidebar);
  const conversations = useScoped("conversations");
  const actions = useScoped("aiActions");
  const cases = useScoped("cases");

  const badges = useMemo(
    () => ({
      inbox: conversations.reduce((s, c) => s + (c.unread > 0 ? 1 : 0), 0),
      approvals: actions.filter((a) => a.status === "pendiente").length,
      cases: cases.filter((c) => !["resuelto", "cerrado"].includes(c.status) && new Date(c.dueAt) < new Date()).length,
    }),
    [conversations, actions, cases],
  );

  const groups = NAVIGATION.map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) })).filter((g) => g.items.length);

  return (
    <aside className={cn("no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-ink-950 text-slate-300 transition-[width] lg:flex", collapsed ? "w-[68px]" : "w-[252px]")}>
      <div className="flex h-14 items-center gap-2.5 border-b border-white/5 px-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-md border border-white/20 font-mono text-[11px] font-semibold text-white">
          GC
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold text-white">GC360</p>
            <p className="truncate text-[11px] text-slate-400">{tenant?.name}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4 [scrollbar-width:none]">
        {groups.map((g) => (
          <div key={g.module}>
            {!collapsed && <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{g.module}</p>}
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
                const count = i.badge ? badges[i.badge] : 0;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      title={collapsed ? i.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition",
                        active ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.04] hover:text-white",
                        collapsed && "justify-center",
                      )}
                    >
                      {active && <span className="absolute -left-2.5 top-1.5 bottom-1.5 w-[3px] rounded-r bg-brand-400" />}
                      <i.icon className={cn("size-[17px] shrink-0", active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300")} />
                      {!collapsed && <span className="flex-1 truncate">{i.label}</span>}
                              {count > 0 && (
                        <span className={cn("grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums", i.badge === "cases" ? "bg-rose-500/90 text-white" : "bg-brand-500 text-white", collapsed && "absolute right-1 top-0.5")}>
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button onClick={toggle} className="flex items-center gap-2 border-t border-white/5 px-5 py-3 text-xs text-slate-500 hover:text-slate-300">
        {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Contraer menú</>}
      </button>
    </aside>
  );
}
