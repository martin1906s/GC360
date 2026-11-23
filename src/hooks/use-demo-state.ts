"use client";

import { useCallback, useEffect, useState } from "react";

/** Estado local persistido en el navegador para módulos de demostración (ERP, Academia, Integraciones). */
export function useDemoState<T>(key: string, initial: T) {
  const storageKey = `gc360-demo:${key}`;
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [storageKey]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(storageKey, JSON.stringify(v));
        } catch {
          /* almacenamiento no disponible */
        }
        return v;
      });
    },
    [storageKey],
  );

  return [value, update] as const;
}
