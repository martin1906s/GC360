import {
  BarChart3, Bot, Boxes, BookOpenCheck, Briefcase, Building2, CalendarDays, Cog, FileStack, FileText, GraduationCap,
  Inbox, KanbanSquare, LayoutDashboard, Network, RefreshCcw, ShieldCheck, Sparkles, Users, Wallet, Workflow, type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/domain/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm: Permission;
  priority?: "P2";
  badge?: "inbox" | "approvals" | "cases";
}

export interface NavGroup {
  module: string;
  items: NavItem[];
}

/** Los 7 módulos de GC360 + capa transversal de IA (criterio 18). */
export const NAVIGATION: NavGroup[] = [
  { module: "Gerencial", items: [
    { label: "Inicio", href: "/", icon: LayoutDashboard, perm: "dashboard.view" },
    { label: "Analítica e informes", href: "/gerencial/analitica", icon: BarChart3, perm: "analytics.view" },
  ] },
  { module: "Comercial", items: [
    { label: "Bandeja omnicanal", href: "/bandeja", icon: Inbox, perm: "inbox.view", badge: "inbox" },
    { label: "Clientes y prospectos", href: "/crm/clientes", icon: Users, perm: "crm.view" },
    { label: "Pipeline comercial", href: "/comercial/pipeline", icon: KanbanSquare, perm: "crm.view" },
    { label: "Agenda", href: "/comercial/agenda", icon: CalendarDays, perm: "cases.view" },
    { label: "Red comercial", href: "/comercial/red", icon: Network, perm: "network.view", priority: "P2" },
  ] },
  { module: "Operativo", items: [
    { label: "Casos", href: "/casos", icon: Briefcase, perm: "cases.view", badge: "cases" },
    { label: "Pólizas", href: "/polizas", icon: FileText, perm: "policies.view" },
    { label: "Renovaciones y siniestros", href: "/renovaciones", icon: RefreshCcw, perm: "policies.view" },
  ] },
  { module: "Inteligencia artificial", items: [
    { label: "Asistente IA", href: "/ia/asistente", icon: Sparkles, perm: "ai.use" },
    { label: "Supervisión IA", href: "/ia/supervision", icon: ShieldCheck, perm: "ai.approve", badge: "approvals" },
    { label: "Automatizaciones", href: "/ia/automatizaciones", icon: Workflow, perm: "automations.edit" },
    { label: "Agentes IA", href: "/ia/agentes", icon: Bot, perm: "automations.edit" },
  ] },
  { module: "Financiero", items: [
    { label: "Cartera y comisiones", href: "/financiero", icon: Wallet, perm: "finance.view", priority: "P2" },
    { label: "Contabilidad y tesorería", href: "/erp/financiero", icon: FileStack, perm: "erp.view", priority: "P2" },
  ] },
  { module: "Administrativo", items: [
    { label: "RR. HH., compras e inventario", href: "/erp/administrativo", icon: Boxes, perm: "erp.view", priority: "P2" },
  ] },
  { module: "Academia", items: [
    { label: "Academia GC360", href: "/academia", icon: GraduationCap, perm: "academy.view", priority: "P2" },
  ] },
  { module: "Configuración", items: [
    { label: "Catálogo de seguros", href: "/config/seguros", icon: BookOpenCheck, perm: "config.edit" },
    { label: "Usuarios, roles y auditoría", href: "/config/usuarios", icon: Cog, perm: "audit.view" },
    { label: "Plataforma SaaS", href: "/config/saas", icon: Building2, perm: "saas.manage", priority: "P2" },
  ] },
];

export const QUICK_LINKS = NAVIGATION.flatMap((g) => g.items.map((i) => ({ ...i, module: g.module })));
