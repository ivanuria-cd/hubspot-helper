# SPEC-0013 — Guardado y Portabilidad de Proyectos

**Estado:** IMPLEMENTADO (conciliado 2026-06-24; ver detalle en CLAUDE.md y §11)
**Branch:** feat/spec-0013-guardado-portabilidad-proyectos
**Fecha:** 2026-06-23
**Depende de:** SPEC-0002 (App Shell — modelo `Project`, IPC `projects:*`), SPEC-0004 (Conector Google Drive — documento de estado companion §15.5)

---

## 1. Objetivo

Definir el **guardado completo de un proyecto en un único archivo externo, versionado y compartible**, que pueda exportarse e importarse entre máquinas y usuarios sin pérdida de información, y cuyo formato esté diseñado para **crecer con nuevas características** sin romper la compatibilidad con archivos ya emitidos.

Hoy un proyecto está fragmentado: el registro `Project` vive en `electron-store` local (SPEC-0002 §4), la configuración de conectores son referencias, y el estado de cada característica (propiedades, orígenes, objetos custom, formularios) se serializa por separado en documentos de estado companion en Google Drive (SPEC-0004 §15.5). No existe un artefacto único, portátil y offline que represente «el proyecto entero» y que una persona pueda enviar a otra.

Este SPEC define ese artefacto: un **archivo de proyecto** (extensión `.rvproj`) que empaqueta los metadatos del proyecto y el estado de todas las características en un sobre versionado y extensible, con flujos de exportación e importación en la interfaz y por IPC.

---

## 2. Contexto y decisiones de diseño

### 2.1 Qué se guarda y qué no

- **Se guarda:** metadatos del proyecto (`name`, `description`, fechas), referencias de conectores (`portalId`, `folderId`), y el estado serializado de cada característica que contribuya una sección (propiedades + orígenes, objetos custom, formularios, y futuras).
- **No se guarda (nunca):** credenciales ni secretos — PAT de HubSpot, tokens OAuth de Google, token local del MCP. Coherente con SPEC-0002 §7 (los datos de proyecto no contienen credenciales, solo referencias) y SPEC-0000 §12 (los secretos viven en el keychain del SO vía `keytar`). Al importar en otra máquina, el usuario reconecta los conectores con sus propias credenciales.

### 2.2 Formato del archivo

- **Contenedor ZIP** con extensión `.rvproj`. Internamente: un `manifest.json` (índice + metadatos + integridad), una carpeta `sections/` con un JSON por característica, y una carpeta `resources/` reservada para adjuntos binarios futuros (imágenes, exportaciones, etc.). El ZIP permite crecer a contenido binario sin rediseñar el formato y mantiene cada sección como fichero independiente (diffeable, inspeccionable descomprimiendo).
- **Sobre versionado y autodescriptivo:** el `manifest.json` lleva un `format_version` (versión del contenedor/manifiesto) y, **dentro de cada sección**, el `schema_version` propio de esa característica. Así la evolución del contenedor y la de cada característica son independientes.
- Estructura del archivo:

```
<nombre>.rvproj            (archivo ZIP)
├── manifest.json          # magic, format_version, app_version, exported_at, project meta, índice de secciones, checksum
├── sections/
│   ├── property-management.json
│   ├── custom-objects.json
│   └── forms-management.json
└── resources/             # reservado para adjuntos binarios (vacío por ahora)
```

### 2.3 Reutilización de los serializadores existentes

Cada característica ya tiene su par `serialize`/`parse` con `schema_version` para el documento de estado companion de Drive (SPEC-0004 §15.5: `property-management-state`, `forms-management-state`, `custom-objects-state`). **Este SPEC no reimplementa esa serialización**: define un *registry* de contribuyentes de sección que reutiliza exactamente esos `serialize`/`parse`. El archivo de proyecto es, conceptualmente, la **agregación local y offline en un solo fichero** de lo que en Drive son varios documentos companion por característica.

### 2.4 Extensibilidad (núcleo del SPEC)

El diseño prioriza el crecimiento por nuevas características:

