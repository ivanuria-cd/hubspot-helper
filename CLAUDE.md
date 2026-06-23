# CLAUDE.md

Antes de cualquier acción, leer obligatoriamente:

1. `specs/SPEC-0000-normas-del-proyecto.md` — normas del proyecto: stack, convenciones de código, flujo Git, reglas de testing y formato de SPECs.

## Preferencia de versión de API de HubSpot

Al elegir endpoints de HubSpot, usar siempre la versión más alta disponible para el recurso, con este orden de prioridad:

`2026-03` (API por fecha) > `v4` > `v3` > `v2` > `v1`

Nota: la discrepancia de `phone_number` (admitido como `type` en la referencia `2026-03` de propiedades, pero descrito como `string` + `fieldType: phonenumber` en la guía legacy) se debe al cambio de versión de API; se resuelve adoptando la versión más alta.

## SPECs del proyecto

Todos los SPECs están en `specs/`. Estado actual:

| SPEC | Título | Estado |
|------|--------|--------|
| [SPEC-0000](specs/SPEC-0000-normas-del-proyecto.md) | Normas del Proyecto | VALIDADO |
| [SPEC-0001](specs/SPEC-0001-fundacion-del-proyecto.md) | Fundación del Proyecto | IMPLEMENTADO |
| [SPEC-0002](specs/SPEC-0002-app-shell.md) | App Shell | IMPLEMENTADO (patrón transversal de estados de carga y respuesta inmediata/A11y §17 —Skeleton/CircularProgress + `useAsyncResource` + reset al abrir; norma en SPEC-0000 §3; adopción registrada en SPEC-0003 §14, 0004 §17, 0005 §13, 0006 §27, 0007 §18, 0008 §27, 0010 §12, 0011 §12—, BORRADOR pendiente de validación e implementación, 2026-06-22) |
| [SPEC-0003](specs/SPEC-0003-conector-hubspot.md) | Conector HubSpot | IMPLEMENTADO |
| [SPEC-0004](specs/SPEC-0004-conector-google-drive.md) | Conector Google Drive | IMPLEMENTADO (credenciales por UI §13 + selector propio sin Picker §14; patrón común de documentos Drive §15; hipervínculo «Abrir en Drive» §18 —solo el Sheets legible, en DriveDocActions y lista del conector, 2026-06-23; 111/111 + tsc en verde en sandbox—; revisión y actualización automática de los archivos de Drive al abrir el proyecto §19 —enmienda §15.2 solo en local→Drive; `gdrive:refresh-project` + orquestador `drive-refresh.ts` + aviso por Snackbar; 72/72 + tsc en verde en sandbox, 2026-06-23—; §17 estados de carga pendiente; typecheck/test en máquina) |
| [SPEC-0005](specs/SPEC-0005-capa-mcp-api.md) | Capa MCP / API | IMPLEMENTADO (fix simetría CRUD MCP §11.1, 2026-06-18; borrado de grupos diferido; typecheck/test en máquina) |
| [SPEC-0006](specs/SPEC-0006-gestion-de-propiedades.md) | Gestión de Propiedades | IMPLEMENTADO (rediseño §16; patrón común Drive §21; fix defectos MCP §22.4 —validación originId + origins_delete—, 2026-06-18; ampliación de tipologías §25 —display hints de número (moneda/porcentaje/duración), formato de texto, calculadas, valor único, sensibilidad, calculation_equation; constantes compartidas con SPEC-0007; requiere rebuild MCP—, 2026-06-22; hallazgos batería MCP §26 RESUELTOS H1–H5 —sync resiliente, grupo en entorno destino al aplicar, discard valida id, opciones bool, calc fuera del diff— H6 diferido (scope token), requiere rebuild MCP, 2026-06-22; reordenación de la UI §25.7 —sección colapsable «Opciones avanzadas» en EntryWizard—, 2026-06-22; opciones de enumeración en diálogo aparte §25.8 —OptionsDialog con scroll propio, búsqueda y pegado masivo—, 2026-06-22; migración a CRM Properties API 2026-03 §28 —paths `/crm/properties/2026-03/...`, resuelve `phone_number`; requiere rebuild MCP—, 2026-06-22; borrado (archivado) de propiedades como cambio pendiente §29 —tool `properties_request_delete` + operación `delete`; requiere rebuild MCP—, 2026-06-22; typecheck/test en máquina) |
| [SPEC-0007](specs/SPEC-0007-objetos-custom-hubspot.md) | Objetos Custom de HubSpot | IMPLEMENTADO (documento Drive §15; fix creación end-to-end vía MCP §16.4 —custom_objects_sync + delete_draft—, 2026-06-18; typecheck/test en máquina) |
| [SPEC-0008](specs/SPEC-0008-gestion-de-formularios.md) | Gestión de Formularios | IMPLEMENTADO (patrón común Drive §15; fix defectos MCP §16.4 —normalize create_definition + forms_discard_change—, 2026-06-18; fix mapeo tipos de campo a Forms API v3 §19 —checkbox/booleancheckbox/date—, 2026-06-19; fix validation requerido en campos email §20 —requiere rebuild MCP—, 2026-06-19; edición de formularios update_form §21 + origen al crear explícito/validado §22 —requiere rebuild MCP—, 2026-06-19; edición de cambios pendientes §23 —forms_edit_pending_change, requiere rebuild MCP—, 2026-06-19; consentimiento legal con Subscriptions API v4 §24 —privacyText/checkboxes, forms_subscription_types, requiere rebuild MCP—, 2026-06-19; fix campos requeridos archived/createdAt/updatedAt en el cuerpo §25, 2026-06-19; fix límite de 3 campos por grupo §26, 2026-06-19; typecheck/e2e + PR en máquina) |
| [SPEC-0009](specs/SPEC-0009-tutoriales-multidioma.md) | Tutoriales Multidioma | VALIDADO — implementado (typecheck/test/e2e + PR pendientes en máquina) |
| [SPEC-0010](specs/SPEC-0010-dashboard-de-estado.md) | Dashboard de Estado | IMPLEMENTADO (mejoras UX alto impacto, 2026-06-19; typecheck en verde, suite unitaria completa pendiente en máquina) |
| [SPEC-0011](specs/SPEC-0011-vista-general-crm.md) | Vista General de CRM | IMPLEMENTADO (2026-06-19; typecheck/lint en verde, suite unitaria completa pendiente en máquina) |
| [SPEC-0012](specs/SPEC-0012-identidad-visual-documentos-drive.md) | Identidad Visual de los Documentos de Drive | IMPLEMENTADO (2026-06-23; módulo de marca compartido `brand.ts`; Sheets de propiedades con bloque por objeto + hoja `01_Indice` y `SHEETS_SCHEMA_VERSION` 2→3 §2.3; estilo de marca en cabeceras/portada/validación/formato condicional `sheets-style.ts` §3.1; portada de Docs estilada `cover-template.ts` §3.2 sin alterar el round-trip SPEC-0004 §15.5; adopción en SPEC-0006 §30 / SPEC-0007 §18 / SPEC-0008 §27; 172/172 tests + `tsc --noEmit` en verde en sandbox, suite completa + e2e + PR en máquina) |

