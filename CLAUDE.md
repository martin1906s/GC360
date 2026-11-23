# GC360 — Prototipo funcional

Plataforma CRM/ERP con IA para una agencia intermediaria de seguros (Gran Seguros), preparada para SaaS multiempresa.
Pendientes y estado: [docs/PENDIENTES.md](docs/PENDIENTES.md).
Base documental: `../Requerimientos_Prototipo_GC360_Plataforma_IA_Seguros_SaaS.docx`, `../modulosprincipales.txt`, `../resumen.txt`, `../reunion.txt`.

## Comandos
- `pnpm dev` — desarrollo (http://localhost:3000)
- `pnpm build && pnpm start` — producción
- `pnpm check` — typecheck + eslint (lo ejecuta el hook Stop de `.claude/settings.json`)

## Arquitectura (capas, de adentro hacia afuera)
1. `src/domain/` — tipos de entidades (`types.ts`), catálogos/estados (`constants.ts`), matriz de permisos (`permissions.ts`). Sin dependencias de UI.
2. `src/data/seed.ts` — datos 100% ficticios, fechas relativas a la carga.
3. `src/store/` — Zustand persistido en localStorage: `db.ts` simula el backend transaccional; `session.ts` la sesión (usuario/tenant).
4. `src/services/` — reglas de negocio. **Toda escritura pasa por aquí**: `getCtx()` (tenant + usuario), `requirePerm()`, `scopeRows()` (aislamiento por tenant y rol, RN-09/RN-15) y `audit()` (RN-13). La UI nunca escribe directo en el store.
5. `src/ai/engine.ts` — motor IA determinista (clasificación, extracción, respuestas sugeridas, consultas NL, resumen de ofertas). Misma interfaz que tendría un orquestador LLM real.
6. `src/hooks/use-data.ts` — lecturas reactivas ya filtradas (`useScoped`, `useRecord`, `useLookups`).
7. `src/components/` — `ui/` (primitivas reutilizables), `domain/` (chips, modales de negocio), `layout/` (shell, guardas, búsqueda Ctrl+K, asistente lateral), `charts/`, `ai/`.
8. `src/app/` — rutas. `(app)/` = consola interna con guarda de sesión; `portal/` = cliente; `login/`.

## Reglas al modificar
- Acciones con impacto económico, contractual o documental → `createAIAction({ sensitive: true })`, nunca ejecución directa (RN-08, GC-RF-39).
- Ninguna integración externa es real: mostrar `<DemoTag />` donde aplique (criterio 17).
- Registros de otra empresa deben responder con `<NotFoundInTenant />`.
- Estilo visual corporativo sobrio: paleta `brand` (azul marino) + `ink`, IBM Plex Sans, sin degradados decorativos, sin emojis en textos del sistema, radios `rounded-lg` como máximo en tarjetas.
- Tablas: usar `DataTable` con `hide` por breakpoint (el área útil a 1280 px es ~960 px por el menú lateral). Nunca dejar que las celdas se partan en varias líneas.
- Textos: lenguaje de usuario final. Nada de códigos RN/GC-RF, «P2», «simulado» ni explicaciones técnicas en la interfaz.
- Gráficos: paleta `SERIES` de `components/charts/chart-kit.tsx` en orden fijo, un solo eje Y, tooltip siempre.
- Efectos de React: siempre con llaves (`useEffect(() => { ... })`); `scrollIntoView` devuelve promesa en Chrome reciente.
