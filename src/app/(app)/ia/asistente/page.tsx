"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Database, Lock } from "lucide-react";
import { useCurrent } from "@/hooks/use-data";
import { ROLE_META } from "@/domain/constants";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { AIChat } from "@/components/ai/ai-chat";

export default function AssistantPage() {
  return <Guard perm="ai.use"><Suspense><Assistant /></Suspense></Guard>;
}

function Assistant() {
  const params = useSearchParams();
  const { user, tenant } = useCurrent();
  return (
    <div className="animate-fade-in">
      <PageHeader title={"Asistente IA"} description="Consulta casos, pólizas, cartera, comisiones y pipeline en lenguaje natural." />
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <Card className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
          <AIChat initialQuery={params.get("q") ?? undefined} />
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Tu acceso" icon={<Lock />} />
            <CardContent className="space-y-3 text-[13px]">
              <div className="flex justify-between"><span className="text-fg-muted">Empresa</span><b>{tenant?.name}</b></div>
              <div className="flex justify-between"><span className="text-fg-muted">Perfil</span>{user && <Badge tone={ROLE_META[user.role].tone}>{ROLE_META[user.role].label}</Badge>}</div>
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-fg-muted">Las respuestas incluyen solo la información a la que tienes acceso con tu perfil.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Información disponible" icon={<Database />} />
            <CardContent className="flex flex-wrap gap-1.5">
              {["Casos", "Clientes", "Pólizas", "Ofertas", "Cuotas", "Comisiones", "Oportunidades", "Siniestros"].map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
