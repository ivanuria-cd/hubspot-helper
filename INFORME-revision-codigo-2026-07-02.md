# INFORME — Revisión de código y propuestas de mejora

Fecha: 2026-07-02
Alcance: `src/main`, `src/preload`, `connectors/`, capa MCP, `src/renderer`, `tests/`, configuración y tooling.
Estado: SOLO PROPUESTAS — nada implementado. Cada mejora que se apruebe debe canalizarse vía SPEC (enmienda al SPEC correspondiente según CLAUDE.md).

Nota metodológica: los hallazgos i18n se verificaron contra los ficheros originales (no es corrupción del espejo del sandbox: `es/common.json` tiene 865 líneas; `ca`/`eu`/`en`, 781).

---

## Resumen ejecutivo

| Severidad | Nº | Hallazgos clave |
|-----------|----|-----------------|
| Alta | 7 | Unhandled rejection en transporte HTTP/SSE que puede tumbar el proceso main; 76 claves i18n ausentes en ca/eu/en; toast de éxito en apply fallido; tools MCP de negocio sin tests; sin CI; e2e acoplados al locale del SO |
| Media | 30 | Gate de guía MCP no aplicado a formularios/objetos custom; fuga de token en logs de Drive; race conditions en stores y servicios; sin paginación en Drive; proxy HubSpot genérico expuesto al renderer |
| Baja | 27 | Duplicaciones, tipado débil, higiene de repo, tooling |

Los SPEC afectados por cada bloque se indican para facilitar las enmiendas.

---

## 1. Seguridad

**1.1 [alta] `src/main/mcp/transport/http-sse.ts:42-60` — handlers async sin captura de rechazos.**
`GET /sse` y `POST /messages` son handlers async de Express 4; si `server.connect(transport)` o `handlePostMessage` lanzan, el rechazo no se captura y en Node moderno tumba el proceso main de Electron completo.
Propuesta: envolver ambos handlers en try/catch, responder 500 y registrar el error. Enmienda a SPEC-0005.

**1.2 [media] `src/main/connectors/google-drive/index.ts:336` — fuga de access token en logs.**
`console.error(..., error)` vuelca el GaxiosError completo; `config.headers` incluye `Authorization: Bearer <token>`.
Propuesta: loguear solo `error.message` o redactar cabeceras como hace `redactToken` en el cliente HubSpot. Enmienda a SPEC-0004.

**1.3 [media] `src/main/index.ts:271-273` — proxy HubSpot genérico expuesto al renderer.**
`hubspotRequest` permite método/path/body arbitrarios con el PAT; un renderer comprometido tiene acceso total al portal.
Propuesta: allowlist de prefijos de path (`/crm/`, `/marketing/v3/forms`, `/account-info/`) o sustitución por canales tipados. Enmienda a SPEC-0003.

**1.4 [media] `src/main/window.ts:27-30` — `openExternal` sin validar esquema y sin guard `will-navigate`.**
El visor de Ayuda renderiza markdown; un enlace `file://` o `smb://` se abriría en el SO.
Propuesta: permitir solo `http:`/`https:` en `setWindowOpenHandler` y añadir guard `will-navigate`. Enmienda a SPEC-0002.

**1.5 [media] `src/main/mcp/index.ts:13-41` — token MCP persistido en claro.**
PAT y tokens Google van a keytar; el token MCP queda en claro en `mcp.json` de electron-store.
Propuesta: mover a keytar o cifrar con `safeStorage`. Enmienda a SPEC-0005.

**1.6 [media] `src/main/index.ts:235-258` — import de `.rvproj` con path arbitrario del renderer.**
`projectsImportValidate/Apply` leen y parsean cualquier `filePath` sin límite de tamaño ni validación de procedencia.
Propuesta: recordar en main el path devuelto por `projectsImportDialog`, o validar extensión y tamaño máximo antes de `readFile`. Enmienda a SPEC-0013.

