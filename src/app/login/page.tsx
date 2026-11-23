"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Bot, Building2, Check, Lock, Mail, MessagesSquare, ShieldCheck, Workflow } from "lucide-react";
import { useHydrated } from "@/hooks/use-data";
import { useDB } from "@/store/db";
import { useSession } from "@/store/session";
import { ROLE_META } from "@/domain/constants";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { FullscreenLoader } from "@/components/layout/guard";
import { cn, sleep } from "@/lib/utils";

const FEATURES = [
  { icon: MessagesSquare, title: "Comunicaciones unificadas", text: "WhatsApp, Gmail y Microsoft 365 en una sola bandeja con casos trazables." },
  { icon: Bot, title: "IA como motor de la operación", text: "Clasifica, extrae datos, propone y ejecuta solo lo autorizado." },
  { icon: Workflow, title: "Ciclo completo del bróker", text: "Solicitud → comparativo → póliza → cartera → renovación." },
  { icon: ShieldCheck, title: "SaaS multiempresa", text: "Datos, marcas y políticas aisladas por empresa." },
];

export default function LoginPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const tenants = useDB((s) => s.db.tenants);
  const users = useDB((s) => s.db.users);
  const login = useSession((s) => s.login);
  const [tenantId, setTenantId] = useState("t_gran");
  const tenantUsers = useMemo(() => users.filter((u) => u.tenantId === tenantId), [users, tenantId]);
  const [userId, setUserId] = useState("u_ger");
  const [loading, setLoading] = useState(false);
  const [recover, setRecover] = useState(false);
  const selected = users.find((u) => u.id === userId);

  useEffect(() => {
    if (!tenantUsers.find((u) => u.id === userId)) setUserId(tenantUsers[0]?.id);
  }, [tenantUsers, userId]);

  if (!hydrated) return <FullscreenLoader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    await sleep(650);
    login(selected.id, tenantId);
    toast.success(`Bienvenido(a), ${selected.name.split(" ")[0]}`, { description: `${ROLE_META[selected.role].label} · ${tenants.find((t) => t.id === tenantId)?.name}` });
    router.push(selected.role === "cliente" ? "/portal" : "/");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <section className="hidden flex-col border-r bg-ink-950 px-14 py-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md border border-white/20 font-mono text-xs font-semibold">GC</div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">GC360</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Plataforma empresarial</p>
          </div>
        </div>
        <div className="mt-auto max-w-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">CRM · Operación de seguros · IA · SaaS</p>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.15] tracking-tight">La operación completa de la agencia de seguros en un solo sistema.</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-400">Solicitudes, casos, cotizaciones multiaseguradora, pólizas, cartera y renovaciones, con agentes que proponen y ejecutan solo lo autorizado.</p>
          <dl className="mt-12 grid grid-cols-2 border-t border-white/10">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`border-b border-white/10 py-5 ${i % 2 === 0 ? "pr-6" : "border-l pl-6"}`}>
                <dt className="flex items-center gap-2 text-sm font-medium"><f.icon className="size-4 text-slate-400" />{f.title}</dt>
                <dd className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-10 text-[11px] text-slate-500">© 2026 GC360</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center bg-white px-6 py-10">
        <form onSubmit={submit} className="w-full max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-fg-muted">Selecciona la empresa y un perfil de demostración.</p>

          <p className="mb-2 mt-7 text-xs font-medium text-fg-muted">Empresa</p>
          <div className="grid grid-cols-2 gap-2.5">
            {tenants.map((t) => (
              <button type="button" key={t.id} onClick={() => setTenantId(t.id)} className={cn("relative rounded-lg border p-3 text-left transition", tenantId === t.id ? "border-brand-500 bg-brand-50/50 ring-4 ring-brand-500/10" : "hover:border-slate-300")}>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: t.brandColor }}>{t.initials}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="text-[11px] text-fg-muted">{t.city} · {t.plan}</p>
                  </div>
                </div>
                {tenantId === t.id && <Check className="absolute right-2 top-2 size-4 text-brand-600" />}
              </button>
            ))}
          </div>

          <p className="mb-2 mt-6 text-xs font-medium text-fg-muted">Perfil</p>
          <div className="grid max-h-[232px] gap-1.5 overflow-y-auto pr-1 scroll-thin">
            {tenantUsers.map((u) => (
              <button type="button" key={u.id} onClick={() => setUserId(u.id)} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition", userId === u.id ? "border-brand-500 bg-brand-50/50" : "hover:bg-slate-50")}>
                <Avatar name={u.name} color={u.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name} <span className="ml-1 text-[11px] font-normal text-fg-muted">· {ROLE_META[u.role].label}</span></p>
                  <p className="truncate text-[11px] text-fg-muted">{ROLE_META[u.role].description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <Field label="Correo">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                <Input className="pl-9" value={selected?.email ?? ""} readOnly />
              </div>
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                <Input className="pl-9" type="password" defaultValue="demo-gc360" />
              </div>
            </Field>
          </div>
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => setRecover(true)} className="text-xs font-medium text-brand-700 hover:underline">¿Olvidaste tu contraseña?</button>
          </div>

          <Button type="submit" size="lg" className="mt-5 w-full" loading={loading}>
            Ingresar a {tenants.find((t) => t.id === tenantId)?.name} <ArrowRight />
          </Button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-fg-subtle">
            <Building2 className="size-3" /> El rol y la empresa quedan visibles durante toda la sesión
          </p>
        </form>
      </section>

      <Modal open={recover} onClose={() => setRecover(false)} title="Recuperar contraseña" description="Te enviaremos un enlace para restablecerla." footer={<Button onClick={() => { setRecover(false); toast.success("Enlace de recuperación enviado"); }}>Enviar enlace</Button>}>
        <Field label="Correo corporativo"><Input defaultValue={selected?.email} /></Field>
      </Modal>
    </div>
  );
}
