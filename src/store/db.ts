"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createSeed } from "@/data/seed";
import type { Database, ID, Row, TableName } from "@/domain/types";

/**
 * Repositorio persistente que simula el backend transaccional (PostgreSQL en producción).
 * Solo la capa de servicios (`src/services`) debería escribir aquí.
 */
interface DBState {
  db: Database;
  seededAt: string;
  insert: <T extends TableName>(table: T, row: Row<T>) => void;
  update: <T extends TableName>(table: T, id: ID, patch: Partial<Row<T>>) => void;
  remove: <T extends TableName>(table: T, id: ID) => void;
  updateTenant: (id: ID, patch: Partial<Database["tenants"][number]>) => void;
  reset: () => void;
}

export const useDB = create<DBState>()(
  persist(
    (set) => ({
      db: createSeed(),
      seededAt: new Date().toISOString(),
      insert: (table, row) =>
        set((s) => ({ db: { ...s.db, [table]: [row, ...(s.db[table] as unknown[])] } })),
      update: (table, id, patch) =>
        set((s) => ({
          db: {
            ...s.db,
            [table]: (s.db[table] as { id: ID }[]).map((r) => (r.id === id ? { ...r, ...patch } : r)),
          },
        })),
      remove: (table, id) =>
        set((s) => ({ db: { ...s.db, [table]: (s.db[table] as { id: ID }[]).filter((r) => r.id !== id) } })),
      updateTenant: (id, patch) =>
        set((s) => ({ db: { ...s.db, tenants: s.db.tenants.map((t) => (t.id === id ? { ...t, ...patch } : t)) } })),
      reset: () => set({ db: createSeed(), seededAt: new Date().toISOString() }),
    }),
    {
      name: "gc360-db-v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const db = () => useDB.getState().db;