**1.7 [baja] `src/main/connectors/hubspot/properties.ts:160,177,222` (también `schemas.ts`, `forms.ts`) — interpolación en path sin `encodeURIComponent`.**
Un `objectType`/`propertyName`/`groupName`/`formId` con `/` o `?` (de estado importado o MCP) altera la ruta.
Propuesta: codificar cada segmento. Enmienda a SPEC-0003.

**1.8 [baja] `src/main/connectors/google-drive/client.ts:131-136,169-176` — queries Drive sin escapar comillas.**
`parentId` y `featureName` se interpolan en la query `q` sin el `quote()` que ya usan `searchFolders` y sheets-client.
Propuesta: reutilizar `quote()` en todas las queries. Enmienda a SPEC-0004.

## 2. Correctitud (main y conectores)

**2.1 [media] `src/main/connectors/hubspot/client.ts:41-53` — reintentos que se saltan el rate limiter.**
El retry tras 429/5xx llama `instance.request(config)` directamente sin pasar por Bottleneck; el backoff (100/200/400 ms) es inútil frente a la ventana de 10 s de HubSpot y se ignora `Retry-After`.
Propuesta: reencolar los reintentos vía el limiter y esperar `Retry-After` o al menos el intervalo de refresco del reservoir. Enmienda a SPEC-0003.

**2.2 [media] `src/main/connectors/google-drive/client.ts:108-167` e `index.ts:452-495` — sin paginación en `files.list`/`drives.list`.**
Carpetas con más de 100 hijos quedan invisibles en el selector y `listManagedFiles` puede truncarse, rompiendo la deduplicación de SPEC-0004 §21.
Propuesta: iterar `nextPageToken` en todas las listas. Enmienda a SPEC-0004.

**2.3 [media] `src/main/connectors/google-drive/index.ts:550-595` — servidor loopback OAuth sin timeout.**
Si el usuario cierra el navegador, la Promise no resuelve, el puerto queda escuchando y la UI se queda en `authorizing`.
Propuesta: timeout (p. ej. 5 min) que cierre el servidor y rechace. Enmienda a SPEC-0004.

**2.4 [media] `src/main/property-management/service.ts:354-414` — last-write-wins en `applyChange` y `syncHubspot` (:257-282).**
Se captura `state` antes de varios `await` de red y se escribe el snapshot completo al final; una edición concurrente (UI + tool MCP) se pierde. Formularios ya lo resuelve releyendo el store (`forms-management/service.ts:336`).
Propuesta: aplicar el mismo patrón de relectura antes de escribir. Enmienda a SPEC-0006.

**2.5 [media] `src/main/connectors/google-drive/index.ts:127-139` — refrescos de token concurrentes sin deduplicar.**
Dos operaciones paralelas refrescan dos veces; con rotación de refresh token una puede persistir un token ya invalidado. Tampoco se distingue `invalid_grant` para marcar la conexión como caducada.
Propuesta: memoizar la promesa de refresco por projectId y tratar `invalid_grant` como desconexión. Enmienda a SPEC-0004.

**2.6 [media] `src/main/connectors/google-drive/*` — sin reintentos ante 429/5xx en Drive/Docs/Sheets.**
`writeSpreadsheet` encadena 5+ llamadas; un 429 a mitad deja el libro a medias.
Propuesta: retry con backoff en el façade de googleapis, homogéneo con el cliente HubSpot. Enmienda a SPEC-0004.

**2.7 [baja] `src/main/index.ts:687-689` — `before-quit` no espera `mcpService.stop()`.**
Propuesta: `event.preventDefault()` + await + `app.exit()` para cierre limpio. Enmienda a SPEC-0005.

**2.8 [baja] `src/main/property-management/service.ts:538-546` — `updateOrigin` no valida que el id exista.**
Devuelve `input.origin` aunque el origen no exista, a diferencia de `convertEntryToNew`/`applyChange`.
Propuesta: devolver error si el id no existe. Enmienda a SPEC-0006.

## 3. Capa MCP