- **Registry de secciones.** Un registro central (`project-file/section-registry.ts`) mapea `featureKey → { serialize, parse, currentSchemaVersion }`. Una característica nueva **solo registra su contribuyente**; export e import la recogen automáticamente sin tocar el núcleo. Mismo principio de «añadir solo aparece» que la sección Ayuda (SPEC-0002 §… tutoriales) y los documentos de Drive.
- **Secciones desconocidas se preservan.** Al importar un archivo que contenga una sección cuya `featureKey` esta versión de la app no conoce, la sección **se conserva intacta** y se vuelve a escribir en el siguiente export (round-trip no destructivo). Esto permite que una app más antigua no destruya datos de una app más nueva al reexportar.
- **Compatibilidad de versión, por capas:**
  - Si `format_version` del archivo es **mayor** que el soportado por la app → abortar import con aviso claro (la app es más antigua que el archivo). Misma regla que SPEC-0004 §15.5.
  - Si una `section.schema_version` es **mayor** que la soportada por su contribuyente → esa **sección** se omite de la carga (no se aplica) pero **se preserva** para el round-trip, y se avisa al usuario de que esa característica no se importó por ser más reciente.
  - Versiones **menores o iguales** → se aplican migraciones hacia adelante (§4.4) y se cargan.
- **Migraciones.** Tanto el sobre (`format_version`) como cada sección (`schema_version`) admiten una cadena de migraciones puras `vN → vN+1`. Las migraciones del sobre viven en el núcleo; las de sección, junto al `parse` de cada característica.

### 2.5 Relación con el guardado existente y no-duplicación

- El **estado vivo** del proyecto sigue siendo el de SPEC-0002 (`electron-store`) + los documentos de Drive (SPEC-0004). Este SPEC **no cambia** dónde vive el estado en uso ni el round-trip §15.5.
- El archivo `.rvproj` es un **artefacto de exportación/importación** (snapshot portátil), no un nuevo almacén operativo. Importar **reconstruye** el proyecto local (crea/actualiza el registro `Project` y aplica el estado de cada sección mediante su `parse`).
- No sustituye a Drive: Drive es sincronización en la nube por característica; `.rvproj` es un fichero único, offline y compartible (correo, chat, repositorio), p. ej. para plantillas de proyecto o traspaso entre consultores.

### 2.6 Identidad e integridad

- Integridad por dos niveles: el `manifest.json` registra el SHA-256 de **cada fichero de sección**; y un `checksum` de nivel superior es el SHA-256 del propio manifiesto canónico **sin** el campo `checksum`. Al importar se verifican ambos y, si no cuadran, se avisa (no se aborta si el contenido es válido y el usuario confirma).
- Saneado de secretos en la **escritura**: el serializador del archivo aplica una pasada que rechaza/elide cualquier clave conocida de secreto (lista de denegación: `pat`, `token`, `accessToken`, `refreshToken`, `clientSecret`, `apiKey`, …) como red de seguridad ante futuras secciones mal diseñadas.

---

## 3. Interfaz de usuario

### 3.1 Exportar proyecto

- **Desde la pantalla de bienvenida:** cada `ProjectCard` (SPEC-0002 §3) expone una acción «Exportar» (menú de overflow del ítem).
- **Desde dentro del proyecto:** acción «Exportar proyecto» en la pantalla de **Configuración** del proyecto.
- Flujo: el usuario pulsa Exportar → diálogo nativo «Guardar como» (proceso main) con nombre por defecto `<slug-del-nombre>-<YYYYMMDD>.rvproj` → se escribe el archivo → confirmación vía Snackbar (SPEC-0002 §10).
- Antes de exportar, si hay cambios pendientes sin sincronizar en alguna característica, se informa de que se exportará el estado local actual (no bloquea).

### 3.2 Importar proyecto

- **Desde la pantalla de bienvenida:** botón «Importar proyecto» junto a «+ Nuevo proyecto».
- Flujo: diálogo nativo «Abrir» filtrando `.rvproj` → la app **valida** el archivo (formato, versión, checksum, saneado) → muestra un **resumen previo** (nombre, descripción, conectores referenciados, lista de secciones con su característica y nº de elementos, avisos de compatibilidad) → el usuario confirma con `ConfirmDialog` (SPEC-0002 §11).
- **Colisión de identidad:** si ya existe un proyecto con el mismo `id`, el usuario elige (mediante diálogo) entre: «Crear copia» (nuevo `id`; **opción por defecto, preseleccionada y con el foco**), «Sobrescribir» (`tone: 'danger'`, requiere confirmación) o «Cancelar».
- Tras importar: el proyecto aparece en la lista y queda activo; un aviso recuerda que **debe reconectar HubSpot y Google Drive** con sus credenciales (no viajan en el archivo).

