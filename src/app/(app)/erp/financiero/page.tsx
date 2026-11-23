"use client";

import { Banknote, BookText, FileCheck2, Landmark, Receipt, Scale } from "lucide-react";
import { Guard } from "@/components/layout/guard";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ExpansionGrid } from "@/components/domain/expansion";

export default function ErpFinancePage() {
  return (
    <Guard perm="erp.view">
      <PageHeader title={<span className="flex items-center gap-2">Módulo financiero <Badge tone="slate">Próximamente</Badge></span>} description="Contabilidad, facturación electrónica, tesorería, conciliación y cuentas por pagar." />
      <ExpansionGrid modules={[
        { icon: Receipt, title: "Facturación electrónica", phase: "Fase 2", description: "Emisión de facturas de comisión a aseguradoras con validación ante la autoridad tributaria.", features: ["Factura por comisión liquidada", "Notas crédito y débito", "Integración con proveedor tecnológico autorizado"] },
        { icon: BookText, title: "Contabilidad", phase: "Fase 2", description: "Causación automática de comisiones, gastos y nómina.", features: ["Plan de cuentas configurable", "Comprobantes automáticos desde pólizas", "Estados financieros"] },
        { icon: Scale, title: "Conciliación", phase: "Fase 2", description: "Cruce entre comisiones esperadas y pagos recibidos de aseguradoras.", features: ["Carga de extractos de aseguradoras", "Detección de diferencias", "Propuesta IA de ajustes con aprobación"] },
        { icon: Landmark, title: "Tesorería", phase: "Fase 2", description: "Flujo de caja, bancos y proyección de ingresos por comisiones.", features: ["Saldos bancarios", "Proyección por renovaciones", "Alertas de liquidez"] },
        { icon: Banknote, title: "Cuentas por pagar", phase: "Fase 2", description: "Pagos a proveedores y comisiones de la red comercial.", features: ["Liquidación de afiliados", "Programación de pagos", "Aprobaciones por monto"] },
        { icon: FileCheck2, title: "Recaudos", phase: "Fase 2", description: "Seguimiento de recaudo de primas cuando la agencia recauda por cuenta de la aseguradora.", features: ["Medios de pago", "Aplicación de pagos a cuotas", "Recordatorios automáticos"] },
      ]} />
    </Guard>
  );
}