**3.1 [media] `src/main/forms-management/mcp-tools.ts` y `src/main/custom-objects/mcp-tools.ts` — gate de guía (SPEC-0005 §15) no aplicado.**
Ninguna tool de estas dos features declara `requiresGuidance`: `custom_objects_apply_change`, `custom_objects_sync`, `forms_sync`, `forms_create_definition`, etc. escriben o sincronizan sin acuse de guía. Inconsistencia adicional: `properties_discard_change`/`_batch` escriben en local y no están gated, mientras `entries_delete` sí.
Propuesta: marcar `requiresGuidance` en todas las tools de escritura/sync de formularios y objetos custom, y homogeneizar el criterio en propiedades. Enmienda a SPEC-0005 (y adopción en SPEC-0007/0008).

**3.2 [media] `src/main/property-management/mcp-tools.ts:526-531` (patrón general) — `inputSchema` no validado en runtime.**
Los handlers hacen `as` a ciegas: `environment` se castea a `HubSpotEnvironment` sin comprobar el enum; los ítems de `entries_upsert_batch` se castean sin validar forma.
Propuesta: validador mínimo contra el `inputSchema` en `callTool` (server.ts), o al menos validación de los enums críticos. Enmienda a SPEC-0005.

**3.3 [baja] `src/main/mcp/types.ts:38` — `requiredScopes` decorativo.**
Nunca se comprueba contra los scopes reales del PAT (H6 diferido de SPEC-0006 §26).
Propuesta: documentarlo como informativo o implementar la comprobación cerrando H6.

**3.4 [baja] `src/main/forms-management/service.ts:123-140` + `mcp-tools.ts:72-94` — `upsertLink`/`forms_link_origin` sin validar `originIds`.**
`createDefinition` sí valida con `assertOriginsExist`.
Propuesta: llamar al mismo assert en `upsertLink`. Enmienda a SPEC-0008.

## 4. Arquitectura y duplicación (main)

**4.1 [media] `src/main/index.ts:135-650` — `registerIpcHandlers` de ~515 líneas.**
Mezcla wiring de servicios, registro de secciones, helpers de Sheets y 90+ handlers.
Propuesta: extraer por feature (`registerPropertyIpc(ipcMain, deps)`, etc.) y mover los `write*Sheets` a un módulo propio. Enmienda a SPEC-0002 (o SPEC transversal de refactor).

**4.2 [baja] `hubspotErrorMessage` triplicada.**
Versión rica en `property-management/service.ts:109` (mapea 401/403/429/409); versiones pobres en `forms-management/service.ts:60` y `custom-objects/service.ts:36`.
Propuesta: extraer la versión rica a `connectors/hubspot` y reutilizarla. Enmienda a SPEC-0003.

**4.3 [baja] Stores por proyecto duplicados.**
`ElectronHubSpotConfigStore`, `ElectronGoogleDriveConfigStore`, `ElectronPropertyStore`, etc. repiten el patrón `Record<projectId, T>` get/set/delete.
Propuesta: helper genérico `createProjectScopedStore<T>(name)`.

## 5. Rendimiento

**5.1 [media] `src/main/connectors/hubspot/forms.ts:186-203` — `getConsentTemplate` descarga todos los formularios del portal en cada `applyChange` con consentimiento incompleto.**
Propuesta: cachear por proyecto/tipo con TTL corto o memoizar dentro de la operación. Enmienda a SPEC-0008.

**5.2 [baja] `src/main/property-management/service.ts:264-274` — listado de propiedades por objectType secuencial.**
Propuesta: `Promise.allSettled` (Bottleneck ya throttlea). Enmienda a SPEC-0006.

**5.3 [baja] `src/main/connectors/google-drive/sheets-client.ts:133-142` — clear+update por pestaña en serie.**
Propuesta: `values.batchClear`/`values.batchUpdate` reduce N×2 llamadas a 2. Enmienda a SPEC-0004.

## 6. i18n