### 3.3 Estados de carga y a11y

Validación, lectura y escritura son asíncronas: aplicar el patrón de respuesta inmediata (SPEC-0002 §17) — el diálogo de resumen de import aparece al instante con `LoadingState` mientras se valida; botones de Exportar/Importar usan `BusyButton`. Campos rellenables (p. ej. nombre al «Crear copia») con `FieldTooltip` (SPEC-0002 §18). Todo el texto vía i18n en los cuatro idiomas (SPEC-0000 §3).

---

## 4. Modelo de datos / contratos de API

### 4.1 Contenedor `.rvproj` (ZIP) y `manifest.json`

El archivo es un ZIP (§2.2). El `manifest.json` es el índice y portador de metadatos/integridad; el `data` de cada sección vive en su propio fichero bajo `sections/`.

```typescript
interface ProjectManifest {
  magic: 'revops-project';         // identificador de tipo
  format_version: number;           // versión del contenedor/manifiesto (entero, empieza en 1)
  app_version: string;              // versión de la app que lo emitió (informativo)
  exported_at: string;              // ISO 8601
  project: ProjectMeta;             // metadatos + referencias (sin credenciales)
  sections: SectionIndexEntry[];    // índice de las secciones incluidas
  checksum: string;                 // SHA-256 del manifiesto canónico SIN este campo
}

interface SectionIndexEntry {
  feature: string;                  // featureKey, p. ej. 'property-management'
  schema_version: number;           // versión del schema de ESA característica
  file: string;                     // ruta dentro del ZIP, p. ej. 'sections/property-management.json'
  sha256: string;                   // SHA-256 del contenido del fichero de sección
}

// Contenido de cada sections/<featureKey>.json
interface ProjectFileSection {
  feature: string;
  schema_version: number;
  data: unknown;                    // payload producido por el serialize de la característica
}

interface ProjectMeta {
  id: string;                       // uuid del proyecto origen
  name: string;
  description?: string;
  createdAt: string;
  connectors: {
    hubspot?: { portalId: string };        // SOLO referencia, sin PAT
    googleDrive?: { folderId: string };    // SOLO referencia, sin token
  };
}
```

> Nota de erratas (preferencia del proyecto): si en un archivo importado aparecen erratas en nombres de items o en claves dentro de `data`, **no se corrigen automáticamente**; se preservan tal cual y, si procede, se señala su existencia en el resumen de import.

### 4.2 Registry de secciones

```typescript
interface SectionContributor<T = unknown> {
  featureKey: string;                              // p. ej. 'property-management'
  currentSchemaVersion: number;
  serialize(projectId: string): Promise<T> | T;    // estado local → data
  parse(data: unknown, fromVersion: number): T;    // data → estado (con migraciones de sección)
  apply(projectId: string, parsed: T): Promise<void>;  // escribe el estado en el almacén local
}

// Registro central; cada feature llama register(...) en su arranque.
function register(contributor: SectionContributor): void;
function listContributors(): SectionContributor[];
```

Contribuyentes iniciales (reutilizan los `serialize`/`parse` de SPEC-0004 §15.5):
`property-management` (propiedades + orígenes), `custom-objects`, `forms-management`.

### 4.3 Canales IPC nuevos

| Canal | Dirección | Descripción |
|-------|-----------|-------------|
| `projects:export` | renderer → main | Recibe `projectId` + ruta destino; agrega secciones, sanea, calcula checksum y escribe el `.rvproj`. Devuelve la ruta escrita. |
| `projects:export-dialog` | renderer → main | Abre el diálogo nativo «Guardar como» y devuelve la ruta elegida (o cancelado). |
| `projects:import-validate` | renderer → main | Recibe la ruta de un `.rvproj`; lo lee y valida (magic, `format_version`, checksum, saneado) y devuelve el **resumen** sin aplicar nada. |
| `projects:import-apply` | renderer → main | Aplica un import ya validado con la estrategia de colisión elegida (`copy` \| `overwrite`); crea/actualiza el `Project` y ejecuta `apply` de cada sección. Devuelve el `Project` resultante. |
| `projects:import-dialog` | renderer → main | Abre el diálogo nativo «Abrir» filtrando `.rvproj`. |

