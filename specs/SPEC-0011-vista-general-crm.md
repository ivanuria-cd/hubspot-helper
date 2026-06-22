# SPEC-0011 — Vista General de CRM

**Estado:** IMPLEMENTADO
**Branch:** feat/spec-0011-vista-general-crm
**Fecha:** 2026-06-19
**Depende de:** SPEC-0002, SPEC-0006, SPEC-0007, SPEC-0008, SPEC-0010

---

## 1. Objetivo

Sustituir el placeholder de la ruta `crm` (`/project/:id/crm`, hoy `SectionPlaceholder`) por una **vista general de CRM**: un hub análogo al Dashboard (SPEC-0010) pero acotado al CRM, que muestre de un vistazo el estado de las tres áreas —Propiedades, Objetos custom, Formularios— y dé acceso directo a cada una.

**Origen:** decisión de producto tras implementar el Dashboard — la entrada «CRM» del menú no debe llevar a una pantalla vacía.

---

## 2. Contexto y decisiones de diseño

- **Solo lectura.** Agrega datos de fuentes ya existentes; no crea endpoints de escritura ni lógica de negocio. Enlaza a las features, no las duplica.
- **Relación con el Dashboard (SPEC-0010):** el Dashboard es del proyecto entero (conectores + pendientes). La Vista de CRM se centra en las tres áreas de CRM y añade el **total de elementos** por área además de los **pendientes**. Para evitar duplicar lógica, reutiliza el hook de agregación (se extrae/extiende `useDashboardStatus` o se crea `useCrmOverview` que comparte las mismas llamadas IPC).
- Marca CD y AA igual que SPEC-0010 (estado por texto + color).
- Feature en `renderer/features/crm-overview/` (atómica). No importa de otras features; lee vía IPC.

---

## 3. Interfaz de usuario

```
┌──────────────────────────────────────────────────────────────┐
│  CRM — <Proyecto>                                              │
│                                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ Propiedades│ │ Objetos    │ │ Formularios│                 │
│  │ 128 totales│ │ 4 objetos  │ │ 12 forms   │                 │
│  │ 3 pendientes│ │ 1 pendiente│ │ Al día     │                 │
│  │ [Abrir →]  │ │ [Abrir →]  │ │ [Abrir →]  │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
│                                                                │
│  (si HubSpot no está conectado: aviso + enlace a Configurar)   │
└──────────────────────────────────────────────────────────────┘
```

- Cada tarjeta: título del área, total de elementos, nº de cambios pendientes (o «Al día»), botón «Abrir» que navega a la pantalla de la feature.
- Si HubSpot no está conectado, se muestra un aviso con enlace a `config/connectors/hubspot` (las áreas de CRM no tienen datos sin portal).

---

## 4. Modelo de datos / contratos

Fuentes reutilizadas (ya existentes), en paralelo:

- Propiedades: `entriesList({ projectId })` → total = nº entradas; pendientes = suma de `pendingChanges`.
- Objetos custom: `objectsListSchemas({ projectId })` → total = nº definiciones; pendientes = suma de `pendingChanges`.
- Formularios: `formsList({ projectId })` → total; `formsPendingChanges({ projectId })` → pendientes.
- Estado de HubSpot: `hubspotGetStatus(projectId)` para el aviso de «no conectado».

Hook `useCrmOverview(projectId)` (o extensión de `useDashboardStatus`) que expone `{ areas: { properties, objects, forms: { total, pending } }, hubspotConnected, loading, error }`. Sin nuevos canales IPC.

---

## 5. Implementación — tareas atómicas

1. Feature `renderer/features/crm-overview/`: `CrmOverviewScreen`, hook de agregación, `index.ts`.
2. `router.tsx`: ruta `crm` → `CrmOverviewScreen` (sustituye el placeholder).
3. i18n `crm.*` (es canónico + ca/eu/en).
4. Tutorial `doc/tutoriales/crm/es/vista-general-crm.md` (+ traducciones por SPEC-0009).
5. README de la feature.
6. Commit `feat(crm): vista general de CRM`.

---

## 6. Tests requeridos

- Unit del hook: agrega totales + pendientes de las tres áreas con IPC mockeado; maneja error/loading; flag `hubspotConnected`.
- Unit `CrmOverviewScreen.spec.tsx`: render con datos; aviso cuando HubSpot no conectado; «Al día» cuando pending = 0; «Abrir» navega.
- a11y: estado por texto + color, navegación por teclado.

---

## 7. Scopes / permisos

Ninguno nuevo.

## 8. Consideraciones de seguridad

Solo lectura de estado ya expuesto al renderer. No muestra secretos.

## 9. Documentación de usuario

- `doc/tutoriales/crm/es/vista-general-crm.md` (canónico).

## 10. Criterios de aceptación

- [ ] La ruta `crm` muestra la vista general (no el placeholder).
- [ ] Las tres tarjetas reflejan total y pendientes reales y enlazan a su feature.
- [ ] Aviso + enlace a Configurar cuando HubSpot no está conectado.
- [ ] Cumple AA y marca CD.
- [ ] `npm run typecheck` y `npm run test:unit` en verde.

---

## 11. Registro de implementación (2026-06-19)

- Feature `renderer/features/crm-overview/`: `useCrmOverview` (agrega total + pendientes de las tres áreas + flag `hubspotConnected`, solo lectura), `CrmOverviewScreen` (tarjetas por área con total/pendientes/«Abrir», aviso + enlace a Configurar si HubSpot no conectado, estados loading/error), `index.ts`, `README.md`.
- `router.tsx`: ruta `crm` → `CrmOverviewScreen` (sustituye el placeholder).
- i18n `crm.*` y `help.features.crm` en los cuatro locales.
- Tutorial `doc/tutoriales/crm/es/vista-general-crm.md` (canónico; `ca`/`eu`/`en` por SPEC-0009).
- Tests `useCrmOverview.spec.ts` (3) y `CrmOverviewScreen.spec.tsx` (2) en verde.
- **Decisión:** hook propio `useCrmOverview` (no se entrelaza con `useDashboardStatus`) para no acoplar Dashboard y CRM; comparten solo los canales IPC.
- **Verificación:** `npm run typecheck` y `eslint` en verde. Suite unitaria completa pendiente en máquina.

## 12. Adopción del patrón de estados de carga (SPEC-0002 §17) (BORRADOR, 2026-06-22)

`CrmOverviewScreen` reconvierte sus estados loading/error (§11) al patrón unificado de SPEC-0002 §17:
`LoadingState` (variante `cards`) con `aria-busy` mientras `useCrmOverview` resuelve total + pendientes de las
tres áreas, y reset al cambiar de proyecto. Pendiente de implementación junto al resto de superficies.