Mejoras de UX de alto impacto (`INFORME-ux-2026-06-19.md`) IMPLEMENTADAS (2026-06-19): SPEC-0002 §10 (Snackbar global) y §11 (ConfirmDialog compartido) en `renderer/shared/components/feedback/`; adopción en SPEC-0003 §13, SPEC-0004 §16, SPEC-0005 §12, SPEC-0006 §23, SPEC-0007 §17, SPEC-0008 §17; y SPEC-0010 (Dashboard de estado). `npm run typecheck` en verde; suite unitaria completa pendiente de ejecutar en máquina.

Mejoras de UX de impacto medio IMPLEMENTADAS (2026-06-19): SPEC-0002 §13 (retirada de Mapas/Reporting del menú hasta tener SPEC), SPEC-0002 §14 (consistencia: `StatusBadge`/`EmptyState`/`SIDE_PANEL_WIDTH` compartidos en `renderer/shared/components/` + adopción) y SPEC-0011 (Vista General de CRM). Además se eliminaron cuatro e2e `test.fixme` (`export-json`, `forms-flow`, `link-origin`, `new-form`; ver SPEC-0006 §24 y SPEC-0008 §18). typecheck/lint en verde; suite unitaria completa pendiente en máquina.

Mejoras de UX de bajo impacto / higiene IMPLEMENTADAS (2026-06-19): SPEC-0002 §16 — indentación de las áreas de CRM en el sidebar (`NavItem.child`), `aria-hidden`/`aria-label` puntuales (selector de carpeta Drive y asistente de formularios) y borrado del fichero muerto `PropertiesTable.tsx`. typecheck/lint en verde.

Leer el SPEC correspondiente antes de implementar o modificar cualquier característica.

Cada nuevo SPEC aprobado debe añadirse a esta tabla antes de continuar con el siguiente.

## Alcance de cada SPEC

Límites estrictos para evitar solapamientos entre SPECs:

