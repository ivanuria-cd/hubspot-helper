# SPEC-0016 — Mapa de Campos Editable (Planificación)

**Estado:** VALIDADO
**Branch:** feat/spec-0016-mapa-campos-editable
**Fecha:** 2026-07-07
**Depende de:** SPEC-0004, SPEC-0006, SPEC-0012

---

## 1. Objetivo

Generar en Google Drive un documento **editable** de mapeo de propiedades, con la mecánica del skill `mapa-de-campos` (desplegables, destino calculado por fórmula, hojas de catálogo por origen y asociaciones), pensado como **entrada de planificación** que el cliente rellena y valida antes de crear o migrar propiedades.

**Sustituye** el Google Sheets de export legible de SPEC-0006 (§18/§19) —artefacto protegido de solo lectura— por este documento **editable**, que pasa a ser el **único** mapa de propiedades en Drive. La deprecación de lo correspondiente en SPEC-0006/0012 se detalla en §2.7. Se **conserva** el Doc de estado companion (JSON) como round-trip fiel invisible.

---

## 2. Contexto y decisiones de diseño

### 2.1 Diferencia con el export de SPEC-0006

| | Export SPEC-0006 (§18/§21) | Mapa editable (este SPEC) |
|---|---|---|
| Propósito | Volcar el estado de la app | Documento de entrada/planificación |
| Fuente de verdad | `electron-store` + HubSpot | Provisional; lo rellena el cliente |
| Protección | Rangos protegidos (`warningOnly:false`) | **Sin protección** (editable) |
| Round-trip | Doc companion JSON (fiel, SPEC-0004 §15.5) | Ingest best-effort con **alerta + changelog** previo → borradores (§2.4 D3) |
| Estructura | `00_Portada`/`01_Indice`/`02_Origenes` + bloque por objeto | Estructura del skill (Leyenda + tab por objeto + Origen/Asociaciones) |

El mapa editable **sustituye** al export legible (deprecado, §2.7): pasa a ser el único mapa de propiedades en Drive y toma el slot `PROPERTY_MAP_FEATURE_KEY`. El Doc de estado companion (JSON, `PROPERTY_STATE_FEATURE_KEY`) se **conserva** como round-trip fiel.

### 2.2 Mecánica adoptada del skill `mapa-de-campos`

El skill produce un `.xlsx` con:

- **`Leyenda`** — significado de columnas y estados.
- **Una pestaña por objeto**: bloque HubSpot (`Custom | Name | Internal name | Type | Unique | Options | Group | Description | Read-only / Schema`) + un bloque por cada origen aplicable (`<Origen> Field name | <Origen> Origin | <Origen> Comments`). Datos desde la fila 3; `freeze C3`.
- **`Listas`** (oculta) — alimenta los desplegables.
- **`Origen <sistema>`** por origen — catálogo de campos con `→ Propiedad HubSpot destino` **calculada** (`=IFERROR(IF(INDEX(...)=0,"",INDEX(...)),"")`, INDEX/MATCH contra la columna `Internal name` de la pestaña del objeto).
- **`Asociaciones`** — tabla registro↔registro.
- Desplegables: `Custom` (`No` / `Yes (Pending)` / `Yes (Created)`, con `Yes (Pending)` resaltado en lima); `<Origen> Field name` (catálogo de ESE origen para ESE objeto, con el mapeo conocido preseleccionado); `<Origen> Origin` (`Migration` / `Integration`).
- Origen adicional para la misma propiedad → fila «↳» que hereda el `Internal name` padre.
- Claves de carga → sin `Internal name`, nombre descriptivo.

### 2.3 Reimplementación en TypeScript sobre Sheets API v4

El skill es Python + openpyxl y lee ficheros locales. El runtime de la app es Electron/TS y escribe en Drive vía la Sheets API v4 (SPEC-0004). Por tanto **no** se ejecuta el script del skill: se **reimplementa su estructura** como un builder puro en TS que emite hojas para el conector existente. Correspondencias:

- Desplegables → `setDataValidation` (`ONE_OF_LIST`), como ya hace `buildStyleRequests` para la columna `Estado` (SPEC-0006 §19).
- Destino calculado → celdas con fórmula (`userEnteredValue.formulaValue` / escritura `USER_ENTERED`). **Verificar/ampliar** el soporte de fórmulas del writer actual (§4).
- Hoja `Listas` oculta → `hiddenByUser`/`sheetState: 'HIDDEN'`.
- Sin protección → **no** se emite `addProtectedRange` para este documento.
- Marca CD → se reutiliza `connectors/google-drive/brand.ts` (SPEC-0012).

### 2.4 Decisiones (validadas 2026-07-07 — implementación pendiente)

