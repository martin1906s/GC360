"use client";

import { Boxes, Building, ClipboardList, Laptop, Truck, Users, Wallet } from "lucide-react";
import { Guard } from "@/components/layout/guard";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { ExpansionGrid } from "@/components/domain/expansion";

const STAFF = [
  ["Laura Méndez", "Administradora de plataforma", "Tecnología", "Activo"],
  ["Carolina Vélez", "Gerente general", "Gerencia", "Activo"],
  ["Andrés Gómez", "Asesor comercial senior", "Comercial", "Activo"],
  ["Valentina Ríos", "Asesora comercial", "Comercial", "Vacaciones"],
  ["Felipe Cardona", "Analista de operaciones", "Operaciones", "Activo"],
  ["Natalia Ospina", "Coordinadora de cartera", "Financiero", "Activo"],
];

export default function ErpAdminPage() {
  return (
    <Guard perm="erp.view">
      <PageHeader title={<span className="flex items-center gap-2">Módulo administrativo <Badge tone="slate">Próximamente</Badge></span>} description="Recursos humanos, nómina, compras, proveedores, inventarios y activos." />
      <Card className="mb-5">
        <CardHeader title="Personal" icon={<Users />} />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-fg-muted">
                <th className="px-5 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Cargo</th>
                <th className="px-4 py-2.5">Área</th>
                <th className="px-5 py-2.5 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {STAFF.map((r) => (
                <tr key={r[0]} className="border-b last:border-0 whitespace-nowrap">
                  <td className="px-5 py-2.5 font-medium">{r[0]}</td>
                  <td className="px-4 py-2.5 text-fg-muted">{r[1]}</td>
                  <td className="px-4 py-2.5">{r[2]}</td>
                  <td className="px-5 py-2.5 text-right"><Badge tone={r[3] === "Activo" ? "green" : "amber"}>{r[3]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ExpansionGrid modules={[
        { icon: Users, title: "Recursos humanos", phase: "Fase 3", description: "Hojas de vida, contratos, vacaciones y evaluaciones de desempeño.", features: ["Expediente digital", "Solicitudes de ausencia", "Evaluación por indicadores comerciales"] },
        { icon: Wallet, title: "Nómina", phase: "Fase 3", description: "Liquidación de nómina con integración contable.", features: ["Novedades y horas extra", "Seguridad social", "Nómina electrónica"] },
        { icon: ClipboardList, title: "Compras", phase: "Fase 3", description: "Requisiciones, órdenes de compra y aprobaciones.", features: ["Flujo de aprobación por monto", "Comparación de cotizaciones", "Recepción"] },
        { icon: Truck, title: "Proveedores", phase: "Fase 3", description: "Registro, evaluación y documentos de proveedores.", features: ["Documentación obligatoria", "Calificación", "Historial de pagos"] },
        { icon: Boxes, title: "Inventarios", phase: "Fase 3", description: "Papelería, material POP y elementos de oficina.", features: ["Entradas y salidas", "Stock mínimo", "Centros de costo"] },
        { icon: Laptop, title: "Activos fijos", phase: "Fase 3", description: "Control de equipos y depreciación.", features: ["Asignación a empleados", "Mantenimientos", "Depreciación contable"] },
        { icon: Building, title: "Sedes", phase: "Fase 3", description: "Administración de oficinas y puntos de atención.", features: ["Contratos de arriendo", "Servicios", "Reservas de salas"] },
      ]} />
    </Guard>
  );
}
