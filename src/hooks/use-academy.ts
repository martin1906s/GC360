"use client";

import { useMemo } from "react";
import { COURSES, type Course } from "@/data/erp-demo";
import { useDemoState } from "./use-demo-state";

/** Lecciones completadas iniciales según el progreso de ejemplo de cada curso. */
const initialDone = () =>
  Object.fromEntries(COURSES.flatMap((c) => c.lessons.slice(0, Math.round((c.progress / 100) * c.lessons.length)).map((l) => [l.id, true])));

export function useAcademy() {
  const [done, setDone] = useDemoState<Record<string, boolean>>("academy-v1", initialDone());
  const progress = useMemo(() => {
    const pct = (c: Course) => Math.round((c.lessons.filter((l) => done[l.id]).length / c.lessons.length) * 100);
    return Object.fromEntries(COURSES.map((c) => [c.id, pct(c)]));
  }, [done]);
  const complete = (lessonId: string) => setDone((d) => ({ ...d, [lessonId]: true }));
  return { done, progress, complete };
}