- **D1 — Documento separado.** Nuevo documento con su propio `featureKey`, no un modo del Sheets de export. **Motivo:** (1) el export es un artefacto **protegido de solo lectura** cuya fuente de verdad es la app y cuyo round-trip fiel va por el Doc companion JSON (SPEC-0004 §15.5); el mapa de planificación es lo contrario —**editable**, provisional, rellenado por el cliente— y mezclar ambos en un mismo libro obligaría a proteger unas hojas y dejar otras abiertas, rompiendo la garantía «todo el libro es de solo lectura» de SPEC-0006 §19.2. (2) Tienen estructuras distintas (el export separa por objeto con `Campos`/`Definicion`/`Fuentes`/`Opciones`; el planning sigue el layout del skill con bloques HubSpot+origen y desplegables). (3) Ciclos de vida independientes: el export se regenera desde el estado en cada «Actualizar archivo en Drive»; el planning lo edita el cliente entre medias y no debe sobrescribirse. (4) La ingest (D3) parsea el planning; tener un documento con propósito único evita ambigüedad sobre qué se lee. Coste: un documento más en la carpeta de Drive.
- **D2 — Origen de los catálogos de campos: opción (a) [VALIDADA].** `OriginObject` (SPEC-0006 §16.11) gana `fields?: string[]`, poblable importando/pegando las cabeceras del export del sistema origen. Alimenta los desplegables `<Origen> Field name` reproduciendo fielmente el skill. Bloqueante para generar el documento.
- **D3 — Ingest de vuelta con alerta + changelog [VALIDADA].** La app lee el Sheets de planificación rellenado y genera **borradores** de `PropertyEntry` (nunca sobrescritura silenciosa; contrasta con el round-trip fiel del export, que sigue yendo por el Doc JSON, SPEC-0004 §15.5). **Requisito obligatorio:** si el documento existe y contiene cambios respecto al estado actual del proyecto, **antes de pasar nada a borrador** la app debe (1) **alertar** al usuario de que hay una actualización del mapeo y (2) mostrarle un **log de cambios** (altas, bajas, modificaciones de mapeo/definición, tipos que requieren acción —§2.4 D6—). Solo tras la **confirmación explícita** del usuario sobre ese changelog se crean los borradores. Ver el flujo en §2.6. Depende de D6.
- **D4 — Hoja `Asociaciones`: solo informativa [VALIDADA].** Registro↔registro + notas, como referencia de planificación. **No** participa en la ingest (D3) ni genera borradores; no es gestión de asociaciones CRM (sigue fuera de alcance de SPEC-0006).
- **D5 — Exposición por MCP: todo [VALIDADA].** Además de la UI, se exponen tools MCP para generar el documento, ejecutar la ingest (devuelve el changelog), aplicar la ingest a borradores (acuse del changelog), resolver tipos de campo ambiguos (D6) y poblar el catálogo de campos (D2). Las tools que mutan estado llevan el **gate de guía** (SPEC-0005 §15/§18). Ver §4.5.
- **D6 — Catálogo de tipos de campo user-friendly (bloqueante, VALIDADA).** El cliente no debe elegir combinaciones técnicas `type`+`fieldType` de HubSpot. Se ofrece un **listado user-friendly** (texto, texto largo, texto enriquecido, número, moneda, porcentaje, teléfono, fecha, fecha y hora, desplegable, selección múltiple/casillas, sí/no, fichero, cálculo…) y cada uno se **mapea a una o varias configuraciones de HubSpot** (`type`+`fieldType` [+`numberDisplayHint`/`showCurrencySymbol` cuando aplique]). Reglas:
  - Si el tipo user-friendly mapea a **una sola** configuración → se resuelve automáticamente.
  - Si mapea a **varias** → el campo se marca **«necesita acción»** y se solicita al usuario que indique de qué tipo de campo se trata (elige la configuración HubSpot concreta). Esto aplica **en la UI y por MCP** (§4.5).
  - El catálogo user-friendly→config se apoya en el mapeo compartido `FIELD_TYPES_BY_TYPE` (SPEC-0006 §16.3 / SPEC-0007 §4); cualquier cambio se mantiene sincronizado en ambos sitios. La discrepancia `phone_number` (legacy `string`+`phonenumber` vs. `2026-03` `phone_number`) se resuelve adoptando la versión de API más alta (CLAUDE.md / SPEC-0006 §28).

### 2.6 Flujo de ingest con alerta + changelog (D3)

1. El usuario (o una tool MCP) solicita importar el mapa de planificación.
2. La app localiza el documento por `featureKey`; si no existe, informa y termina.
3. Lee el contenido rellenado y lo **compara** con el estado actual (`PropertyEntry[]` + orígenes). Produce un **changelog** estructurado: entradas nuevas, eliminadas, mapeos origen↔campo modificados, definiciones cambiadas y **tipos que necesitan acción** (D6, ambiguos o sin resolver).
4. Si el changelog está **vacío**, informa «sin cambios» y termina.
5. Si hay cambios, **alerta** al usuario y muestra el changelog. En la UI, un diálogo de revisión; por MCP, la tool de ingest **devuelve** el changelog sin aplicar nada.
6. Solo con **confirmación explícita** (botón de la UI / segunda tool MCP de aplicación con acuse) se generan los **borradores** de `PropertyEntry`. Los tipos «necesita acción» no resueltos **bloquean** su entrada hasta que el usuario los resuelva (§2.4 D6).
7. Los borradores quedan para revisión en la app; **no** se aplican cambios en HubSpot (eso sigue en SPEC-0006/0007).

### 2.5 Restricciones

- Sin dependencias npm nuevas (SPEC-0000 §11); todo sobre Sheets API v4 ya en uso.
- i18n obligatorio en los 7 idiomas y tooltips de campos rellenables (SPEC-0000 §3).
- Erratas de nombres/claves de items se reflejan tal cual, no se corrigen (SPEC-0000 / preferencia del usuario).
- **Límite de tamaño (Drive/Sheets):** un Google Sheets admite **10 M de celdas** en total (todas las pestañas) y **18.278 columnas**; se alcanza el que llegue primero. Para un mapa de propiedades (cientos–miles de filas) no es una restricción práctica. Consideración de **rendimiento**: por encima de ~100.000 filas el editor se ralentiza y las celdas en blanco cuentan para el tope, así que el builder no debe dejar rangos vacíos grandes (dimensionar filas/columnas al contenido). Los Sheets nativos **no consumen cuota** de Drive.

### 2.7 Deprecación en SPEC-0006 / SPEC-0012

Al pasar este SPEC a IMPLEMENTADO se marcan como **DEPRECATED** (no se borran; se anotan con remisión a SPEC-0016):

- **SPEC-0006 §18** — `buildPropertyMapTabs` / `sheets-model.ts` como export legible: sustituido por `planning-model.ts` (§4.2).
- **SPEC-0006 §19** — estilo + bloqueo (rangos protegidos) del Sheets de propiedades: el nuevo documento es **editable, sin protección**.
- **SPEC-0006 §32** y **SPEC-0012 §2.3 / §12 / §13** — layout por objeto del Sheets de propiedades (`Campos`/`Definicion`/`Fuentes`/`Opciones`/`DefOpciones`), separación por objeto y `numberFormat`: sustituidos por la estructura del skill (§2.2). SPEC-0012 **sigue vigente** para el Doc de estado y para los Sheets de otras features.
- **Acción «Actualizar archivo en Drive»** (SPEC-0006 §21.1): pasa a generar el mapa editable en lugar del export protegido; conserva crear-o-actualizar y `lastWrittenAt`, y el slot `PROPERTY_MAP_FEATURE_KEY`.