| SPEC | Alcance — qué hace | Fuera de alcance — qué NO toca |
|------|--------------------|-------------------------------|
| SPEC-0000 | Convenciones, stack, flujo Git, reglas de testing, formato de SPECs | Ningún código de producción |
| SPEC-0001 | Scaffolding Electron + TS + React, tema MUI con tokens CD, auto-updater, estructura de carpetas, READMEs, init Git con remote | Ninguna pantalla ni lógica de negocio |
| SPEC-0002 | Pantalla de bienvenida, selector de proyectos, menú lateral, topbar, layout principal, router, store de shell, sección Ayuda (visor in-app de los tutoriales de `doc/tutoriales/`) | Ningún conector externo; ninguna característica de negocio; no escribe el contenido de los tutoriales (lo aporta cada SPEC) |
| SPEC-0003 | Cliente HTTP HubSpot, autenticación PAT, gestión de entornos production/sandbox, rate limiting, pantalla de configuración del conector | No implementa ningún endpoint de negocio; no toca Google Drive ni MCP |
| SPEC-0004 | Cliente Google Drive, OAuth PKCE, selección de carpeta, sincronización, escritura/lectura de archivos con portada CD y versionado de esquema | No define la estructura de ningún archivo concreto (eso lo hace cada SPEC de característica); no toca HubSpot ni MCP |
| SPEC-0005 | Servidor MCP (stdio + HTTP/SSE), registry de tools, autenticación por token local, UI de configuración MCP | No implementa ninguna tool de negocio; las tools las registra cada SPEC de característica |
| SPEC-0006 | Mapa de propiedades HubSpot: orígenes de datos, entradas por objeto (nombre + propiedad HubSpot destino + orígenes con definición genérica y mapeo de opciones), selección de objetos (estándar + custom existentes), cambios pendientes en HubSpot, exportación JSON, Google Sheets, tools MCP de propiedades | No crea objetos custom (eso es SPEC-0007); no gestiona registros/instancias; no toca workflows ni sequences |
| SPEC-0007 | Creación y gestión de objetos custom de HubSpot (CRM Schemas API); catálogo de objetos para SPEC-0006 | No gestiona registros (instancias); no define las entradas de propiedades (eso es SPEC-0006) |
| SPEC-0008 | Formularios HubSpot (Marketing Forms API v3): importar (legacy + nueva), crear formularios solo-campos, **editar formularios existentes (update_form: campos, nombre, configuración, estilos, lógica, consentimiento; §21)**, asociar a orígenes de SPEC-0006 (también al crear vía MCP, §22), revisar cobertura, añadir campos en bloque, **editar cambios pendientes antes de aplicarlos (forms_edit_pending_change, §23)**, cambios pendientes/sincronización, volcado a Sheets, tools MCP de formularios | No borra formularios; no crea propiedades ni objetos (SPEC-0006/0007); no define orígenes; no gestiona submissions |
| SPEC-0009 | Internacionalización de los tutoriales: convención `doc/tutoriales/<feature>/<locale>/<slug>.md`, traducción de los tutoriales a `ca`/`eu`/`en`, visor de Ayuda consciente del idioma con fallback a castellano (`resolveContent`/`resolveTitle`, `help.fallbackNotice`), script de paridad | No crea tutoriales nuevos ni características; no cambia la mecánica de carga/render del visor (SPEC-0002); no toca i18n de la UI fuera de `help.fallbackNotice` |
| SPEC-0010 | Dashboard de estado del proyecto: pantalla índice del proyecto (solo lectura) que agrega estado de conectores (HubSpot/Drive/MCP) y contadores de cambios pendientes, con accesos directos y checklist de primeros pasos | No crea endpoints de escritura ni lógica de negocio; no duplica funcionalidad de las features (enlaza a ellas); el Snackbar/ConfirmDialog compartidos son de SPEC-0002 §10/§11 |
| SPEC-0011 | Vista general de CRM: pantalla índice de la ruta `crm` (solo lectura) con tarjetas de las tres áreas (Propiedades/Objetos/Formularios) — total + pendientes + acceso — y aviso si HubSpot no está conectado | No crea endpoints de escritura ni lógica de negocio; no duplica las features (enlaza a ellas); la retirada de Mapas/Reporting del menú es SPEC-0002 §13 |
| SPEC-0012 | Identidad visual de los documentos de Drive (transversal): módulo de marca compartido, estilo de los Sheets (banner, cabeceras, notas, validación/formato condicional, wrap, anchos), separación por objeto del mapa de propiedades + hoja índice, estilado de la portada del Doc de estado | No cambia el mecanismo de carga/escritura del conector (SPEC-0004) ni el round-trip §15.5; no añade pantallas ni controles en la app; no altera la lógica de negocio de las features |
