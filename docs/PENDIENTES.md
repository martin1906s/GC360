# GC360 — Estado y pendientes

Última actualización: 23 nov 2026. Leer junto con [CLAUDE.md](../CLAUDE.md) (arquitectura y reglas) y [README.md](../README.md) (guion de la demo).

## Estado actual (verificado)
- `pnpm check` (typecheck + eslint) sin errores; `pnpm build` compila.
- Smoke test de 28 rutas a 1280 px y 1440 px: 0 errores de consola.
- Recorrido E2E (F01, F02, F03, F04, F08, F09 y portal del cliente): pasa. En la última corrida el paso F04 marcó `false` solo porque el script busca el texto viejo «Comisión de intermediación» (ahora el título es «Comisión»). El script ya está corregido.
- Scripts de prueba en `scripts/e2e/`: `smoke.js` (capturas de todas las rutas: `W=1280 node scripts/e2e/smoke.js`), `flow.js` (E2E con clics reales) y `debug.js` (reproducir errores contra `next dev -p 3361`). Requieren `pnpm add -D puppeteer-core@23`, Chrome instalado y el servidor en `http://localhost:3360` (`pnpm build && pnpm start -p 3360`). Las capturas se guardan junto al script. Están excluidos de eslint.

## Hecho en la última ronda (diseño y textos)
- DataTable: sin saltos de línea por defecto y nuevas props `hide` (por breakpoint), `wrap` y `align`.
- Columnas rediseñadas en Casos, Pólizas, Clientes y Cartera; Renovaciones pasó a ser una tabla real.
- Layouts con panel lateral pasan a 2 columnas solo en `2xl` (≥1536 px) cuando el contenido es tabular (Cartera, Renovaciones, Comparador, SaaS); en Caso, Cliente y Cotización el panel quedó en 300 px.
- Bandeja: el panel de contexto aparece a partir de `2xl`; por debajo se abre con «Detalles». «Crear caso» quedó en el encabezado.
- Topbar compacto (pill «Demo», nombre en una línea). Dashboard: KPIs en 3 columnas a 1280 px y embudo horizontal.
- Usuarios en tabla; encabezados de tarjeta centrados.
- Textos para usuario final: se quitaron los códigos RN-xx, GC-RF-xx y «criterio N», las etiquetas P2, los sufijos «(ficticia)» y «(demo)», las notas «simulado» y las tarjetas «En producción». Los módulos futuros ahora dicen «Próximamente».
- La clave de almacenamiento pasó a `gc360-db-v3` (los datos demo se recargan solos).

## Hecho en la última ronda (rutas, botones, responsive y textos)
- [x] Verificación de todas las rutas, botones y redirecciones: 27 páginas y 31 rutas dinámicas auditadas; todos los enlaces y acciones (onRowClick, Link href, router.push, modals) están conectados a sus destinos válidos.
- [x] Bandeja en móvil / tablet: implementada navegación responsiva apilada (lista completa en móvil → selección de conversación → pantalla de chat con botón «← Volver», drawer de «Detalles» y modal de «Crear caso»; a partir de `md` vista dividida y en `2xl` con panel de contexto).
- [x] Parámetro reactivo en Bandeja: `/bandeja?c=...` ahora actualiza reactivamente la conversación seleccionada al navegar desde casos o notificaciones.
- [x] Tablas manuales estilizadas con `whitespace-nowrap`, scroll horizontal suave y padding consistente: matriz de permisos, cartera en detalle de póliza, verificación de aislamiento de usuarios y personal administrativo en ERP.
- [x] Renovaciones: validado ancho `w-[40%]` con `max-w-0` y tooltip para títulos largos de bienes asegurados sin desbordes.
- [x] Textos y etiquetas internas depurados: se eliminaron referencias a «(simulado)» en notificaciones/seed, y «tenant» en la UI de login, topbar y SaaS fue reemplazado por lenguaje de usuario («Empresa»).
- [x] Aislamiento de Afiliados: se corrigió la regla `scopeRows` para incluir `policyId` en el ámbito de datos del afiliado (cuotas, pólizas y comisiones derivadas).
- [x] Compilación y tipado: `pnpm check` (tsc + eslint) pasa con 0 errores y 0 advertencias.

## Ronda 3: integraciones, ERP y Academia (23 nov 2026)
- **Integraciones** (`/config/integraciones`, menú Configuración). Asistentes por servicio:
  - Microsoft 365 y Gmail: autorizar cuenta → buzones → reglas → prueba.
  - WhatsApp: cuenta de Meta → webhook → plantillas → prueba.
  - Aseguradoras: método API, portal o correo por aseguradora, con prueba.
  - Facturación electrónica: proveedor → resolución DIAN → certificado → set de pruebas.
  - Pagos PSE.
  - El estado se guarda en el navegador (`gc360-demo:integrations-v1`). El indicador «Demo» de la barra superior lo refleja y enlaza a la configuración.
- **Contabilidad y tesorería** (`/erp/financiero?m=…`). Seis pantallas: facturación (emitir con CUFE), contabilidad (comprobantes y balance de prueba), conciliación (cargar extractos y reclamar diferencias), tesorería (bancos, flujo de caja y movimientos), cuentas por pagar (aprobación por monto) y recaudos.
- **Administración** (`/erp/administrativo?m=…`). Siete pantallas: RR. HH. (aprobar ausencias), nómina (liquidar y pagar), compras (flujo de requisición), proveedores, inventarios (entradas y salidas, alertas de stock), activos fijos (depreciación) y sedes (reservar salas).
- **Academia**: reproductor en `/academia/[curso]` con lecciones animadas, subtítulos, velocidad, adelantar y retroceder, pantalla completa, avance guardado, notas, recursos y evaluación que se habilita al terminar.
- Datos en `src/data/erp-demo.ts`; estado con `useDemoState` (`src/hooks/use-demo-state.ts`).
- Verificado: `pnpm check` y `pnpm build` OK; `scripts/e2e/new-modules.js` pasa con 0 errores de consola.