**Se conserva (no se deprecia):**

- **Doc de estado companion** (JSON, `PROPERTY_STATE_FEATURE_KEY`, SPEC-0006 §21.2 / SPEC-0004 §15.5): round-trip fiel de estado, invisible al cliente. «Cargar desde Drive» mantiene la restauración fiel desde el JSON; la ingest del mapa editable (§2.6) es una vía **adicional** (cliente rellena → changelog → borradores), no lo sustituye.
- **Decisión a validar:** si se prefiere retirar también el Doc de estado companion y que la única carga sea la ingest del mapa editable, indicarlo (se perdería el round-trip 100 % fiel; la ingest es *lossy* y va a borradores por diseño).

---

## 3. Interfaz de usuario

- Nueva acción en la pantalla de Propiedades: **«Generar mapa de planificación»** (junto a «Actualizar archivo en Drive» / «Exportar JSON»). Requiere cuenta de Google conectada y carpeta seleccionada; si falta, el aviso lo indica.
- Estados de carga y respuesta inmediata según SPEC-0002 §17 (skeleton/spinner, `aria-busy`).
- Feedback de éxito (id del documento) / error vía Snackbar compartido (SPEC-0002 §10).
- **(D2)** Modal de catálogos de campos por origen: por cada `DataOrigin` y objeto, subir/pegar la lista de campos disponibles del sistema origen.
- **(D3) Acción «Importar planificación rellenada»** → ejecuta el flujo de §2.6. Abre un **diálogo de revisión del changelog** (altas/bajas/modificaciones/tipos que necesitan acción) que el usuario debe **confirmar** antes de que se generen borradores. Reutiliza `ConfirmDialog` (SPEC-0002 §11) ampliado con la lista de cambios; si no hay cambios, Snackbar «sin cambios».
- **(D6) Resolución de tipo de campo**: cuando un tipo user-friendly mapea a varias configuraciones de HubSpot, el campo aparece marcado **«necesita acción»** (badge) y un control (select) pide al usuario la configuración concreta. Bloquea el paso a borrador hasta resolverse.
- Todos los campos rellenables con tooltip i18n (SPEC-0000 §3, componente `FieldTooltip`). Claves `properties.planningMap.*`.

---

## 4. Modelo de datos / contratos de API

### 4.1 Constantes y tipos

- `PLANNING_MAP_FEATURE_KEY = 'property-planning-map'` (documento Drive independiente del export).
- Reutiliza `PropertyEntry`, `EntrySource`, `DataOrigin`, `HubSpotProperty` (SPEC-0006).
- **(D2)** `OriginObject` gana `fields?: string[]` (catálogo de campos del origen para ese objeto).
- **(D6) Catálogo de tipos user-friendly** en `shared/types/planning.ts`:

```typescript
// Configuración concreta de HubSpot a la que resuelve un tipo user-friendly.
interface HubSpotFieldConfig {
  type: HsPropertyType;            // string | number | enumeration | bool | date | datetime | ...
  fieldType: string;              // text | textarea | number | select | ...
  numberDisplayHint?: string;     // currency | percentage | duration (para número/moneda/%)
  showCurrencySymbol?: boolean;   // moneda
}

// Un tipo user-friendly puede resolver a 1..N configuraciones.
interface UserFriendlyFieldType {
  key: string;                    // 'text' | 'long_text' | 'currency' | 'phone' | ...
  // label i18n vía properties.planningMap.fieldTypes.<key>
  configs: HubSpotFieldConfig[];  // 1 → auto; >1 → «necesita acción»
}
```

- **Changelog de ingest** (`PlanningChangelog`): listas de altas/bajas/modificaciones de entradas y mapeos, y `needsAction[]` (tipos user-friendly ambiguos sin resolver). Es el objeto que se muestra/confirma antes de crear borradores (§2.6).
- **`PlanningAssociation`** (D4, informativa): `{ objetoA, objetoB, claveEnlace, notas }`. No entra en la ingest.

### 4.2 Builder puro

`property-management/planning-model.ts`:

```typescript
buildPlanningWorkbook(input: {
  entries: PropertyEntry[];
  origins: DataOrigin[];
  hubspotCatalog?: Record<string, HubSpotPropertyDef[]>; // por objectType (opcional)
  associations?: PlanningAssociation[];
}): PlanningWorkbook

interface PlanningWorkbook {
  tabs: SheetTab[];              // Leyenda, objetos, Origen <sistema>, Asociaciones, Listas
  hiddenTabs: string[];         // ['Listas']
  validations: PlanningValidation[]; // Custom/Origin (oneOf) y Field name (listRange)
  formulaTabs: string[];        // hojas Origen <sistema> (destino calculado, USER_ENTERED)
}
```

Emite: `Leyenda`, una pestaña por objeto (bloque HubSpot + bloques por origen aplicable con sus desplegables), `Listas` (oculta), `Origen <sistema>` por origen (con la columna de destino calculada), `Asociaciones`. Puro y testeable, sin dependencias de Drive. **Devuelve `PlanningWorkbook`** (no `SheetTab[]`): además de las hojas, lleva los desplegables (`validations`), la hoja oculta (`hiddenTabs`) y las hojas con fórmula (`formulaTabs`) para que el conector (§4.3) las aplique.

### 4.3 Ampliación del writer (a verificar)

Comprobar si `SheetTab` / `writeSpreadsheet` (SPEC-0004 §26, escritura por `values*`) soporta hoy:

- Celdas con **fórmula** (escritura `USER_ENTERED` o `formulaValue`) — necesario para el destino calculado.
- **Validación de datos por celda** fuera de la columna `Estado` — hoy la emite `buildStyleRequests`; extender a las columnas `Custom`/`Field name`/`Origin` de este documento.
- Hoja **oculta** (`Listas`).

