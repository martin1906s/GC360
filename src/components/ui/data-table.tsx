"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./misc";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  className?: string;
  /** Oculta la columna por debajo del breakpoint indicado en lugar de comprimir la tabla. */
  hide?: "md" | "lg" | "xl" | "2xl";
  /** Permite saltos de línea en la celda (por defecto todo va en una línea). */
  wrap?: boolean;
  align?: "right";
  /** @deprecated usa `hide: "md"` */
  hideOnMobile?: boolean;
}

const HIDE: Record<NonNullable<Column<unknown>["hide"]>, string> = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};
const vis = <T,>(c: Column<T>) => (c.hide ? HIDE[c.hide] : c.hideOnMobile ? HIDE.md : "");

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  search?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  pageSize?: number;
  empty?: ReactNode;
  dense?: boolean;
}

/** Tabla genérica con búsqueda, ordenamiento y paginación. */
export function DataTable<T>({ rows, columns, rowKey, onRowClick, search, searchPlaceholder = "Buscar…", toolbar, pageSize = 12, empty, dense }: Props<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let xs = rows;
    if (q && search) {
      const n = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      xs = xs.filter((r) => search(r).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(n));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sort) xs = [...xs].sort((a, b) => (col.sort!(a) > col.sort!(b) ? sort.dir : -sort.dir));
    }
    return xs;
  }, [rows, q, search, sort, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div>
      {(search || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          {search && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-lg border bg-white pl-8 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              />
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div>
        </div>
      )}
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/60 text-left">
              {columns.map((c) => (
                <th key={c.key} className={cn("whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted first:pl-5 last:pr-5", c.align === "right" && "text-right", vis(c), c.className)}>
                  {c.sort ? (
                    <button className="inline-flex items-center gap-1 hover:text-fg" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
                      {c.header}
                      <ArrowUpDown className="size-3 opacity-60" />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.map((r) => (
              <tr key={rowKey(r)} onClick={() => onRowClick?.(r)} className={cn("border-b last:border-0 transition", onRowClick && "cursor-pointer hover:bg-brand-50/40")}>
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 align-middle first:pl-5 last:pr-5", dense ? "py-2" : "py-2.5", !c.wrap && "whitespace-nowrap", c.align === "right" && "text-right tabular-nums", vis(c), c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {current.length === 0 && (empty ?? <EmptyState title="Sin resultados" description="Ajusta los filtros o la búsqueda." />)}
      </div>
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-fg-muted">
          <span>
            {page * pageSize + 1}–{Math.min(filtered.length, (page + 1) * pageSize)} de {filtered.length}
          </span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-40">
              <ChevronLeft className="size-4" />
            </button>
            <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-40">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