### 4.4 Migraciones

- **Sobre:** `migrateEnvelope(file, fromVersion): ProjectFile` — cadena pura `vN → vN+1` en el núcleo (`project-file/migrations.ts`). `format_version` inicial = **1**.
- **Sección:** la migración de `data` la realiza el `parse(data, fromVersion)` de cada contribuyente. Regla de compatibilidad en §2.4.

### 4.5 Tipos compartidos

`shared/types/project-file.ts`: `ProjectManifest`, `SectionIndexEntry`, `ProjectMeta`, `ProjectFileSection`, `ImportSummary`, `ImportStrategy`, `SectionContributor`.

---

## 5. Implementación — tareas atómicas

1. **Tipos compartidos** — `shared/types/project-file.ts` (§4.1, §4.5).
2. **Dependencia ZIP** — añadir una librería de empaquetado ZIP (cumpliendo SPEC-0000 §11: antigüedad ≥10 días, `npm audit`, sin hooks de instalación sospechosos); envoltorio en `main/project-file/zip.ts` (lectura/escritura del contenedor).
3. **Registry de secciones** — `main/project-file/section-registry.ts` (`register`, `listContributors`) (§4.2).
4. **Núcleo de export** — `main/project-file/export.ts`: agrega `ProjectMeta` (desde el servicio de proyectos, SPEC-0002) + secciones (vía registry), aplica saneado de secretos (§2.6), escribe cada `sections/<featureKey>.json` con su `sha256`, compone el `manifest.json` con `checksum` y empaqueta el ZIP.
5. **Núcleo de import** — `main/project-file/import.ts`: descomprime, valida (magic/versión, `checksum` del manifiesto y `sha256` por sección), migración del manifiesto, construcción del `ImportSummary`, y `apply` con estrategia de colisión (`copy`/`overwrite`) preservando secciones desconocidas (§2.4).
6. **Migraciones del manifiesto** — `main/project-file/migrations.ts` (esqueleto con `format_version` 1; sin migraciones aún).
7. **Saneado de secretos** — `main/project-file/redact.ts` (lista de denegación + test) (§2.6).
8. **Contribuyentes de sección** — registrar `property-management`, `custom-objects`, `forms-management` reutilizando sus `serialize`/`parse` (SPEC-0004 §15.5) y añadiendo `apply` (sobre los servicios existentes).
9. **IPC** — handlers `projects:export(-dialog)`, `projects:import-validate|apply|-dialog` en `main/index.ts`, contrato en `shared/types/ipc.ts`, puente en `preload/index.ts`.
10. **UI exportar** — acción en `ProjectCard` (overflow) y en Configuración del proyecto; `BusyButton`, Snackbar de resultado.
11. **UI importar** — botón «Importar proyecto» en bienvenida; diálogo de resumen previo (`LoadingState` + `ConfirmDialog`); diálogo de estrategia de colisión (con «Crear copia» preseleccionada); aviso de reconexión de conectores.
12. **i18n** — claves `projectFile.*` (export/import/resumen/avisos/colisión) y `fieldHelp` en `es` (canónico), `ca`, `eu`, `en`.
13. **Tutoriales** — `doc/tutoriales/project-file/<locale>/exportar-proyecto.md` e `importar-proyecto.md` (es canónico + ca/eu/en) (SPEC-0000 §10, SPEC-0009).
14. **Commit** — `feat(project-file): exportar e importar proyectos en archivo .rvproj portable`.

---

## 6. Tests requeridos

### Unitarios (Vitest)
- `export.spec.ts` — el ZIP emitido contiene `manifest.json` + `sections/*.json`; el manifiesto tiene `magic`/`format_version` correctos, un `sha256` por sección que cuadra con el fichero, y un `checksum` calculado sobre el manifiesto canónico sin el campo `checksum`.
- `redact.spec.ts` — ninguna clave de la lista de denegación sobrevive a la escritura, aunque aparezca anidada en `data`.
- `import.spec.ts` — round-trip fiel export→import (igualdad de estado por sección); `format_version` mayor → aborta con aviso; `section.schema_version` mayor → la sección se omite del `apply` pero **se preserva** y reaparece en el reexport (no destructivo); migración de sección menor→actual se aplica.
- `section-registry.spec.ts` — registrar una sección nueva la incluye automáticamente en export e import sin tocar el núcleo (extensibilidad).
- `import-collision.spec.ts` — estrategia `copy` genera nuevo `id`; `overwrite` reemplaza; `cancel` no muta.