Si algo no está soportado, ampliarlo en el conector (parte del alcance de este SPEC, anotándolo también en SPEC-0004).

### 4.4 IPC

| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `properties:write-planning-map` | renderer → main | `{ projectId }` | `{ success, spreadsheetId?, error? }` |
| `properties:import-planning-map` | renderer → main | `{ projectId }` | `{ success, changelog?, error? }` — solo compara y devuelve el changelog (§2.6), no aplica |
| `properties:apply-planning-import` | renderer → main | `{ projectId, resolutions }` | `{ success, drafts?, blocked?, error? }` — crea borradores tras confirmar; `blocked` = tipos «necesita acción» sin resolver |
| `origins:set-object-fields` | renderer → main | `{ projectId, originId, objectId, fields }` | `DataOrigin` (D2; devuelve el origen completo actualizado, coherente con `origins:update` y el store) |

### 4.5 Herramientas MCP (D5 — todo)

Todas registradas por esta feature. Las que mutan estado llevan `requiresGuidance` (SPEC-0005 §15/§18).

| Tool | Muta | Descripción |
|------|------|-------------|
| `planning_field_types` | No | Devuelve el catálogo user-friendly→config (D6) e indica cuáles son ambiguos (`configs.length > 1`) |
| `planning_write_map` | Sí (artefacto Drive) | Genera/actualiza el documento editable de planificación |
| `planning_import_map` | No | Ejecuta la comparación (§2.6) y **devuelve el changelog** sin aplicar |
| `planning_apply_import` | Sí | Crea borradores tras **acuse del changelog**; los tipos «necesita acción» sin resolver bloquean su entrada |
| `planning_resolve_field_type` | Sí | Resuelve un campo ambiguo indicando la `HubSpotFieldConfig` elegida (D6) |
| `origins_set_object_fields` | Sí | Puebla el catálogo de campos de un origen para un objeto (D2) |

El par `planning_import_map` (lee, devuelve changelog) + `planning_apply_import` (aplica con acuse) implementa por MCP el requisito de **alerta + changelog antes de borrador** (§2.6): ninguna tool crea borradores sin que el changelog se haya devuelto y acusado.

---

## 5. Implementación — tareas atómicas

1. **(D6)** `shared/types/planning.ts` + catálogo user-friendly→config apoyado en `FIELD_TYPES_BY_TYPE` (SPEC-0006 §16.3 / SPEC-0007 §4); marca de ambigüedad («necesita acción»).
2. **(D2)** Ampliar `OriginObject` con `fields?: string[]` y su gestión (subir/pegar) en el modal de Orígenes + canal `origins:set-object-fields`.
3. **`planning-model.ts`** — builder puro con las hojas del skill (§2.2): `Leyenda`, tab por objeto (bloque HubSpot + bloques por origen con desplegables), `Listas` oculta, `Origen <sistema>` con destino calculado (INDEX/MATCH contra `Internal name`), `Asociaciones` (informativa, D4). Scoping de orígenes por objeto, filas «↳», claves de carga.
4. **Conector Drive** — verificar/ampliar soporte de fórmulas (`USER_ENTERED`), validación por celda y hoja oculta (§4.3); reutilizar `brand.ts`; **sin** rangos protegidos.
5. **Ingest (§2.6)** — `planning-import.ts`: lee el documento, compara con el estado, produce `PlanningChangelog`; `apply` crea borradores tras confirmación/acuse; los «necesita acción» sin resolver bloquean.
6. **IPC** — `properties:write-planning-map`, `properties:import-planning-map`, `properties:apply-planning-import`, `origins:set-object-fields` + `preload` + `RevOpsApi`.
7. **Tools MCP (§4.5)** — las 6 tools, con `requiresGuidance` en las que mutan; registro en `mcp/registry` y ampliación de la guía de la feature.
8. **UI** — acción «Generar mapa de planificación», acción «Importar planificación rellenada» con **diálogo de revisión del changelog** (confirmación previa), control de resolución de tipo «necesita acción», modal de catálogos de campos; feedback + tooltips; claves i18n `properties.planningMap.*` en los 7 idiomas.
9. **Deprecación (§2.7)** — anotar DEPRECATED con enlace a SPEC-0016 en SPEC-0006 §18/§19/§32 y SPEC-0012 §2.3/§12/§13; redirigir la acción «Actualizar archivo en Drive» al mapa editable; retirar el builder/estilo del export legible de propiedades.
10. **Tutorial** `doc/tutoriales/propiedades/crear-mapa-planificacion.md` (canónico `es` + 6 traducciones) + script de paridad.
11. **Tests** (§6).
12. **Commit** — se entregan los comandos al usuario (no se commitea automáticamente).

---

## 6. Tests requeridos

### Unitarios (Vitest)
- `planning-model.spec.ts`:
  - Genera `Leyenda`, una pestaña por objeto con bloque HubSpot + un bloque por cada origen aplicable, `Listas` oculta, `Origen <sistema>` por origen y `Asociaciones`.
  - Scoping: un origen solo aparece en las pestañas de los objetos de su catálogo.
  - Desplegables presentes: `Custom` (3 valores), `Field name` (catálogo del origen + mapeo preseleccionado), `Origin` (`Migration`/`Integration`).
  - Fila «↳» para origen adicional (hereda `Internal name`); clave de carga sin `Internal name`.
  - Columna destino de `Origen <sistema>` con fórmula INDEX/MATCH.
  - No emite protección (documento editable).
  - Refleja erratas de items sin corregirlas.
- **(D6)** `planning-field-types.spec.ts` — un tipo user-friendly con una sola config resuelve automático; uno con varias marca «necesita acción»; el catálogo mantiene coherencia con `FIELD_TYPES_BY_TYPE`.
- **(D3)** `planning-import.spec.ts`:
  - Documento sin cambios → changelog vacío, no crea borradores.
  - Con cambios → changelog correcto (altas/bajas/modificaciones); `apply` solo crea borradores tras acuse; nunca sobrescribe el estado ni aplica en HubSpot.
  - Un tipo «necesita acción» sin resolver **bloquea** su entrada (aparece en `blocked`).
  - `Asociaciones` no genera borradores (D4).
