# Informe de revisión UX — RevOps Assistant

**Fecha:** 2026-06-19
**Alcance:** renderer completo (shell + tema + 7 features). Solo diagnóstico; sin implementación.

## Veredicto

Base sólida: estados de carga/vacío/error presentes en casi todas las pantallas, marca Cloud District aplicada e i18n completo (es/ca/eu/en). Las mejoras se concentran en **feedback al usuario, consistencia de patrones y dos huecos de arquitectura de información**.

## Hallazgos prioritarios (alto impacto)

1. **No hay sistema global de feedback (Snackbar/toast).** El feedback de éxito es inline y fugaz: "Copiado" desaparece a los 2 s (`McpSettingsScreen`), el feedback se borra al cambiar de pestaña (`HubSpotConnectorScreen` L56-61), y un guardado correcto solo limpia el input sin confirmar (`GoogleCredentialsCard`, `HubSpotConnectorScreen`). Falta un provider de Snackbar reutilizable en el shell. → SPEC-0002.

2. **Acciones destructivas sin confirmación.** Borrar propiedad (`EntryPanel`), borrar origen (`OriginsModal` L127-129), borrar objeto (`ObjectPanel`) y **regenerar token MCP** (`McpSettingsScreen` L116, invalida toda sesión) se ejecutan a un clic. → ConfirmDialog compartido.

3. **Dashboard vacío.** La pantalla inicial al abrir proyecto es `SectionPlaceholder` ("placeholder"); igual CRM, Mapas y Reporting. Es lo primero que ve el usuario y no comunica nada. → Dashboard mínimo de estado (HubSpot/Drive/MCP conectados, nº cambios pendientes por área). SPEC nuevo.

4. **Campana de notificaciones no funcional.** En `TopBar` el `IconButton` no tiene `onClick`; solo pinta un punto cuando hay update. → Conectar a panel/UpdateBanner o retirar.

5. **Cambio de entorno production↔sandbox silencioso.** `TopBar` cambia de entorno sin confirmación ni feedback. Acción consecuente. → Confirmación + toast. SPEC-0003.

## Consistencia (medio impacto)

- **Empty states** dispares (unos con `Typography`, otros con `Alert`).
- **Ancho de panel lateral** inconsistente: 420 px (propiedades/objetos) vs 460 px (formularios).
- **Botón de acción principal**: `contained` vs `outlined` según pantalla, sin estándar.
- Falta **badge de estado** común.
- Filtros activos no visibles ni con botón "limpiar" (`FormsManagementScreen`, `PropertyManagementScreen`).
- `sourceField` es texto libre sin autocomplete, riesgo de typos (`EntryWizard` L408).
- `ObjectWizard`: 4 secciones sin stepper/indicador de progreso.

→ Extraer componentes compartidos: `EmptyState`, `ConfirmDialog`, `StatusBadge` + constantes de layout. SPEC-0002.

## Menor esfuerzo / higiene

- Accesibilidad puntual: iconos sin `aria-label` (`FolderIcon`, `SearchIcon`), cabeceras de tabla en `NewFormWizard`.
- IA del sidebar: Propiedades/Objetos/Formularios son hermanos visuales de CRM, no anidados; conviene indentarlos o que CRM sea solo grupo.
- **Código muerto:** `PropertiesTable.tsx` (vacío) → borrar.

## Priorización

| # | Mejora | Impacto | Esfuerzo | SPEC |
|---|--------|---------|----------|------|
| 1 | Snackbar global de feedback | Alto | Bajo | 0002 |
| 2 | ConfirmDialog en acciones destructivas | Alto | Bajo | 0005/06/07 |
| 4 | Campana: conectar o retirar | Medio | Muy bajo | 0002 |
| 5 | Confirmar cambio de entorno | Medio | Bajo | 0003 |
| 3 | Dashboard de estado | Alto | Medio | nuevo |
| 6 | Componentes compartidos (EmptyState/Confirm/Badge) | Medio | Medio | 0002 |
| 7 | Filtros visibles + limpiar | Medio | Bajo | 0006/08 |
| 8 | Accesibilidad + borrar código muerto | Bajo | Bajo | varios |

**Recomendación:** el bloque 1-2-4-5 + borrar código muerto es realizable ya, aislado y de bajo riesgo. El dashboard (3) es el de más valor pero requiere SPEC nuevo.
