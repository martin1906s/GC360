# GC360 · Prototipo navegable

Plataforma empresarial inteligente (CRM + operación de seguros + IA + SaaS) — caso inicial **Gran Seguros**.
Prototipo funcional con flujos simulados de extremo a extremo, datos ficticios e integraciones demostrativas.

## Ejecutar

```bash
pnpm install
pnpm dev          # http://localhost:3000
# o en modo producción
pnpm build && pnpm start
```

En el login elige la empresa (Gran Seguros / Andes Corredores) y un perfil. Desde el menú de usuario puedes **cambiar de perfil** sin salir y **restablecer los datos demo**.

## Guion de demostración (recorridos F01–F09)

| # | Recorrido | Perfil | Dónde |
|---|-----------|--------|-------|
| F01 | WhatsApp → caso | Asesor (Andrés Gómez) | Bandeja → *Simular entrada → Cotizar vehículo* → *Crear caso* |
| F02 | Caso → solicitud multiaseguradora | Asesor | Caso → *Solicitar cotización* → *Extraer datos con IA* → registrar 3 ofertas (*Usar valores de ejemplo*) |
| F03 | Comparativo → selección → póliza | Asesor y Operaciones (Felipe Cardona) | Comparador → *Generar propuesta* → *Enviar* → *Registrar aceptación* → (Operaciones) *Registrar y validar póliza*. Cambia la prima para ver la detección de discrepancias |
| F04 | Póliza → cartera y comisión | Operaciones / Financiero | Detalle de póliza / *Cartera y comisiones* |
| F05 | Renovación programada | Operaciones | *Renovaciones* → *Iniciar renovación* (genera caso + borrador pendiente de aprobación) |
| F06 | Siniestro y atención humana | Cualquiera | Bandeja → *Reporte de siniestro* o *Pide un asesor humano*; caso CAS-2026-0006 |
| F07 | Asistente gerencial | Gerencia (Carolina Vélez) | *Asistente IA* → «Casos pendientes más de 48 horas» |
| F08 | Permisos y separación multiempresa | Admin / Andes | *Usuarios, roles y auditoría → Prueba de aislamiento*; abrir `/casos/k_3` con un usuario de Andes |
| F09 | Agente IA con autorización | Supervisor IA (Sebastián Mora) | *Supervisión IA* → revisar, editar, aprobar o rechazar |

Portal de cliente: perfil **Camilo Herrera** (Gran Seguros) o **Lucía Benavides** (Andes).

## Qué es real y qué es simulado

- **Real en el prototipo:** persistencia de datos (en el navegador), aislamiento por empresa y rol en la capa de servicios, auditoría inalterable, reglas de negocio (RN-01…RN-15), dictado por voz (Web Speech), exportación CSV e impresión PDF.
- **Simulado:** WhatsApp Business, Gmail, Microsoft 365, aseguradoras, facturación y el modelo LLM (motor determinista con la misma interfaz).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Recharts · Sonner · lucide-react.
Arquitectura y convenciones en [CLAUDE.md](CLAUDE.md).