- **MCP** `planning-tools.spec.ts` — `planning_apply_import` sin acuse previo del changelog no crea borradores; `requiresGuidance` presente en las tools que mutan (§4.5).

### Funcionales (Playwright)
- La acción genera el documento con el conector mockeado y muestra feedback; a11y (`axe`).
- La importación muestra el **diálogo de changelog** y solo crea borradores tras confirmar; el badge «necesita acción» bloquea hasta resolver el tipo.

---

## 7. Scopes / permisos necesarios

Ninguno nuevo. Se usan los ya concedidos: Drive (`drive.file`, SPEC-0004 §5) y lectura de propiedades HubSpot (`crm.schemas.*.read`, SPEC-0006 §7).

---

## 8. Consideraciones de seguridad

- El documento es editable **por diseño** (entrada del cliente): no lleva rangos protegidos. Es intencional y distinto del export protegido de SPEC-0006.
- No contiene secretos ni credenciales.
- Sin dependencias npm nuevas (SPEC-0000 §11).
- **(D3)** La ingest **alerta + muestra el changelog** y exige **confirmación explícita** antes de crear borradores (§2.6); nunca aplica cambios en HubSpot ni sobrescribe el estado local de forma silenciosa.
- **(D5)** Las tools MCP que mutan estado (`planning_write_map`, `planning_apply_import`, `planning_resolve_field_type`, `origins_set_object_fields`) llevan `requiresGuidance` (SPEC-0005 §15/§18). `planning_apply_import` requiere el acuse previo del changelog devuelto por `planning_import_map`.

---

## 9. Documentación de usuario

Tutorial nuevo en `doc/tutoriales/propiedades/`:

| Fichero | Tarea |
|---------|-------|
| `crear-mapa-planificacion.md` | Generar el mapa de campos editable, rellenarlo con el cliente y (fase 2) reimportarlo como borradores |

Canónico en `es` + traducciones `ca`/`eu`/`en`/`gl`/`pt`/`fr` (SPEC-0009/0014). Actualizar el script de paridad.

---

## 10. Criterios de aceptación

- [ ] El mapa editable **sustituye** al export legible de SPEC-0006 §18/§19 (deprecación anotada y enlazada a SPEC-0016, §2.7); el Doc de estado companion se conserva.
- [ ] Se genera un documento de Drive **editable** (sin protección) con la estructura del skill: `Leyenda`, una pestaña por objeto (bloque HubSpot + bloques por origen), `Listas` oculta, `Origen <sistema>` por origen y `Asociaciones`.
- [ ] Los desplegables `Custom`, `Field name` (scoping por objeto) y `Origin` funcionan; `Yes (Pending)` resaltado en lima.
- [ ] La columna `→ Propiedad HubSpot destino` de las hojas de origen es calculada y devuelve vacío si el campo no se usa.
- [ ] Identidad CD aplicada (marca compartida, sin lima sobre oscuro salvo badge).
- [ ] El catálogo de tipos user-friendly (D6) resuelve automáticamente los 1:1 y marca «necesita acción» los ambiguos, pidiendo al usuario la configuración de HubSpot — en UI y por MCP.
- [ ] La importación **alerta y muestra el changelog** y solo crea borradores tras confirmación explícita (§2.6); sin cambios → «sin cambios»; nunca sobrescribe estado ni aplica en HubSpot.
- [ ] La hoja `Asociaciones` es solo informativa (no genera borradores).
- [ ] Las 6 tools MCP (§4.5) están registradas; las que mutan llevan `requiresGuidance` y `planning_apply_import` exige acuse del changelog.
- [ ] i18n en los 7 idiomas y tooltips en los campos rellenables.
- [ ] Tests unitarios (builder, tipos, ingest, MCP) en verde; a11y del flujo.
- [ ] Tutorial creado en los 7 idiomas.
- [ ] Decisiones D1–D6 validadas por el usuario antes de implementar.
- [ ] PR creada, revisada y mergeada (gestión Git del usuario).

---

## 11. Alcance — qué NO toca

- **Sustituye** el export legible de SPEC-0006 §18/§19 (deprecación en §2.7); **conserva** el Doc de estado companion y su round-trip fiel (SPEC-0004 §15.5).
- No gestiona asociaciones CRM reales (la hoja `Asociaciones` es solo planificación).
- No crea propiedades ni objetos en HubSpot; no aplica cambios (eso sigue en SPEC-0006/0007).
- No añade dependencias ni ejecuta el script Python del skill (se reimplementa en TS).

---

## 12. Notas de implementación

### 12.1 Incremento 1 — Tipos + catálogo de tipos user-friendly (2026-07-07)

- **`src/renderer/shared/types/planning.ts`** (nuevo): `HubSpotFieldConfig`, `UserFriendlyFieldType`/`UserFriendlyFieldTypeKey`, `PlanningAssociation` (D4), `PlanningChange`/`PlanningNeedsAction`/`PlanningChangelog` (D3/§2.6).
- **`src/renderer/shared/constants/planningFieldTypes.ts`** (nuevo): `USER_FRIENDLY_FIELD_TYPES` (18 tipos) + helpers `configsFor`/`isAmbiguous`/`resolveUserFriendlyType`/`isConfigConsistent`. Ubicado junto a `hubspotPropertyTypes.ts` (misma convención de nombre camelCase del directorio `constants`). Reutilizable por main (MCP) vía alias `@shared`.
- **Coherencia con `FIELD_TYPES_BY_TYPE`** (SPEC-0006 §16.3): toda `HubSpotFieldConfig` del catálogo se valida contra ese mapeo en el test (no diverge).
- **Ambigüedad (D6):** `choice` (select/radio/checkbox) y `calculation` (number/string/enumeration) resuelven a >1 config → «necesita acción»; el resto son 1:1 y se resuelven solos. `phone` → `string`/`phonenumber` (versión más alta de API, CLAUDE.md / SPEC-0006 §28); `currency` lleva `numberDisplayHint:'currency'`+`showCurrencySymbol`; `email` es `string`/`text`+`textDisplayHint:'email'`.
- **Código ASCII** (sin acentos/guillemets) para evitar la corrupción del espejo del sandbox y poder ejecutar Vitest aquí; las etiquetas visibles irán por i18n, no en estos ficheros.
- **Verificación (sandbox):** `planningFieldTypes.spec.ts` **5/5** en verde; los 3 ficheros sin bytes no-ASCII. typecheck completo/e2e en la máquina.

