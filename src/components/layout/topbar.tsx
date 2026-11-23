"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, Bell, Building2, Check, ChevronDown, LogOut, Menu as MenuIcon, PlugZap, RotateCcw, Search, ShieldCheck, BotMessageSquare, UserCog,
} from "lucide-react";
import { useCurrent, useScoped } from "@/hooks/use-data";
import { useSession } from "@/store/session";
import { useDB } from "@/store/db";
import { ROLE_META } from "@/domain/constants";
import { NAVIGATION } from "@/config/navigation";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuItem, MenuLabel, MenuSep } from "@/components/ui/menu";
import { Modal, Sheet } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn, fromNow } from "@/lib/utils";

export function Topbar() {
  const { user, tenant, can } = useCurrent();
  const router = useRouter();
  const path = usePathname();
  const login = useSession((s) => s.login);
  const logout = useSession((s) => s.logout);
  const setCopilot = useSession((s) => s.setCopilot);
  const setCommand = useSession((s) => s.setCommand);
  const reset = useDB((s) => s.reset);
  const allUsers = useDB((s) => s.db.users);
  const tenants = useDB((s) => s.db.tenants);
  const actions = useScoped("aiActions");
  const cases = useScoped("cases");
  const convs = useScoped("conversations");
  const [integrations, setIntegrations] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const notifications = useMemo(() => {
    const items: { id: string; title: string; detail: string; href: string; tone: "amber" | "red" | "blue"; at: string }[] = [];
    if (can("ai.approve"))
      actions.filter((a) => a.status === "pendiente").forEach((a) => items.push({ id: a.id, title: "Acción IA por aprobar", detail: a.title, href: "/ia/supervision", tone: "amber", at: a.createdAt }));
    cases
      .filter((c) => !["resuelto", "cerrado"].includes(c.status) && new Date(c.dueAt) < new Date() && (user?.role === "gerencia" || user?.role === "admin" || c.assigneeId === user?.id))
      .forEach((c) => items.push({ id: c.id, title: `SLA vencido · ${c.code}`, detail: c.title, href: `/casos/${c.id}`, tone: "red", at: c.dueAt }));
    if (can("inbox.view"))
      convs.filter((c) => c.unread > 0).forEach((c) => items.push({ id: c.id, title: `Mensaje nuevo · ${c.contactName}`, detail: c.channel, href: `/bandeja?c=${c.id}`, tone: "blue", at: c.lastMessageAt }));
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [actions, cases, convs, user, can]);

  if (!user || !tenant) return null;

  const switchTo = (id: string) => {
    const u = allUsers.find((x) => x.id === id)!;
    login(u.id, u.tenantId);
    toast.success(`Sesión de demostración: ${u.name}`, { description: `${ROLE_META[u.role].label} · ${tenants.find((t) => t.id === u.tenantId)?.name}` });
    router.push(u.role === "cliente" ? "/portal" : "/");
  };

  return (
    <header className="no-print sticky top-0 z-30 border-b bg-white/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <button className="rounded-md p-1.5 text-fg-muted hover:bg-slate-100 lg:hidden" onClick={() => setMobileNav(true)}>
          <MenuIcon className="size-5" />
        </button>

        <button onClick={() => setCommand(true)} className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-slate-50/70 px-3 text-sm text-fg-subtle transition hover:border-slate-300 hover:bg-white">
          <Search className="size-4" />
          <span className="flex-1 truncate text-left">Buscar cliente, caso, póliza, placa…</span>
          <kbd className="hidden rounded border bg-white px-1.5 text-[10px] font-medium text-fg-muted sm:block">Ctrl K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setIntegrations(true)} title="Estado de integraciones" className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 md:flex">
            <PlugZap className="size-3.5" /> <span className="2xl:hidden">Demo</span><span className="hidden 2xl:inline">Entorno de demostración</span>
          </button>

          {can("ai.use") && (
            <Button variant="secondary" size="sm" onClick={() => setCopilot(true)} className="hidden shrink-0 sm:inline-flex">
              <BotMessageSquare /> <span className="hidden lg:inline">Asistente IA</span>
            </Button>
          )}

          <Menu
            width="w-80"
            trigger={() => (
              <button className="relative rounded-lg p-2 text-fg-muted hover:bg-slate-100">
                <Bell className="size-[18px]" />
                {notifications.length > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{notifications.length}</span>}
              </button>
            )}
          >
            {(close) => (
              <div>
                <MenuLabel>Notificaciones internas</MenuLabel>
                <div className="max-h-80 overflow-y-auto scroll-thin">
                  {notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-fg-muted">Sin pendientes </p>}
                  {notifications.slice(0, 12).map((n) => (
                    <Link key={n.id + n.title} href={n.href} onClick={close} className="flex gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50">
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", n.tone === "red" ? "bg-rose-500" : n.tone === "amber" ? "bg-amber-500" : "bg-brand-500")} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{n.title}</p>
                        <p className="truncate text-xs text-fg-muted">{n.detail}</p>
                        <p className="text-[10px] text-fg-subtle">{fromNow(n.at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Menu>

          <Menu
            width="w-80"
            trigger={(open) => (
              <button className={cn("flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100", open && "bg-slate-100")}>
                <Avatar name={user.name} color={user.color} size="sm" />
                <div className="hidden whitespace-nowrap text-left leading-tight xl:block">
                  <p className="text-[13px] font-medium">{user.name}</p>
                  <p className="text-[11px] text-fg-muted">{ROLE_META[user.role].label}</p>
                </div>
                <ChevronDown className="size-3.5 text-fg-subtle" />
              </button>
            )}
          >
            {(close) => (
              <div>
                <div className="flex items-center gap-3 px-2.5 py-2">
                  <Avatar name={user.name} color={user.color} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-fg-muted">{user.email}</p>
                  </div>
                </div>
                <div className="mx-2.5 mb-1 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-fg-muted">
                  <Building2 className="size-3.5" /> Empresa: <b className="text-fg">{tenant.name}</b>
                </div>
                <MenuSep />
                <MenuLabel>Cambiar perfil de demostración</MenuLabel>
                <div className="max-h-64 overflow-y-auto scroll-thin">
                  {tenants.map((t) => (
                    <div key={t.id}>
                      <p className="px-2.5 pt-1.5 text-[10px] font-medium text-fg-subtle">{t.name}</p>
                      {allUsers.filter((u) => u.tenantId === t.id).map((u) => (
                        <MenuItem key={u.id} active={u.id === user.id} onClick={() => { close(); switchTo(u.id); }} icon={u.id === user.id ? <Check /> : <UserCog />} hint={ROLE_META[u.role].label.split(" ")[0]}>
                          {u.name}
                        </MenuItem>
                      ))}
                    </div>
                  ))}
                </div>
                <MenuSep />
                <MenuItem icon={<RotateCcw />} onClick={() => { close(); reset(); toast.success("Datos de demostración restablecidos"); }}>Restablecer datos demo</MenuItem>
                <MenuItem icon={<LogOut />} danger onClick={() => { logout(); router.push("/login"); }}>Cerrar sesión</MenuItem>
              </div>
            )}
          </Menu>
        </div>
      </div>

      <IntegrationsModal open={integrations} onClose={() => setIntegrations(false)} />

      <Sheet open={mobileNav} onClose={() => setMobileNav(false)} title="GC360" description={tenant.name} width="max-w-xs">
        <nav className="space-y-4">
          {NAVIGATION.map((g) => {
            const items = g.items.filter((i) => can(i.perm));
            if (!items.length) return null;
            return (
              <div key={g.module}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{g.module}</p>
                {items.map((i) => (
                  <Link key={i.href} href={i.href} onClick={() => setMobileNav(false)} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm", path === i.href ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50")}>
                    <i.icon className="size-4" /> {i.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
      </Sheet>
    </header>
  );
}

const INTEGRATIONS = [
  { name: "WhatsApp Business", status: "demo", detail: "Conversaciones de prueba. Los mensajes no se envían al cliente." },
  { name: "Microsoft 365 / Outlook", status: "demo", detail: "Bandeja de correo de prueba." },
  { name: "Gmail / Google Workspace", status: "demo", detail: "Bandeja de correo de prueba." },
  { name: "Aseguradoras", status: "demo", detail: "Las ofertas se registran manualmente en el caso." },
  { name: "Facturación electrónica", status: "demo", detail: "Disponible próximamente." },
  { name: "Datos y auditoría", status: "real", detail: "Toda la información y el historial de cambios se guardan." },
  { name: "Dictado por voz", status: "real", detail: "Disponible en la configuración de agentes IA." },
  { name: "Exportación a Excel y PDF", status: "real", detail: "Disponible en tablas, informes y propuestas." },
];

function IntegrationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Canales e integraciones" description="Estado de conexión de los servicios en este entorno.">
      <div className="divide-y rounded-lg border">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-start gap-3 px-4 py-3">
            {i.status === "real" ? <ShieldCheck className="mt-0.5 size-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-4 text-amber-500" />}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{i.name}</p>
                {i.status === "real" ? <Badge tone="green">Conectado</Badge> : <Badge tone="amber">Modo demostración</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-fg-muted">{i.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
