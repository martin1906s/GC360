"use client";

import { useCallback, useEffect, useState } from "react";

const EVENT = "gc360-demo-state";

/**
 * Estado local persistido en el navegador para módulos de demostración (ERP, Academia, Integraciones).
 * Los componentes que usan la misma clave se mantienen sincronizados (p. ej. un resumen de KPIs y su pestaña).
 */
export function useDemoState<T>(key: string, initial: T) {
  const storageKey = `gc360-demo:${key}`;
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) setValue(JSON.parse(raw) as T);
      } catch {
        /* almacenamiento no disponible */
      }
    };
    read();
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === storageKey) read();
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
    };
  }, [storageKey]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(storageKey, JSON.stringify(v));
          queueMicrotask(() => window.dispatchEvent(new CustomEvent(EVENT, { detail: storageKey })));
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