### 12.2 Incremento 2 — `OriginObject.fields[]` + `origins:set-object-fields` (2026-07-07)

- **`OriginObject`** (`shared/types/properties.ts`) gana `fields?: string[]` (catálogo de campos del origen por objeto, D2).
- **Tipo `OriginSetObjectFieldsInput`** `{ projectId, originId, objectId, fields }`.
- **Contrato IPC**: canal `origins:set-object-fields` en `ipc.ts` (mapa + `RevOpsApi`), preload y handler en `main/ipc/properties.ts`.
- **Servicio** `service.setObjectFields`: valida que existan origen y objeto (errores `'Origen no encontrado'`/`'Objeto de origen no encontrado'`), **normaliza** los campos (trim + dedupe + descarta vacíos) y marca el proyecto como cambiado.
- **Desviación de §4.4**: devuelve `DataOrigin` (origen completo actualizado) en lugar de `OriginObject`, por coherencia con `origins:update` y el store del renderer; §4.4 actualizado.
- **Test** añadido a `service.spec.ts` (normalización + validación).
- **Verificación:** el espejo del sandbox **trunca** `service.ts`/`service.spec.ts` (ficheros con no-ASCII editados) e impide correr Vitest aquí; **originales verificados sanos** por lectura directa (`service.ts` completo: `setObjectFields` def. + exportado; `service.spec.ts` 743 líneas con cierre correcto). Un spec ASCII temporal aislado confirmó el mismo bloqueo del espejo (importa `service.ts`) y se retiró. typecheck/test:unit en la máquina.

### 12.3 Incremento 3 — `planning-model.ts` (builder del skill) (2026-07-07)

- **`src/main/property-management/planning-model.ts`** (nuevo): `buildPlanningWorkbook` puro + `PLANNING_MAP_FEATURE_KEY='property-planning-map'`, `PLANNING_SCHEMA_VERSION=1`. Emite Leyenda, una pestaña por objeto (cabeceras del skill en inglés: `Custom/Name/Internal name/Type/Unique/Options/Group/Description/Read-only / Schema` + `<Origen> Field name/Origin/Comments` por origen aplicable), `Origen <sistema>` con destino calculado `=IFERROR(IF(INDEX(...)=0,"",INDEX(...)),"")` (INDEX/MATCH contra la col `C` = Internal name), `Asociaciones` (informativa, D4) y `Listas` (oculta) que alimenta los desplegables.
- **Devuelve `PlanningWorkbook`** (`§4.2` actualizado): `tabs` + `hiddenTabs` (`Listas`) + `validations` (Custom/Origin `oneOf`, Field name `listRange`) + `formulaTabs` (las hojas Origen). El conector (incr. 5) aplicará desplegables/fórmula/oculta.
- **Scoping por objeto:** un origen solo aparece en la pestaña de un objeto si alguna entrada de ese objeto tiene una fuente de ese origen; el catálogo de Field name usa los `OriginObject.fields` referenciados (o todos) + los campos ya mapeados (preseleccionados).
- **ASCII + imports de solo tipo:** `planning-model.ts` no importa valores de ficheros con no-ASCII (solo `import type` de `properties`/`planning`), así esbuild los borra y **Vitest corre en el sandbox**. Cabeceras del skill en inglés (ASCII); flecha `->` ASCII; leyenda en castellano sin acentos. La presentación con acentos/i18n se refina en la capa de estilo/UI.
- **Fuera de este builder:** filas «↳» (origen adicional) y «claves de carga» del skill no tienen equivalente en el modelo actual (`EntrySource` no modela roles); se omiten (anotado).
- **Verificación (sandbox):** `planning-model.spec.ts` **9/9** en verde (Leyenda, scoping contacts/deals, Custom por modo, preselección de campo, validaciones Custom/Origin/Field name, `Listas` oculta, Origen con fórmula INDEX/MATCH, Asociaciones). typecheck completo en la máquina.

### 12.4 Incremento 4 — Ingest + changelog `planning-import.ts` (2026-07-07)

- **`src/main/property-management/planning-import.ts`** (nuevo, puro): `parsePlanningTabs` (inverso del builder; identifica las pestañas de objeto por `A1==='Custom'`, localiza columnas por cabecera y mapea los bloques de origen por nombre → `originId`), `buildPlanningChangelog` y `ingestPlanning`.
- **Changelog (SPEC-0016 §2.6):** `entry-added` (clave objeto|internalName no presente en el estado), `entry-removed` (entrada del estado ausente del mapa), `mapping-changed` (difiere el campo origen de alguna fuente), `definition-changed` (difiere el valor de la columna `Type`). **No crea borradores** — solo describe.
- **Needs-action (D6):** una fila cuyo `Type` es una key user-friendly **ambigua** (`choice`, `calculation`) entra en `needsAction` con sus `candidates` (para pedir la config concreta antes de pasar a borrador).
- **Desacoplado del builder:** no importa `planning-model.ts` (parsea por estructura de cabecera), así su cadena de imports de valor pasa solo por ASCII no editado (`planningFieldTypes` → `hubspotPropertyTypes`) y es testeable.
- **objectType = título de pestaña** (el layout del skill no lleva columna `Objeto`); para objetos estándar/custom el saneado no altera el id, así que coincide (limitación anotada).
- **La columna `Type` como entrada user-friendly** (dropdown del builder) se añade con la capa de estilo/validaciones (incr. 5); el parser ya la soporta.
- **Verificación (sandbox):** el espejo corrompió `planning-import.ts` con bytes nulos al escribir «ñ» inicial (reescrito a ASCII; original sano verificado por lectura). La lógica se validó con una **copia ASCII fresca** (`_piv`) → **5/5** en verde (identico→sin cambios, mapping-changed, entry-added, entry-removed, needs-action `choice`); copia retirada. `planning-import.spec.ts` (canónico) corre en la máquina.
- **Fix de tooling (pre-commit, SPEC-0002 §27):** el hook `.githooks/pre-commit` pasaba a ESLint ficheros que ESLint ya ignora (`ignorePatterns: ['*.config.ts']`), provocando el warning «File ignored» que cortaba el commit. Se alinea excluyendo `*.config.ts` del listado staged. Los ficheros nuevos deben pasar `npx prettier --write` (paso de Prettier del propio hook).