### Funcionales (Playwright + Electron)
- `project-export-import.spec.ts` — exportar un proyecto a archivo, importarlo como copia en una sesión limpia (mocks), verificar que aparece, queda activo y muestra el aviso de reconexión de conectores. A11y con `@axe-core/playwright` en los diálogos de export/import.

Cobertura objetivo ≥80% de líneas del módulo `project-file` (SPEC-0000 §8). Mocking solo de dependencias externas (IPC, FS, diálogos nativos).

---

## 7. Scopes / permisos necesarios

Ninguno nuevo de HubSpot ni Google. El archivo no contiene credenciales y la exportación/importación es puramente local (FS + diálogos nativos de Electron). La reconexión posterior usa los scopes ya definidos en SPEC-0003 (HubSpot) y SPEC-0004 (Google Drive).

---

## 8. Consideraciones de seguridad

- **Sin secretos en el archivo** (§2.1, §2.6): regla dura más red de seguridad por saneado en escritura. Un `.rvproj` puede compartirse sin exponer accesos.
- **Validación de entrada en import:** se trata el archivo como **no confiable** — validar `magic`, `format_version`, tipos de cada sección y tamaño máximo razonable antes de aplicar; nunca evaluar/ejecutar contenido; `parse` defensivo por sección.
- **Checksum** para detectar corrupción/manipulación (§2.6); discrepancia → aviso explícito.
- **Colisión de identidad** controlada por confirmación; «Sobrescribir» es destructivo (`tone: 'danger'`, SPEC-0002 §11).
- **Corrupción por clonado al sandbox:** ante cualquier indicio de corrupción del `.rvproj`, verificar primero que no sea artefacto del espejo del sandbox y que el original en disco esté sano (norma del proyecto), antes de concluir que el archivo está dañado.

---

## 9. Documentación de usuario

Tutoriales en `doc/tutoriales/project-file/<locale>/` (es canónico; ca/eu/en traducidos), visibles en la sección Ayuda (SPEC-0002):
- `exportar-proyecto.md` — cómo exportar un proyecto a un archivo `.rvproj` y qué incluye (y qué no: las credenciales).
- `importar-proyecto.md` — cómo importar, el resumen previo, la estrategia ante colisión y la reconexión de conectores.

---

## 10. Criterios de aceptación

- [ ] Exportar un proyecto produce un único `.rvproj` JSON con `magic`, `format_version`, `checksum` y todas las secciones registradas, **sin credenciales**.
- [ ] Importar valida formato/versión/checksum, muestra un resumen previo y aplica con estrategia de colisión (`copy`/`overwrite`/`cancel`).
- [ ] Round-trip export→import reconstruye el estado de cada característica de forma fiel.
- [ ] Una sección con `schema_version` mayor que la soportada se omite del `apply` pero se **preserva** en el reexport (no destructivo); `format_version` mayor aborta con aviso.
- [ ] Registrar una característica nueva la incluye en export/import **sin tocar el núcleo** (extensibilidad verificada por test).
- [ ] Tras importar, la app avisa de reconectar HubSpot y Google Drive.
- [ ] i18n completa en los cuatro idiomas; a11y AA en diálogos (SPEC-0000 §3); estados de carga (SPEC-0002 §17) y tooltips (§18) adoptados.
- [ ] `npm run typecheck`, `npm run test:unit` y `npm run test:e2e` en verde.
- [ ] PR creada, revisada y mergeada en `main`.

---

## 11. Registro de implementación (2026-06-23)

Estado: **IMPLEMENTADO** (núcleo + cableado + UI + i18n + tests unitarios verificados en sandbox; suite completa, e2e y PR en máquina).

Decisiones de implementación tomadas durante la iteración (modifican/concretan el diseño):