**6.1 [alta] `src/renderer/locales/{ca,eu,en}/common.json` — 76 claves ausentes respecto a `es`.**
Verificado sobre los originales. Faltan `common.loading/retry/loadError`, todo `properties.wizard.*`, `properties.newProp.*`, `properties.kinds.*`, `properties.fieldTypes.*`, `properties.entry.*`, `properties.panel.applyTitle/applyHint/applied`, `properties.originsModal.objects…`. El EntryWizard y media pantalla de Propiedades caen a castellano en silencio en ca/eu/en. `gl`/`pt`/`fr` están a paridad (solo falta `_fallbackProbe`, intencional).
Propuesta: completar las 76 claves y ampliar el script de paridad para cubrir `common.json` (hoy solo tutoriales). Enmienda a SPEC-0009/0014.

**6.2 [baja] `EntryWizard.tsx:468` — `defaultValue: 'Cargando…'` hardcodeado.**
Contradice SPEC-0000 §3 y enmascara la ausencia de `common.loading` en 3 locales.
Propuesta: eliminar el `defaultValue`.

**6.3 [baja] `GoogleDriveConnectorScreen.tsx:150` — `toLocaleString()` sin locale.**
Formatea con el idioma del SO, no con el activo (SPEC-0000 §3 exige `Intl` según locale activo).
Propuesta: `Intl.DateTimeFormat(i18n.language)`.

## 7. Renderer — manejo de errores

**7.1 [alta] `PropertyManagementScreen.tsx:165-178` — toast de éxito en apply fallido.**
`applyChange` del store devuelve `false` sin lanzar cuando `result.success === false` (`entries-store.ts:75-83`), pero `handleApply` ignora el booleano: se muestran a la vez el toast verde y el Alert de error.
Propuesta: comprobar el retorno antes de notificar. Enmienda a SPEC-0006.

**7.2 [media] `entries-store.ts:37-44` — `load` con `try/finally` sin `catch`.**
Si `entriesList` rechaza, la promesa escapa (unhandled rejection) y `error` del store no se rellena. `origins-store`/`objects-store`/`mappings-store` no tienen ningún manejo de error.
Propuesta: `catch` que setee `error` como hace `sync`. Enmienda a SPEC-0006.

**7.3 [media] `useHubSpotConnector.ts:36-47` — `.then()` sin `.catch`.**
Un fallo IPC deja `loading=true` para siempre (spinner infinito).
Propuesta: catch que baje `loading` y marque error. Enmienda a SPEC-0003.

**7.4 [media] `EntryWizard.tsx:196-204,210-241` — `createGroup` y `handleSubmit` sin try/catch ni estado ocupado.**
Doble submit posible; un fallo IPC es unhandled rejection sin Snackbar.
Propuesta: `BusyButton` (como `ObjectWizard.tsx:399`) + notificación de error. Enmienda a SPEC-0006.

**7.5 [baja] `PropertyManagementScreen.tsx:152-163,180-190` — `handleConvertAll` y `handleExport` sin manejo de error.**
Propuesta: envolver y notificar vía Snackbar compartido.

**7.6 [baja] `DriveDirtyGuard.tsx:73-79` — fallo de `onUpdate` sin feedback.**
El diálogo queda abierto sin aviso.
Propuesta: notificar vía Snackbar compartido. Enmienda a SPEC-0004.

## 8. Renderer — React (renders, races, estructura)

**8.1 [media] `SnackbarProvider.tsx:50-56` — `notify` inestable.**
Depende de `[open, current]`; `GroupsModal.tsx:44-64` mete `notify` en las deps de `reload`: cualquier snackbar con el modal abierto relanza las 3 llamadas IPC.
Propuesta: hacer `notify` estable (refs o updater funcional). Enmienda a SPEC-0002.

**8.2 [media] `useDashboardStatus.ts:31-73` y `useCrmOverview.ts` — fetch sin guarda de respuesta obsoleta.**
Al cambiar rápido de proyecto, la respuesta anterior puede pisar la nueva. El proyecto ya tiene `useAsyncResource` con cancelación por `runId` (SPEC-0002 §17).
Propuesta: migrar ambos hooks a `useAsyncResource`. Enmienda a SPEC-0010/0011.

**8.3 [media] `EntryWizard.tsx:141-178` — cargas no cancelables.**
Reabrir el wizard con otro `objectType` con petición en vuelo permite que `setHsProps`/`setGroups` obsoletos aterricen después.
Propuesta: patrón de cancelación por id de `useAsyncResource`. Enmienda a SPEC-0006.