### 12.5 Incremento 5 — Conector: estilo/validaciones editables + write-path (2026-07-07)

- **`connectors/google-drive/planning-style.ts`** (nuevo, puro): `buildPlanningStyleRequests(sheets, workbook)` → requests de `batchUpdate`: marca CD en cabeceras (reutiliza `brand.ts`), banding, wrap, anchos, congelado; **desplegables** desde `workbook.validations` (`ONE_OF_LIST` para Custom/Origin/Type, `ONE_OF_RANGE` `=Listas!...` para Field name); **oculta** `Listas` (`updateSheetProperties.hidden`); **sin `addProtectedRange`** (editable, D1); idempotente (limpia bandas/protecciones previas).
- **Builder (planning-model.ts):** añadido el desplegable de la columna `Type` (`TYPE_VALUES` = keys de `USER_FRIENDLY_FIELD_TYPES`, D6) como validación `oneOf` en cada pestaña de objeto.
- **Write-path (`sheets-client.ts`):** `writePlanningWorkbook(input)` (find/create por `featureKey`, `syncTabs`, clear, `valuesBatchUpdate` con **`USER_ENTERED`** para que las fórmulas de destino calculen, y `buildPlanningStyleRequests`). Interfaz `SheetsRawApi.valuesBatchUpdate` gana `valueInputOption?` y el wiring (`index.ts`) usa `args.valueInputOption ?? 'RAW'` (export intacto en RAW).
- **Layering:** `planning-style.ts`/`sheets-client.ts` importan **el tipo** `PlanningWorkbook` de `property-management/planning-model` (import de solo tipo; sin regla de import que lo prohíba). Posible refactor futuro: mover los tipos a `@shared/types/planning`.
- **Verificación:** `planning-style.spec.ts` (6 casos: oculta Listas, sin protección, limpia bandas, Custom `ONE_OF_LIST`, Field name `ONE_OF_RANGE`, cabecera de marca) **no ejecutable en sandbox**: el espejo degradó `package.json`/`tsconfig.json` con bytes nulos y Vitest ya no arranca en esta sesión. Ficheros nuevos con **0 bytes no-ASCII** (verificado). typecheck/test:unit en la máquina.

### 12.6 Incremento 6 (parte 1) — Write-path IPC + MCP de lectura (2026-07-07)

Implementado (mecánico, patrón de `write-sheets`; **no verificable en sandbox**, typecheck/test en la máquina):

- **Conector façade** (`connectors/google-drive/index.ts`): `writePlanningWorkbook(projectId, name, featureKey, schemaVersion, workbook)` → `client.writePlanningWorkbook` (incr. 5) + registro del fichero gestionado (igual que `writeSpreadsheet`).
- **`drive-docs.ts`**: `writePlanningMap(projectId)` construye el workbook (`buildPlanningWorkbook`) y escribe vía el conector con `PLANNING_MAP_FEATURE_KEY` (documento propio, editable; no toca el Doc de estado companion).
- **IPC** `properties:write-planning-map`: canal en `ipc.ts` + `RevOpsApi` (→ `WriteSheetsResult`), preload y handler en `ipc/properties.ts` (→ `driveDocs.writePlanningMap`).
- **MCP** `planning_field_types` (lectura, sin gate): devuelve el catálogo user-friendly con `configs` y `ambiguous` (D6). Registrada en `registerPropertyTools`. Test aprobado `mcp-tools.spec.ts` actualizado (lista `READ_TOOLS` + conteo 25→26; autorizado por este SPEC, SPEC-0000 §8).

**Diferido a 6 (parte 2)** por requerir capacidad/decisión nuevas:

- **Ingest (D3/§2.6):** leer el Sheets rellenado necesita una **capacidad de lectura de valores de Sheets** en el conector (hoy solo escribe; «Cargar desde Drive» del export lee el Doc JSON, no el Sheets). Se añadirá `readSpreadsheetTabs` (Sheets `values.batchGet`) + `drive-docs`/IPC `properties:import-planning-map` y `properties:apply-planning-import`.
- **Tools MCP de escritura/ingest (`planning_write_map`, `planning_import_map`, `planning_apply_import`, `planning_resolve_field_type`, `origins_set_object_fields`):** requieren que las tools MCP accedan a **Drive** (hoy `registerPropertyTools` solo recibe `service`). Decisión de diseño: pasar un **orquestador con Drive** (estilo `drive-docs`) al registro de tools. Con el gate de guía (`requiresGuidance`) en las que mutan.

### 12.7 Incremento 6 (parte 2a) — Lógica de apply `buildDraftEntries` (2026-07-07)

- **`planning-import.ts`**: `buildDraftEntries(parsed, state, resolutions?)` → `{ drafts, blocked }` (puro, SPEC-0016 §2.6 paso «apply»). Convierte filas parseadas en borradores `PropertyEntry` (`EntryUpsertInput['entry']`): `Custom='No'`→modo existing; `Custom='Yes (Pending)'`→modo new con la `HubSpotFieldConfig` resuelta (1:1 o aportada por el usuario). Las filas nuevas con tipo ambiguo **sin resolver** se devuelven en `blocked` (no se crean, D6). Las filas existentes **reutilizan el id** de la entrada actual (update, no duplica). `id` de source vacío → lo asigna el servicio (`upsertEntry`, SPEC-0006 §41). Tipo `kind` de la fuente inferido del `type` destino.
- **Tests** (máquina) en `planning-import.spec.ts`: existente reutiliza id, nueva 1:1 (text→string/text) sin id, ambigua sin resolver → `blocked`, ambigua resuelta → borrador con la config elegida.
- **Pendiente 6-parte-2b:** lectura de valores de Sheets en el conector (`valuesBatchGet`/`readTabs`), orquestación `drive-docs` (`readPlanningTabs`/`importPlanningMap`/`applyPlanningImport` que llama a `buildDraftEntries` + `service.upsertEntry`), IPC `import`/`apply`, y las tools MCP con el orquestador Drive.