- **ZIP sin compresión (método STORE), sin nueva dependencia.** El contenedor `.rvproj` se empaqueta con un escritor/lector ZIP propio mínimo (`project-file/archive.ts`, método STORE + CRC-32) en lugar de añadir una librería ZIP (evita el coste de vetting de SPEC-0000 §11 y mantiene el núcleo testeable sin red). Compatible con herramientas estándar (`unzip`); validado en sandbox. Si en el futuro se requiere compresión o adjuntos grandes, se puede sustituir el adaptador `archive.ts` sin tocar el resto (subiendo `format_version` si cambiara la estructura).
- **Preservación de secciones desconocidas/nuevas:** se añade el campo opcional `Project.portableSections?: ProjectFileSection[]` (persistido en `electron-store`). Al importar, las secciones cuya `featureKey` no tiene contribuyente, o cuya `schema_version` es mayor que la soportada, **no se aplican** pero se guardan ahí; el export las vuelve a incluir → round-trip no destructivo (§2.4). Concreta el mecanismo que el §2.4 dejaba abierto.
- **Núcleo desacoplado del FS y del ZIP:** `export.ts`/`import.ts` operan sobre un mapa de entradas `path → contenido` (`ArchiveEntries`) y la lista de contribuyentes inyectada; `archive.ts` y los diálogos/escritura en disco viven en los handlers IPC. Esto hace el núcleo puro y testeable.
- **Contribuyentes:** `property-management`, `custom-objects`, `forms-management`, construidos en `index.ts` reutilizando los `serialize`/`parse` y `applyDriveState` existentes (SPEC-0004 §15.5). `collect` devuelve el objeto de estado (sin stringificar); `apply` delega en `applyDriveState`.
- **Diálogos nativos** de Electron (`dialog.showSaveDialog`/`showOpenDialog`) en main; el renderer recibe rutas y resultados por IPC.
- **Integridad:** `sha256` por sección en el manifiesto + `checksum` del manifiesto canónico (claves ordenadas) sin el propio campo. La verificación en import avisa por Snackbar si no cuadra.

Ficheros creados/modificados:

- `src/renderer/shared/types/project-file.ts` (tipos); `project.ts` (+`portableSections`).
- `src/main/project-file/`: `archive.ts`, `redact.ts`, `manifest.ts`, `section-registry.ts`, `export.ts`, `import.ts`, `index.ts` + specs (`archive.spec.ts`, `redact.spec.ts`, `export.spec.ts`, `import.spec.ts`, `section-registry.spec.ts`).
- `ipc.ts` (+canales y métodos), `preload/index.ts`, `main/index.ts` (handlers + contribuyentes + diálogos).
- Renderer: `ProjectCard` (acción exportar), `WelcomeScreen` (botón importar), `ImportProjectDialog.tsx`, `use-projects.ts` (export/import), orquestación en `WelcomeRoute`.
- i18n: claves `projectFile.*` en `es`/`ca`/`eu`/`en`.
- Tutoriales `doc/tutoriales/project-file/<locale>/{exportar,importar}-proyecto.md`.

Fix posterior (typecheck en máquina, 2026-06-23): `import.spec.ts` fijaba el tipo del array `portableSections` con una primera asignación (`data: { entries: [] }`) que chocaba con la reasignación posterior (`data: { items: [...] }`). Resuelto anotando `const proj: Project` y dejando una única sección desconocida (`future-x`). `tsc` del módulo (incl. specs) y 14/14 tests en verde en sandbox.

## 12. Validación del archivo en el import (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgo 1.6.

`projectsImportValidate`/`projectsImportApply` leían y parseaban cualquier `filePath` recibido del renderer sin
validación. Helper `readProjectFile(filePath)` en `main/index.ts`, usado por ambos handlers antes de `unpackZip`:

- Extensión obligatoria `.rvproj` (case-insensitive).
- `stat` previo: debe ser un archivo regular y no superar 50 MB (`MAX_RVPROJ_BYTES`), evitando cargar en memoria
  rutas arbitrarias o archivos desmesurados.
- Cualquier incumplimiento lanza un `Error` con mensaje claro, que llega al renderer por el canal IPC existente.

Estado: IMPLEMENTADO (2026-07-02). Sin cambios de UI; el flujo normal (path procedente de
`projectsImportDialog`) no se ve afectado. Requiere rebuild de la app; typecheck/test en la máquina del usuario.
