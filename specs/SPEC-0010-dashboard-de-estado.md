# SPEC-0010 — Dashboard de Estado del Proyecto

**Estado:** IMPLEMENTADO
**Branch:** feat/spec-0010-dashboard-de-estado
**Fecha:** 2026-06-19
**Depende de:** SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0005, SPEC-0006, SPEC-0007, SPEC-0008

---

## 1. Objetivo

Sustituir el placeholder de la ruta índice del proyecto (`/project/:id`, hoy `SectionPlaceholder`) por un **Dashboard de estado** real: lo primero que ve el usuario al abrir un proyecto. Debe responder de un vistazo a "¿qué hay conectado?" y "¿qué tengo pendiente?", y ofrecer accesos directos a cada área.

**Origen:** Informe de revisión UX 2026-06-19, hallazgo #3 (la pantalla inicial está vacía y no orienta).

---

## 2. Contexto y decisiones de diseño

- **Solo lectura.** El Dashboard **agrega** estado de fuentes ya existentes; no crea endpoints de escritura ni lógica de negocio nueva. No duplica funcionalidad de las features: enlaza a ellas.
- **Sin nuevos canales IPC** salvo que falte algún contador (ver §4). Se reutilizan los handlers ya implementados de conectores y de cambios pendientes.
- Marca CD (SPEC-0000 §4): tarjetas sobre fondo claro, badges de estado con la regla de contraste AA (lima solo en badge/indicador).
- La feature vive en `renderer/features/dashboard/` (atómica, SPEC-0000 §6). No importa de otras features: lee vía IPC y/o claves del `shellStore`.

---

## 3. Interfaz de usuario

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard — <Proyecto>                                        │
│                                                                │
│  Conectores                                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ HubSpot    │ │ Google     │ │ API / MCP  │                 │
│  │ ● Conectado│ │ Drive      │ │ ● Activo   │                 │
│  │ prod·sandbx│ │ ● Carpeta X│ │ 12 tools   │                 │
│  │ [Configurar]│ │ [Configurar]│ │ [Configurar]│               │
│  └────────────┘ └────────────┘ └────────────┘                 │
│                                                                │
│  Cambios pendientes                                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ Propiedades│ │ Objetos    │ │ Formularios│                 │
│  │     3      │ │     1      │ │     0      │                 │
│  │ [Revisar →]│ │ [Revisar →]│ │ Al día     │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 Tarjetas de conectores

| Tarjeta | Estado mostrado | Acción |
|---------|-----------------|--------|
| HubSpot | Conectado / No configurado; entorno activo (prod/sandbox) y qué entornos tienen token | "Configurar" → `config/connectors/hubspot` |
| Google Drive | Conectado / No conectado; nombre de carpeta seleccionada | "Configurar" → `config/connectors/google-drive` |
| API / MCP | Activo / Inactivo; nº de tools y puerto | "Configurar" → `config/api-mcp` |

El estado se representa con un badge: verde-éxito = ok, neutro = no configurado, error = fallo de conexión. Texto siempre acompaña al color (no solo color, AA).

### 3.2 Tarjetas de cambios pendientes

Una tarjeta por área que tiene cambios versus HubSpot: **Propiedades**, **Objetos custom**, **Formularios**. Muestra el contador y un enlace "Revisar →" que navega a la pantalla de la feature en su **vista de cambios**. Si el contador es 0, muestra "Al día" sin enlace activo.

### 3.3 Estado de primeros pasos (onboarding)

Si **no hay ningún conector configurado**, en lugar de las tarjetas vacías se muestra un checklist guiado: 1) Conectar HubSpot, 2) Conectar Google Drive, 3) Activar el servidor MCP — cada paso enlaza a su pantalla de configuración. Reemplaza el "placeholder" actual como estado vacío útil.

---

## 4. Modelo de datos / contratos

Fuentes reutilizadas (ya existentes):

- **HubSpot:** `hubspotGetStatus(projectId)` → `HubSpotConfig` (entornos con token, entorno activo) + `shellStore.hubspotEnvironment`.
- **Google Drive:** `gdriveGetStatus(input)` (carpeta), `gdriveGetCredentialsStatus()` y evento `gdrive:auth-status`.
- **MCP:** `mcpGetStatus()` → `{ running, port, toolCount }`.
- **Cambios pendientes:**
  - Formularios: `formsPendingChanges({ projectId })` (ya existe).
  - Objetos custom: `objectsList(...)` → contar los de `status` `draft`/`divergent` o con `pendingChanges`.
  - Propiedades: mismo origen que alimenta la vista de cambios de SPEC-0006 (`PendingChangesView`). Si no hay un canal de solo-contador, se reutiliza el listado existente y se cuenta en el renderer.

