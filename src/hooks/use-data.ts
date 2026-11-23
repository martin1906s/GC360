"use client";

import { useEffect, useMemo, useState } from "react";
import { useDB } from "@/store/db";
import { useSession } from "@/store/session";
import { scopeRows } from "@/services/core";
import { can as canRole, type Permission } from "@/domain/permissions";
import type { ID, Row, TableName } from "@/domain/types";

/** Rehidrata los stores persistidos solo en el cliente (evita desajustes SSR). */
export function useHydrated() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    Promise.all([useDB.persist.rehydrate(), useSession.persist.rehydrate()]).then(() => setOk(true));
  }, []);
  return ok;
}

export function useCurrent() {
  const userId = useSession((s) => s.userId);
  const tenantId = useSession((s) => s.tenantId);
  const users = useDB((s) => s.db.users);
  const tenants = useDB((s) => s.db.tenants);
  return useMemo(() => {
    const user = users.find((u) => u.id === userId);
    const tenant = tenants.find((t) => t.id === tenantId);
    return { user, tenant, can: (p: Permission) => canRole(user?.role, p) };
  }, [users, tenants, userId, tenantId]);
}

/** Lectura reactiva con aislamiento de tenant y permisos aplicados. */
export function useScoped<T extends TableName>(table: T): Row<T>[] {
  const rows = useDB((s) => s.db[table]) as Row<T>[];
  const data = useDB((s) => s.db);
  const { user } = useCurrent();
  return useMemo(() => (user ? scopeRows(table, rows, user, data) : []), [rows, user, data, table]);
}

export function useRecord<T extends TableName>(table: T, id: ID | undefined): Row<T> | undefined {
  const rows = useScoped(table);
  return useMemo(() => rows.find((r) => (r as { id: ID }).id === id), [rows, id]);
}

/** Diccionarios de apoyo para resolver nombres (dentro del tenant actual). */
export function useLookups() {
  const { tenant } = useCurrent();
  const users = useDB((s) => s.db.users);
  const clients = useDB((s) => s.db.clients);
  const insurers = useDB((s) => s.db.insurers);
  const lines = useDB((s) => s.db.lines);
  const sellers = useDB((s) => s.db.sellers);
  return useMemo(() => {
    const t = tenant?.id;
    const m = <X extends { id: ID; tenantId: ID }>(xs: X[]) => new Map(xs.filter((x) => x.tenantId === t).map((x) => [x.id, x]));
    return { users: m(users), clients: m(clients), insurers: m(insurers), lines: m(lines), sellers: m(sellers) };
  }, [tenant, users, clients, insurers, lines, sellers]);
}