### 12.8 Incremento 6 (parte 2b) — Ingest end-to-end + tools MCP con Drive (2026-07-07)

Implementado (cableado; **verificación en la máquina**):

- **Conector — lectura de Sheets:** `SheetsRawApi.valuesBatchGet` (interfaz) + wiring (`spreadsheets.values.batchGet`); `sheets-client.readManagedTabs(folderId, featureKey)` (get titulos → batchGet valores → `SheetTab[]`); façade `readPlanningWorkbookTabs(projectId, featureKey)` en el conector.
- **`drive-docs.ts`:** `importPlanningMap(projectId)` → lee tabs + `ingestPlanning` → `{ success, changelog }` (no crea borradores); `applyPlanningImport(projectId, resolutions)` → lee tabs + `parsePlanningTabs` + `buildDraftEntries` + `service.upsertEntry` por borrador → `{ success, applied, blocked }`.
- **Tipos compartidos:** `PlanningResolution` movido a `@shared/types/planning` (fuente única; `planning-import` lo reexporta) + `PlanningImportResult`/`PlanningApplyResult`/`PlanningApplyInput`.
- **IPC:** `properties:import-planning-map` (→ `PlanningImportResult`) y `properties:apply-planning-import` (`PlanningApplyInput` → `PlanningApplyResult`): canales, `RevOpsApi`, preload y handlers (`ipc/properties.ts` → `driveDocs`).
- **Tools MCP (`planning-mcp-tools.ts`, `registerPlanningTools`)** con acceso a Drive (orquestador inyectado; registrado en `index.ts` tras crear `driveDocs`): `planning_write_map` (gated), `planning_import_map` (lectura, devuelve changelog), `planning_apply_import` (gated, `resolutions`), `planning_resolve_field_type` (lectura), `origins_set_object_fields` (gated). **featureKey propio `property-planning`** con su guía (evita el throw de `guidanceRegistry.register` por duplicado de `property-management`). El par import(read)+apply(acuse) implementa por MCP el requisito de alerta+changelog antes de borrador (§2.6).
- **Fixes de typecheck (máquina):** anotación del parámetro `r` en el `map` de `valuesBatchGet` (`index.ts`, evita `implicit any`); mock `valuesBatchGet` añadido a `sheets-client.spec.ts` (test aprobado, autorizado por SPEC-0016 / SPEC-0000 §8, por el nuevo método obligatorio de `SheetsRawApi`).
- **Pendiente:** unit test de `planning-mcp-tools` (no añadido para no introducir test sin verificar en sandbox); UI + i18n×7 + tutorial (incremento 7); deprecación efectiva del export legible (sustitución de la acción, §2.7).

### 12.9 Incremento 7a — UI (generar/importar + changelog) + i18n×7 (2026-07-07)

- **`PlanningMapActions.tsx`** (nuevo, `property-management/components`): botones **«Generar mapa de planificación»** (`propertiesWritePlanningMap`) e **«Importar planificación»** (`propertiesImportPlanningMap` → si hay cambios abre un **diálogo de changelog** con `changes` + `needsAction`; confirmar → `propertiesApplyPlanningImport` con `resolutions=[]`; notifica `applied` y `blocked`). Sin cambios → aviso «sin cambios». Reutiliza `BusyButton`/`useSnackbar`; `onApplied` recarga las entradas.
- **Wiring:** insertado en `PropertyManagementScreen` junto a `DriveDocActions`.
- **i18n:** claves `properties.planningMap.*` (incl. `kind.*`) en los **7 locales** (paridad).
- **Pendiente 7b/7c:** resolución de tipo «necesita acción» inline (ahora `resolutions=[]`; los ambiguos se informan como `blocked`), modal de catálogo de campos por origen (D2) en `OriginsModal`, tutorial `crear-mapa-planificacion.md` (7 idiomas) y deprecación efectiva del export legible (sustituir la acción, §2.7). Verificación (typecheck/e2e/a11y) en la máquina.
- **Fix colateral (e2e SPEC-0008, no SPEC-0016):** 3 specs de formularios (`forms-flow`, `link-origin`, `new-form`) fallaban por strict mode: `getByRole('checkbox', { name: '<campo>_email' })` sin `exact` colisiona con los toggles «Obligatorio — <campo>» y «Oculto — <campo>» (SPEC-0008 §32) al ser subcadena. Añadido `exact: true` a la aserción del checkbox del campo. `origin-crud` salió *flaky* (pasó en retry), sin cambio. No afecta a código de SPEC-0016.

### 12.10 Incremento 7c (tutorial) — Documentación de usuario (2026-07-07)

- **Tutorial** `doc/tutoriales/propiedades/crear-mapa-planificacion.md` en los **7 idiomas** (`es` canónico + `en`/`ca`/`eu`/`gl`/`pt`/`fr`): generar el mapa, rellenarlo con el cliente y reimportarlo (alerta + changelog → borradores). Paridad de slug verificada (7/7 presentes); `check:tutoriales` en la máquina (el espejo del sandbox corrompe `package.json` y no deja correr npm aquí).
- **Pendiente 7b + 7c-deprecación:** resolución de tipo «necesita acción» inline en el diálogo + modal de catálogo de campos por origen (D2); y la **deprecación efectiva** del export legible (§2.7): retirar `buildPropertyMapTabs`/protección de propiedades y repuntar la acción «Actualizar archivo en Drive» al mapa editable. Es un cambio destructivo (retira el export actual); recomendado hacerlo tras confirmar el mapa editable funcionando en la app.