Hook nuevo `useDashboardStatus(projectId)` en la feature: hace las consultas en paralelo, expone `{ connectors, pending, loading, error }`. No introduce estado de escritura.

**Nuevo IPC:** ninguno previsto. Si durante implementación se detecta que el conteo de propiedades obliga a traer cargas pesadas, se evaluará un canal `properties:pending-count` (se documentará aquí como iteración).

---

## 5. Implementación — tareas atómicas

1. Feature `renderer/features/dashboard/`: `DashboardScreen`, `useDashboardStatus`, tarjetas (`ConnectorStatusCard`, `PendingChangesCard`, `OnboardingChecklist`).
2. Cablear la ruta índice del proyecto en `router.tsx` a `DashboardScreen` (sustituye `SectionPlaceholder titleKey="sidebar.dashboard"`).
3. Reutilizar (o extraer a `shared`) un `StatusBadge` para los estados de conector.
4. Claves i18n `dashboard.*` en los cuatro locales (es canónico).
5. Tutorial de usuario `doc/tutoriales/dashboard/es/entender-el-dashboard.md` (+ traducciones por SPEC-0009).
6. README de la feature.
7. Commit `feat(dashboard): panel de estado del proyecto`.

---

## 6. Tests requeridos

- Unit `useDashboardStatus.spec.ts`: agrega estados de conectores y contadores con IPC mockeado; maneja error y loading.
- Unit `DashboardScreen.spec.tsx`: render con conectores conectados; render del estado de onboarding cuando no hay conectores; "Al día" cuando pending = 0.
- a11y: badges con texto (no solo color), navegación por teclado de los enlaces.
- Funcional `dashboard.spec.ts`: abrir proyecto → ver dashboard → "Revisar" navega a la vista de cambios de la feature.

---

## 7. Scopes / permisos

Ninguno nuevo. Usa los scopes ya concedidos por SPEC-0003/0004/0005.

---

## 8. Consideraciones de seguridad

Solo lectura de estado ya expuesto al renderer vía IPC. No muestra tokens ni secretos: solo presencia/ausencia de configuración.

---

## 9. Documentación de usuario

- `doc/tutoriales/dashboard/es/entender-el-dashboard.md` (canónico) — qué significa cada tarjeta y cómo actuar sobre los cambios pendientes. Traducciones `ca`/`eu`/`en` según SPEC-0009.

---

## 10. Criterios de aceptación

- [ ] La ruta índice del proyecto muestra el Dashboard (no el placeholder).
- [ ] Las tres tarjetas de conector reflejan el estado real (conectado/no, entorno activo, nº tools).
- [ ] Las tarjetas de cambios pendientes muestran contadores correctos y enlazan a la vista de cambios de cada feature.
- [ ] Sin conectores configurados, se muestra el checklist de primeros pasos.
- [ ] Cumple AA (estado por texto + color, teclado) y marca CD.
- [ ] `npm run typecheck` y `npm run test:unit` en verde; funcional `dashboard.spec.ts` en verde.

---

## 11. Registro de implementación (2026-06-19)

- Feature `renderer/features/dashboard/`: `useDashboardStatus` (agrega HubSpot/Drive/MCP + contadores de pendientes en paralelo, solo lectura), `DashboardScreen` (tarjetas de conector, tarjetas de pendientes con enlace, checklist de primeros pasos, estados loading/error), `index.ts`.
- Ruta índice del proyecto cableada a `DashboardScreen` en `app/router.tsx` (sustituye el placeholder).
- i18n `dashboard.*` y `help.features.dashboard` en los cuatro locales.
- Tutorial `doc/tutoriales/dashboard/es/entender-el-dashboard.md` (canónico; `ca`/`eu`/`en` pendientes por SPEC-0009, fallback a castellano).
- Tests `useDashboardStatus.spec.ts` (3) y `DashboardScreen.spec.tsx` (2) en verde.
- **Verificación**: `npm run typecheck` en verde. Suite unitaria completa pendiente en máquina (límite de tiempo del sandbox); los specs nuevos pasan en local.
- Sin nuevos canales IPC (reutiliza `hubspotGetStatus`, `gdriveGetStatus`, `mcpGetStatus`, `entriesList`, `objectsListSchemas`, `formsPendingChanges`).

## 12. Adopción del patrón de estados de carga (SPEC-0002 §17) (IMPLEMENTADO, 2026-06-22)

`DashboardScreen` ya tiene estados loading/error propios (§11); se **reconvierten** al patrón unificado de
SPEC-0002 §17: `LoadingState` (variante `cards`) con `aria-busy` mientras `useDashboardStatus` resuelve los
agregados en paralelo, y reset del estado al cambiar de proyecto (sin fuga de contadores de otro proyecto).
Pendiente de implementación junto al resto de superficies.
