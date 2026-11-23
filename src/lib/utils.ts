import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, differenceInDays, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export const money = (v: number) => cop.format(Math.round(v || 0));
export const moneyShort = (v: number) => `$${compact.format(v || 0)}`;
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

export const fmtDate = (d?: string) => (d ? format(new Date(d), "dd MMM yyyy", { locale: es }) : "—");
export const fmtDateTime = (d?: string) => (d ? format(new Date(d), "dd MMM yyyy · HH:mm", { locale: es }) : "—");
export const fmtTime = (d: string) => format(new Date(d), "HH:mm");
export const fromNow = (d: string) => formatDistanceToNowStrict(new Date(d), { locale: es, addSuffix: true });
export const daysUntil = (d: string) => differenceInDays(new Date(d), new Date());
export const hoursSince = (d: string) => differenceInHours(new Date(), new Date(d));

export const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const nowISO = () => new Date().toISOString();
export const addHours = (h: number, base = new Date()) => new Date(base.getTime() + h * 3600_000).toISOString();
export const addDays = (d: number, base = new Date()) => new Date(base.getTime() + d * 86400_000).toISOString();

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(esc).join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");
}