**8.4 [media] `PropertyManagementScreen.tsx:91,385-387,405-407` — `selected` guarda snapshot obsoleto.**
Se parchea manualmente con `useEntriesStore.getState()` en dos sitios pero no en el resto de flujos. Mismo patrón en `FormsManagementScreen` (`selected: HubSpotForm`).
Propuesta: guardar solo `selectedId` y derivar con `useMemo`. Enmiendas a SPEC-0006/0008.

**8.5 [media] `FormsManagementScreen.tsx:104-108` — efecto de cobertura dependiente de `forms.length`.**
Un re-sync que sustituye formularios sin cambiar el total no recarga cobertura; además lanza N llamadas IPC sin deduplicar en cada montaje.
Propuesta: depender de una firma de ids o exponer un `loadCoverageAll` batched. Enmienda a SPEC-0008.

**8.6 [media] `EditFormWizard.tsx:369,556` — `key={index}` en listas reordenables.**
Con subir/bajar/borrar, React reutiliza nodos y el foco/estado queda en la fila equivocada. Menor en `ObjectWizard.tsx:231`, `OptionsDialog.tsx:122`, `SourceOptionsDialog.tsx:111` (borrado, sin reorden).
Propuesta: id estable por fila. Enmienda a SPEC-0008 (y 0006/0007).

**8.7 [media] `EntryWizard.tsx` (632 líneas) — componente gigante.**
`definitionEditor` es una función de render interna de ~215 líneas recreada en cada render.
Propuesta: extraer `PropertyDefinitionEditor` y `SourceRow` como componentes memoizables. Enmienda a SPEC-0006.

**8.8 [baja] `EntryWizard.tsx:192` — id temporal `tmp-${Date.now()}` colisionable.**
Propuesta: `crypto.randomUUID()`.

**8.9 [baja] `forms-store.ts` — `coverage` y `lastSync` no se resetean en `load`.**
Datos del proyecto anterior visibles al cambiar de proyecto (contra SPEC-0002 §17.2).
Propuesta: limpiar en `load`. Enmienda a SPEC-0008.

**8.10 [baja] `MarkdownView.tsx:31` — parseo completo en cada render del visor de Ayuda.**
Propuesta: `useMemo(content)`. Enmienda a SPEC-0002.

## 9. Renderer — normas transversales, a11y, tipado

**9.1 [media] `app/router.tsx:27-31` — `RouteErrorBoundary` solo en las 5 rutas de proyecto.**
`config`, `config/connectors/*`, `config/api-mcp` y `help` sin `errorElement`: un fallo de render ahí tumba la app.
Propuesta: `errorElement` a nivel de la ruta padre. Enmienda a SPEC-0002 §20.

**9.2 [baja] `FormsManagementScreen.tsx:267` — "sin resultados" con `Typography` en vez del `EmptyState` compartido (SPEC-0002 §14).**
Propuesta: unificar con `EmptyState`.

**9.3 [baja] `EditFormWizard.tsx:371-398` — TextField por fila sin `label`/`aria-label`.**
Los checkboxes de la misma fila sí lo llevan. Además `FIELD_TYPES`/`CONSENT_TYPES` se muestran como valores técnicos crudos en los selects.
Propuesta: `aria-label` compuesto y valorar claves `forms.fieldTypes.*` como en propiedades. Enmienda a SPEC-0008.

**9.4 [baja] `PropertyManagementScreen.tsx:216` y `FormsManagementScreen.tsx:200` — `lastSync as unknown as Record<string, number>`.**
Propuesta: función tipada `syncSummaryVars(lastSync)`.

**9.5 [baja] `PropertyManagementScreen.tsx:49-59` y `EntryPanel.tsx:42-51` — `destName` duplicado byte a byte con doble cast.**
Propuesta: util compartido de la feature con type guard.