### Pendientes de esta ronda
- [ ] Volver a desplegar en Netlify para publicar estos cambios.
- [ ] Revisar a 1280 px las pestañas de ERP no capturadas en detalle (contabilidad, tesorería, recaudos, nómina, sedes).
- [ ] Academia: cuestionario propio por curso (hoy remite a la evaluación general).
- [ ] Integraciones: los identificadores y endpoints son de ejemplo; en producción vendrán de cada cliente.
- [ ] Llevar el estado de ERP al store principal (`useDB`) si se requiere auditoría de esas acciones.

## Ronda 4: teléfonos, nómina, ficha de empleados y KPI (24 nov 2026)
- **Teléfonos:** la barra superior desbordaba en todas las pantallas (el buscador no se encogía). Corregido junto con los hijos de grillas (`.grid > * { min-width: 0 }` en `@layer base`), los menús desplegables (fijos bajo la barra en teléfono), la bandeja, la agenda, Supervisión IA, el catálogo de seguros y el reproductor. Indicadores en 2 columnas en teléfono. Auditoría: `scripts/e2e/mobile-audit.js` (`W=340|390`) → 0 desbordes en todas las pantallas.
- **Nómina** (`src/components/erp/hr.tsx`): novedades (horas extra, comisiones, bonificaciones, incapacidades, descuentos) → liquidación → aprobar o rechazar cada pago con motivo, o aprobar en bloque → envío al banco solo de lo aprobado (referencia de dispersión). Incluye desprendible imprimible, historial de aprobaciones e indicadores. Solo aprueban Financiero y Gerencia.
- **Recursos humanos:** ficha del colaborador (información personal, seguridad social, cuenta bancaria, contrato e historial salarial, vacaciones, desempeño, documentos), distribución por área y 6 indicadores.
- **Indicadores:** resumen del módulo en Contabilidad y tesorería y en Administración (se puede hacer clic para ir a la pestaña), y nuevos indicadores en Contabilidad, Conciliación, Recaudos y Sedes. `useDemoState` sincroniza componentes que usan la misma clave.
- Corregido: el balance de prueba no cuadraba; se agregó la cuenta 3105 (débitos = créditos = $639,75 M).
- Verificado: tsc y eslint OK, build OK, `scripts/e2e/hr-payroll.js` pasa y aprobación desde teléfono OK, con 0 errores.

### Pendientes de esta ronda
- [ ] Commit y push a `main` para publicar en Netlify (incluye también los ajustes de teléfono de la ronda anterior).
- [ ] `pnpm check` falló una vez con el código 3221226505 (caída de Node en Windows al encadenar tsc + eslint); por separado pasan. Si se repite, ejecutarlos por separado.

## Pendientes de revisar visualmente
- [ ] Regenerar las capturas con `W=1280 node scripts/e2e/smoke.js` y `W=1440 …` (salen en `scripts/e2e/audit<ancho>/`) cuando se levante el servidor en el puerto 3360.
- [ ] Correr el flujo E2E interactivo completo con `node scripts/e2e/flow.js` sobre el servidor de pruebas.

## Pendientes funcionales / mejoras sugeridas
- [ ] Bandeja en móvil: navegación lista → conversación → detalles.
- [ ] Guardas por ruta además del menú: hoy cada página usa `<Guard>`; falta revisar con el perfil Afiliado cada pantalla accesible.
- [ ] Toggle de modo oscuro (los tokens están en `globals.css`; no hay tema oscuro definido).
- [ ] `AIChat`: respuestas con más intenciones (por aseguradora o por ramo) y mostrar gráficos simples en las respuestas.
- [ ] Notificaciones: marcar como leídas (hoy se recalculan, no se guardan).
- [ ] Agenda: vista calendario semanal.
- [ ] Propuesta PDF: generar un PDF real (hoy se usa `window.print`).
- [ ] Agregar `puppeteer-core` como devDependency (o migrar a Playwright) y correr `scripts/e2e` en CI.
- [ ] Despliegue para compartir la demo (por ejemplo Vercel). Los datos viven en el localStorage de cada navegador.

## Hacia producción (fuera del alcance del prototipo)
Backend NestJS + PostgreSQL con aislamiento por tenant; conectores Microsoft Graph, Gmail y WhatsApp Business API; orquestador LLM con RAG y herramientas con permisos; facturación electrónica; SSO + MFA; observabilidad. El detalle está en la sección 11 del documento de requerimientos.

## Problemas conocidos
- En Chrome reciente `scrollIntoView` devuelve una promesa: los `useEffect` deben ir siempre con llaves (ya corregido; regla documentada en CLAUDE.md).
- Si quedan procesos huérfanos de `next start` en el puerto 3360, el navegador carga chunks viejos (error «Failed to load chunk»). Hay que cerrar el proceso que ocupa el puerto antes de reiniciar.
- `pnpm` requirió instalar explícitamente los plugins de eslint (`eslint-plugin-react-hooks@5`, etc.) para que `pnpm lint` funcione.
