"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useCurrent } from "@/hooks/use-data";
import { PERMISSIONS, type Permission } from "@/domain/permissions";
import { ROLE_META } from "@/domain/constants";
import { buttonVariants } from "@/components/ui/button";

export function FullscreenLoader() {
  return (
    <div className="grid h-screen place-items-center bg-canvas">
      <div className="flex items-center gap-3 text-sm text-fg-muted">
        <Loader2 className="size-5 animate-spin text-brand-600" /> Cargando GC360…
      </div>
    </div>
  );
}

export function AccessDenied({ reason }: { reason: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-rose-50 text-rose-600">
        <ShieldAlert className="size-6" />
      </div>
      <h2 className="font-semibold">Acceso restringido</h2>
      <p className="mt-1 text-sm text-fg-muted">{reason}</p>
      <Link href="/" className={buttonVariants({ variant: "secondary", className: "mt-5" })}>
        Volver al inicio
      </Link>
    </div>
  );
}

/** Protege una vista por permiso de rol (la capa de servicios también lo valida). */
export function Guard({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { user, can } = useCurrent();
  if (!user) return null;
  if (!can(perm)) return <AccessDenied reason={`Tu perfil (${ROLE_META[user.role].label}) no tiene el permiso «${PERMISSIONS[perm]}».`} />;
  return <>{children}</>;
}

/** Registro inexistente o de otro tenant: mismo mensaje para no filtrar información (criterio 15). */
export function NotFoundInTenant({ entity }: { entity: string }) {
  return <AccessDenied reason={`El ${entity} no existe o pertenece a otra empresa.`} />;
}