**9.6 [baja] `entries-store.ts:52,78` (y `forms-store.ts`) — fallback `'Error'` hardcodeado pintado en el Alert.**
Propuesta: dejar que la pantalla traduzca un genérico `errors.unknown`.

## 10. Tests

**10.1 [alta] Tools MCP de negocio sin specs.**
`property-management/mcp-tools.ts` (646 líneas), `forms-management/mcp-tools.ts` (253), `custom-objects/mcp-tools.ts` (152): cero specs propios; solo `mcp/guidance.spec.ts` cubre el gate. Es donde se han concentrado los bugs históricos (SPEC-0006 §39–§45).
Propuesta: specs por handler (validación de input, gating, mapeo de errores).

**10.2 [alta] `tests/functional/*.spec.ts` — e2e acoplados al locale del SO.**
Asertan cadenas castellanas («Nuevo proyecto», «Configuración») mientras i18n detecta con `navigator`: en una máquina/CI no-es toda la suite falla.
Propuesta: forzar idioma al lanzar (arg/env/`initialLanguage`) o asertar por rol/testid.

**10.3 [media] Sin e2e de formularios, objetos custom, dashboard, CRM, `.rvproj` ni ajustes MCP.**
Los cuatro `test.fixme` (`export-json`, `forms-flow`, `link-origin`, `new-form`) se borraron en 2026-06-19 en lugar de implementarse; `tests/functional/fixtures/` solo contiene `.gitkeep` pese a SPEC-0000 §8.
Propuesta: reponer al menos los cuatro flujos borrados con fixtures.

**10.4 [media] `a11y-baseline.spec.ts:18` — único escaneo axe sobre la ventana inicial.**
SPEC-0000 §3 exige a11y en los e2e de cada característica.
Propuesta: escaneo axe tras navegar a Propiedades/Formularios/Objetos/Dashboard.

**10.5 [media] `src/main/index.ts` (677 líneas) y `connectors/google-drive/index.ts` (615) sin ningún test.**
Propuesta: extraer los handlers IPC a módulos testeables (ligado a 4.1) y cubrir el contrato canal→servicio.

**10.6 [media] Wizards y pantallas grandes sin test unitario.**
`EntryWizard` (632), `EditFormWizard` (631), `PropertyManagementScreen` (435), `ObjectWizard` (405), `NewFormWizard`, `GroupsModal`, `OriginsModal`, `OptionsDialog`. En renderer solo hay 20 specs.
Propuesta: priorizar los wizards (lógica de validación y estado).

**10.7 [media] `app-launch.spec.ts:11` y `a11y-baseline.spec.ts:19` — lanzan la app sin `--user-data-dir` aislado.**
Dependen del perfil real del desarrollador.
Propuesta: unificar el patrón de userData temporal del resto de la suite.

**10.8 [media] `package.json:26` — `test:e2e` no depende de `build`.**
Los e2e ejecutan `out/main/index.js`, que puede estar obsoleto.
Propuesta: `pretest:e2e` con build o comprobación de frescura.

**10.9 [media] `vitest.config.ts:12` — sin `coverage.thresholds` pese al objetivo del 80% (SPEC-0000 §8).**
Propuesta: `thresholds: { lines: 80 }`, aunque sea por directorios.

**10.10 [baja] `playwright.config.ts` — sin `retries` ni `trace`/`screenshot` on-failure.**
Propuesta: `trace: 'retain-on-failure'`.

**10.11 [baja] `src/main/mcp/integration.spec.ts:10` — race entre `getFreePort()` y el bind.**
Propuesta: bindear a puerto 0 directamente o documentar la restricción workers=1.

## 11. Configuración y tooling

**11.1 [alta] No existe `.github/workflows/` — sin CI.**
SPEC-0000 §8 exige e2e en CI antes de merge y §11 define reglas de CI.
Propuesta: workflow con typecheck + lint + test:unit (+ e2e con xvfb), más paridad i18n/tutoriales (ver 6.1 y 11.6).

**11.2 [media] Sin hooks pre-commit.**
ESLint+Prettier (SPEC-0000 §6) no se aplican automáticamente.
Propuesta: lint-staged con `eslint --fix` + `prettier`.

**11.3 [media] `.eslintrc.cjs:17` — `ignorePatterns` no excluye `sandbox/`, `test-results/`, `build/`, `doc/`.**
`eslint .` puede fallar por código no productivo. ESLint 8 + `.eslintrc` legacy está EOL.
Propuesta: ampliar ignores y planificar migración a flat config/ESLint 9.

**11.4 [baja] Alias TS inconsistentes entre `vitest.config.ts:19` y los tsconfig por proceso.**
Un spec puede resolver en Vitest un alias que rompe en typecheck.
Propuesta: alinear los alias de vitest con el tsconfig correspondiente.

**11.5 [baja] `tsconfig.main.json`/`tsconfig.renderer.json` — sin `noUnusedLocals`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`.**
Propuesta: adopción gradual.

**11.6 [baja] `scripts/check-tutorial-parity.mjs` sin script npm ni CI.**
Propuesta: `"check:tutoriales"` en package.json + CI.

**11.7 [baja] `vitest.config.ts:7` — `environmentMatchGlobs` deprecado en Vitest 2.1+.**
Propuesta: migrar a `projects`/directiva por fichero antes de subir a Vitest 3.

**11.8 [baja] `package.json:13-14` — `preview` y `start` idénticos.**
Propuesta: eliminar uno.

**11.9 [baja] `@testing-library/user-event` instalado sin un solo import.**
Propuesta: eliminar o adoptarlo en los tests de componentes (preferible a `fireEvent`).

## 12. Higiene del repo

**12.1 [media] `test.txt` (raíz) — fichero muerto versionado.**
Salida stale de typecheck (versión 0.1.0 vs 1.0.0 actual).
Propuesta: borrar del repo.

**12.2 [media] `Icono RevOpsHelper.zip` e `Icono RevOpsHelper  otros.zip` en raíz.**
Sin trackear, con riesgo de commit accidental.
Propuesta: mover fuentes a `build/` y añadir `*.zip` a `.gitignore`.

**12.3 [media] `electron-builder.yml:7` — `files: out/**/*` empaqueta `out/*-types/`.**
Los outDir composite de los tsconfig van al instalable.
Propuesta: `!out/*-types/**` o mover el outDir fuera de `out/`.

**12.4 [baja] `scripts/*.cmd` one-shot históricos (`commit-inicial`, `verify-spec-0002/0004`, `setup-gdrive-deps`).**
Propuesta: archivar en `doc/` o borrar.

**12.5 [baja] `INFORME-*.md` en raíz y `tests/functional/README.md:5` referencia `pnpm` (el proyecto usa npm).**
Propuesta: mover informes a `doc/` y corregir el README.

---

## Priorización sugerida

1. Estabilidad y seguridad inmediatas: 1.1, 7.1, 2.1, 2.4, 3.1 (gate MCP), 1.2, 1.3.
2. i18n: 6.1 (76 claves) + paridad de `common.json` en el script.
3. Red de seguridad: 11.1 (CI) + 10.2 (e2e independientes de locale) — sin esto, el resto de correcciones no queda protegido.
4. Robustez Drive: 2.2, 2.3, 2.5, 2.6.
5. Deuda de tests: 10.1, 10.3, 10.6.
6. Refactors: 4.1, 8.7, y el resto de bajas de forma oportunista.

## Verificado sin hallazgo (puntos fuertes)

`contextIsolation`+`sandbox`+`nodeIntegration:false` correctos y preload con canales fijos tipados; PAT/tokens Google en keytar; validación del token MCP en tiempo constante y servidor solo en 127.0.0.1; redacción del token en errores axios de HubSpot; paginación correcta en Forms v3; PKCE con `state` verificado; saneado de secretos en `.rvproj`; cobertura completa de `t()` en `es` (564 claves usadas, 0 ausentes); los 35 `IconButton` icon-only con `aria-label`; `startIcon` presente; `useAsyncResource`/`LoadingState`/`FieldTooltip`/Snackbar/ConfirmDialog bien adoptados en general; specs muestreados de main con mocks que verifican requests.
