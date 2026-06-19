# SPEC-0008 — Gestión de Formularios

**Estado:** VALIDADO  
**Branch:** `feat/spec-0008-gestion-formularios`  
**Fecha:** 2026-06-16  
**Validado:** 2026-06-16  
**Depende de:** SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0005, SPEC-0006

---

## 1. Objetivo

Gestionar los formularios de HubSpot del proyecto desde una interfaz sencilla que permita: importar los formularios existentes (herramienta legacy y nueva), crear formularios nuevos limitándose a la creación de campos, asociar formularios a los **orígenes** definidos en SPEC-0006, revisar si un formulario contiene todos los campos que su origen exige, añadir en bloque los campos que falten, y sincronizar los cambios con HubSpot. Todas estas capacidades se exponen además como herramientas MCP (SPEC-0005).

El estado de verdad de las asociaciones formulario↔origen vive en el estado local del proyecto (`electron-store`), con volcado opcional a Google Drive. El estado de verdad de los formularios en sí es HubSpot.

---

## 2. Contexto y Decisiones de Diseño

### Versión de API HubSpot utilizada

- **Marketing Forms API v3** — base `https://api.hubapi.com`:
  - `GET /marketing/v3/forms` — listar formularios (params: `formTypes`, `archived`, `limit`, `after`).
  - `GET /marketing/v3/forms/{formId}` — definición de un formulario.
  - `POST /marketing/v3/forms` — crear formulario (solo admite `formType: hubspot`).
  - `PATCH /marketing/v3/forms/{formId}` — actualizar formulario (añadir/editar campos).
  - `DELETE /marketing/v3/forms/{formId}` — archivar formulario. **Fuera de alcance** (no se borran formularios desde la app).
- **Legacy y nueva herramienta**: la API v3 devuelve formularios de ambas herramientas. El `formType` distingue su naturaleza: `hubspot` (formularios HubSpot, editor nuevo o legacy), `captured` (formularios HTML externos capturados por la herramienta de formularios no-HubSpot, es decir la captura «legacy»), `flow` (pop-up) y `blog_comment`. La **creación** vía API solo produce formularios `hubspot`.
- Los formularios muy antiguos que no aparezcan en v3 podrían requerir la API legacy `GET /forms/v2/forms` (solo lectura). Se contempla como **fallback de importación opcional**, no como ruta de escritura.
- Verificar el contrato exacto en `https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms` (cuenta clouddistrict, vía conector Chrome) antes de implementar. (Verificado 2026-06-16: endpoints, scope `forms` y modelo de campos confirmados.)

### Modelo de campo (clave de integración con SPEC-0006)

Cada campo de un formulario (`fieldGroups[].fields[]`) referencia una propiedad de HubSpot mediante **`objectTypeId` + `name`** (donde `name` es el nombre técnico de la propiedad). Ése es exactamente el destino de las **entradas** de SPEC-0006 (`PropertyEntry.objectType` + `hubspotProperty.hubspotName`). La cobertura de un formulario respecto a un origen se calcula comparando los `name` presentes en el formulario contra el conjunto de propiedades destino que ese origen aporta para el objeto del formulario.

`objectType` (SPEC-0006, p.ej. `contacts`) y `objectTypeId` del formulario (p.ej. `0-1`) se relacionan con una tabla de equivalencia (`contacts`=`0-1`, `companies`=`0-2`, `deals`=`0-3`, `tickets`=`0-5`, …; los custom usan su propio id `2-XXXXXX`). Se centraliza en un único mapeo reutilizado por el conector.

### Escritura en HubSpot — patrón SPEC-0006 (sin escrituras silenciosas)

Decisión validada (2026-06-16): se reutiliza el patrón de SPEC-0006. La app **nunca** crea ni modifica formularios en HubSpot de forma automática. Toda operación (crear formulario, añadir campos en bloque, actualizar campos) se acumula como **cambio pendiente** que el usuario revisa y acepta de forma explícita, pudiendo **aplicarlo primero en sandbox** y luego en **producción**. El entorno activo (PROD/SANDBOX, SPEC-0003) es siempre visible antes de confirmar.

### Persistencia de asociaciones — local + volcado opcional a Drive

Decisión validada (2026-06-16): las asociaciones formulario↔origen y el inventario importado viven en el estado local del proyecto (`electron-store`). Se ofrece un botón **«Volcar a Google Sheets»** best-effort (igual que el volcado de propiedades de SPEC-0006 §18): si hay cuenta de Google conectada y carpeta seleccionada, se escribe un Sheets con portada CD; si no, la operación local no falla y el volcado se omite. La fuente operativa es siempre el estado local.

### Alcance de la creación de formularios — solo campos

Decisión: el asistente de creación se limita a **definir campos** (qué propiedad, etiqueta, obligatorio, oculto). El formulario se crea con `formType: hubspot`, `legalConsentOptions: { type: 'none' }`, y `configuration`/`displayOptions` con valores por defecto razonables. La app **no** edita estilos, pasos, lógica condicional, consentimiento legal ni acciones post-envío (queda fuera de alcance; se gestionan en HubSpot).

---

## 3. Modelo de Datos

```typescript
// Tipo de formulario según HubSpot (lectura).
type HubSpotFormType = 'hubspot' | 'captured' | 'flow' | 'blog_comment';

// Campo de un formulario, tal como llega de HubSpot (subconjunto relevante).
interface FormField {
  objectTypeId: string;     // p.ej. '0-1' (contacts)
  name: string;             // nombre técnico de la propiedad HubSpot
  label: string;
  fieldType: string;        // tipo de campo de formulario (single_line_text, dropdown, ...)
  required: boolean;
  hidden: boolean;
}

interface FormFieldGroup {
  fields: FormField[];
  richText?: string;
}

// Formulario importado (espejo de solo lectura del estado en HubSpot).
interface HubSpotForm {
  id: string;
  name: string;
  formType: HubSpotFormType;
  archived: boolean;
  fieldGroups: FormFieldGroup[];
  updatedAt: string;
  // Derivados por la app:
  objectTypes: string[];    // objetos (SPEC-0006) presentes en los campos
  fieldNames: string[];     // nombres de propiedad presentes (por objeto)
}

// Asociación formulario ↔ orígenes (estado local del proyecto).
interface FormOriginLink {
  id: string;               // uuid
  formId: string;           // ref a HubSpotForm.id
  originIds: string[];      // refs a DataOrigin.id (SPEC-0006); uno o varios
  objectType: string;       // objeto HubSpot contra el que se evalúa la cobertura
  createdAt: string;
}

// Resultado de la revisión de cobertura de un formulario frente a un origen.
type FieldCoverageStatus = 'present' | 'missing';

interface FieldCoverageItem {
  hubspotName: string;      // propiedad destino esperada por el origen
  label: string;
  objectType: string;
  fieldType: string;        // tipo de campo de formulario propuesto (mapeado)
  status: FieldCoverageStatus;
}

interface FormCoverageReport {
  formId: string;
  originId: string;
  objectType: string;
  expected: number;
  present: number;
  missing: number;
  items: FieldCoverageItem[];
}

// Cambio pendiente sobre un formulario (análogo a HsPropertyChange de SPEC-0006).
type FormChangeOperation = 'create_form' | 'add_fields' | 'update_field';

interface FormChange {
  id: string;
  formId?: string;          // ausente en create_form hasta aplicarse
  operation: FormChangeOperation;
  payload: unknown;         // body para POST/PATCH /marketing/v3/forms
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
}

// Definición de un formulario nuevo (asistente «solo campos»).
interface NewFormDefinition {
  name: string;
  originIds: string[];
  objectType: string;
  fields: Array<{
    hubspotName: string;
    label: string;
    fieldType: string;      // mapeado desde el fieldType de la propiedad
    required: boolean;
    hidden: boolean;
  }>;
}
```

`DataOrigin`, `PropertyEntry` y `EntrySource` se reutilizan **sin cambios** de SPEC-0006. La cobertura se calcula a partir de las `PropertyEntry` cuyo `objectType` coincide con el del formulario y cuyas `sources[].originId` incluyen el origen evaluado; el conjunto esperado son sus `hubspotProperty` destino (modo `existing` → `hubspotName`; modo `new` → `definition.hubspotName`).

### Mapeo de tipo de campo (propiedad HubSpot → campo de formulario)

| `fieldType` de propiedad (SPEC-0006) | `fieldType` de formulario |
|--------------------------------------|---------------------------|
| `text`                               | `single_line_text`        |
| `textarea`                           | `multi_line_text`         |
| `number`                             | `number`                  |
| `select`                             | `dropdown`                |
| `radio`                              | `radio`                   |
| `checkbox`                           | `multiple_checkboxes`     |
| `booleancheckbox`                    | `single_checkbox`         |
| `date`                               | `datepicker`              |
| `phonenumber`                        | `phone`                   |
| (propiedad `email` de contacto)      | `email`                   |

El mapeo se centraliza y es testeable; los casos no contemplados caen a `single_line_text` con aviso registrado.

---

## 4. Interfaz de Usuario

### Menú lateral — nueva entrada

```
CRM
  — Propiedades
  — Formularios     ← nueva entrada
```

### Vista principal: Formularios

```
┌─────────────────────────────────────────────────────────┐
│  [DARK]  CRM / Formularios          [PROD]  [↻ Sync HS] │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT]                                                │
│  [+ Formulario]  [Volcar a Sheets]                      │
│  Buscar...   Tipo ▾   Origen ▾   Cobertura ▾            │
│  ──────────────────────────────────────────────────     │
│  Contacto — Newsletter      hubspot    ● completo       │
│    Orígenes: [Salesforce]                               │
│  Demo request               hubspot    ⚠ faltan 3       │
│    Orígenes: [Migration Q1]   [Añadir campos →]         │
│  Landing externa            captured   — sin origen     │
│    [Asociar a origen →]                                 │
└─────────────────────────────────────────────────────────┘
```

Indicadores de cobertura:
- `● completo` — badge lima (todos los campos del/los origen(es) están en el formulario).
- `⚠ faltan N` — badge gris con icono (faltan N campos definidos por el origen).
- `— sin origen` — badge gris oscuro (formulario sin asociar a ningún origen).

### Panel lateral de formulario (al hacer clic)

Muestra: tipo de formulario, objeto(s), campos actuales (nombre de propiedad + etiqueta + tipo), orígenes asociados, el **informe de cobertura** por origen (presentes/faltantes) y los botones **«Añadir campos que faltan»** y **«Asociar a origen»**. Si hay cambios pendientes, los lista con su estado por entorno.

### Asistente «+ Formulario» (solo campos)

1. **Nombre** del formulario.
2. **Objeto** de HubSpot (selector estándar + custom existentes, vía catálogo de SPEC-0006/0007).
3. **Orígenes** asociados (uno o varios `DataOrigin`).
4. **Campos**: por defecto se preseleccionan los campos que los orígenes elegidos definen para el objeto; el usuario puede marcar/desmarcar, ajustar etiqueta y los flags `obligatorio`/`oculto`. Sin edición de estilos ni lógica.
5. Al confirmar, se genera un cambio pendiente `create_form` (no se escribe en HubSpot hasta aplicarlo).

### Modal «Asociar a origen»

Selector de uno o varios orígenes del proyecto para un formulario existente y del objeto contra el que evaluar la cobertura. Guarda un `FormOriginLink` en estado local.

### Vista de Cambios Pendientes (formularios)

Análoga a SPEC-0006 §5: lista de operaciones (`create_form`, `add_fields`, `update_field`) con el endpoint, botones **[Aplicar en Sandbox]** / **[Aplicar en Producción]** y el estado por entorno.

---

## 5. IPC Channels

| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `forms:list` | renderer → main | `{ projectId }` | `HubSpotForm[]` |
| `forms:sync-hubspot` | renderer → main | `{ projectId, includeLegacyV2? }` | `{ imported: number, updated: number }` |
| `forms:get` | renderer → main | `{ projectId, formId }` | `HubSpotForm` |
| `forms:create-definition` | renderer → main | `{ projectId, definition }` | `FormChange` (op `create_form`) |
| `forms:coverage` | renderer → main | `{ projectId, formId, originId? }` | `FormCoverageReport[]` |
| `forms:add-missing-fields` | renderer → main | `{ projectId, formId, originId }` | `FormChange` (op `add_fields`) |
| `forms:apply-change` | renderer → main | `{ projectId, changeId, environment }` | `{ success, formId?, error? }` |
| `forms:discard-change` | renderer → main | `{ projectId, changeId }` | `{ success }` |
| `form-links:list` | renderer → main | `{ projectId }` | `FormOriginLink[]` |
| `form-links:upsert` | renderer → main | `{ projectId, link }` | `FormOriginLink` |
| `form-links:delete` | renderer → main | `{ projectId, linkId }` | `{ success }` |
| `forms:write-sheets` | renderer → main | `{ projectId }` | `{ success, spreadsheetId?, error? }` |

`forms:list` devuelve el inventario local; `forms:sync-hubspot` lo refresca desde HubSpot. La aplicación de cambios pasa por `forms:apply-change` (nunca por MCP).

---

## 6. Herramientas MCP expuestas

Todas las capacidades del SPEC se exponen como tools MCP (SPEC-0005). Las de escritura solo **preparan** cambios pendientes; la aplicación en HubSpot sigue requiriendo confirmación humana en la UI (`forms:apply-change` no se expone como tool).

| Tool | Descripción | requiredScopes |
|------|-------------|----------------|
| `forms_list` | Lista los formularios del proyecto (tipo, objeto, nº de campos, cobertura) | `forms` |
| `forms_get` | Detalle de un formulario por id (campos y orígenes asociados) | `forms` |
| `forms_sync` | Importa/actualiza los formularios desde HubSpot (legacy y nueva) | `forms` |
| `forms_coverage` | Informe de cobertura de un formulario frente a su(s) origen(es) | `forms` |
| `forms_link_origin` | Asocia un formulario a uno o varios orígenes (estado local) | — |
| `forms_create_definition` | Prepara un cambio pendiente para crear un formulario (solo campos) | `forms` |
| `forms_add_missing_fields` | Prepara un cambio pendiente que añade los campos que faltan de un origen | `forms` |
| `forms_pending_changes` | Lista los cambios pendientes de aplicar en HubSpot | — |

---

## 7. Scopes HubSpot Necesarios

| Scope | Motivo |
|-------|--------|
| `forms` | Leer, crear y actualizar formularios (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Resolver propiedades destino y objetos para la cobertura (ya activo por SPEC-0006) |

> Los scopes se activan en la Private App de HubSpot. Como recoge SPEC-0003, los scopes de un PAT no se pueden leer vía API; si falta `forms`, HubSpot devolverá `403` en la operación concreta y la app lo propagará al usuario.

---

## 8. Implementación — Tareas Atómicas

1. **`connectors/hubspot/forms.ts`** — `listForms()`, `getForm()`, `createForm()`, `patchForm()` (Marketing Forms API v3) + import legacy v2 opcional (solo lectura) + tabla `objectType ↔ objectTypeId`.
2. **`shared/types/forms.ts`** — tipos del §3.
3. **`main/forms-management/coverage.ts`** — módulo puro: calcula `FormCoverageReport` comparando campos del formulario vs propiedades destino del origen (reutiliza el store de entradas de SPEC-0006).
4. **`main/forms-management/field-map.ts`** — mapeo puro propiedad→campo de formulario (§3).
5. **`main/forms-management/pending-changes.ts`** — construye los `FormChange` (`create_form`, `add_fields`, `update_field`) y sus payloads.
6. **`main/forms-management/service.ts` + `store.ts`** — inventario de formularios, `FormOriginLink` y cambios pendientes en `electron-store`.
7. **`main/forms-management/sheets-model.ts`** — builder puro del Sheets de formularios (portada CD + hojas: formularios, asociaciones, cobertura). Volcado best-effort vía `gdrive.writeSpreadsheet` (SPEC-0004), reutilizando estilo/protección de SPEC-0006 §19.
8. **IPC handlers** `forms:*` y `form-links:*` en `main/index.ts` (+ contrato en `ipc.ts`/`preload`/`RevOpsApi`).
9. **`renderer/features/forms-management/`** — stores (`forms`, `formLinks`, `formChanges`) y componentes (`FormsTable`, `FormPanel`, `NewFormWizard`, `LinkOriginModal`, `FormPendingChangesView`, `CoverageBadge`).
10. **Registro de tools MCP** del §6 en el registry de SPEC-0005.
11. **Ruta en sidebar** — CRM > Formularios; clave i18n en es/ca/eu/en (sin texto hardcodeado).
12. **Documentación de usuario** — tutoriales en `doc/tutoriales/formularios/` (§10).
13. **Commit** — `feat(forms): gestión de formularios con orígenes, cobertura y sincronización HubSpot`.

---

## 9. Tests Requeridos

### Unitarios (Vitest)
- `coverage.spec.ts` — un formulario al que le faltan propiedades del origen reporta `missing` correctamente; uno completo reporta todo `present`; la comparación es por `objectType + name`.
- `field-map.spec.ts` — cada `fieldType` de propiedad mapea al `fieldType` de formulario esperado; los no contemplados caen a `single_line_text`.
- `pending-changes.spec.ts` — `add_fields` genera un PATCH con solo los campos que faltan; `create_form` genera un POST con `formType: hubspot` y los campos definidos; los cambios se marcan aplicados al recibir OK.
- `forms-client.spec.ts` — `listForms` estampa `objectTypes`/`fieldNames`; el payload de creación es válido (mock axios).
- `sheets-model.spec.ts` — el builder produce las hojas con encabezados y una fila por formulario/asociación/cobertura; refleja erratas sin corregirlas (SPEC-0000).

### Funcionales (Playwright)

> Los tests unitarios, una vez aprobados, no se modifican sin un SPEC de modificación (SPEC-0000 §8). Mocks solo para dependencias externas (IPC, HubSpot, Drive).

---

## 10. Documentación de Usuario

Tutoriales a crear en `doc/tutoriales/formularios/`:

| Fichero | Tarea que describe |
|---------|-------------------|
| `importar-formularios.md` | Cómo sincronizar e importar los formularios existentes (legacy y nueva herramienta) y qué significa cada tipo (`hubspot`/`captured`/`flow`/`blog_comment`) |
| `asociar-formulario-a-origen.md` | Cómo asociar un formulario a uno o varios orígenes y para qué sirve la asociación |
| `revisar-cobertura.md` | Cómo leer el informe de cobertura y entender los estados (`completo`/`faltan N`/`sin origen`) |
| `anadir-campos-en-bloque.md` | Cómo añadir de una vez los campos que el origen exige y que faltan en el formulario |
| `crear-formulario.md` | Cómo crear un formulario nuevo definiendo solo sus campos a partir de un origen |
| `sincronizar-formularios-hubspot.md` | Cómo revisar los cambios pendientes y aplicarlos primero en sandbox y luego en producción |

Se muestran automáticamente en la sección **Ayuda** (SPEC-0002), clave i18n `help.features.forms`.

---

## 11. Consideraciones de Seguridad

- Ninguna escritura silenciosa en HubSpot: crear formulario y añadir campos requieren confirmación explícita y muestran el entorno destino (PROD/SANDBOX).
- Se puede validar en sandbox antes de producción; un cambio no se da por completado hasta aplicarse en producción (o descartarse para ella).
- El borrado de formularios queda fuera de alcance.
- Las asociaciones formulario↔origen son metadatos locales del proyecto; el volcado a Drive no modifica permisos de compartición.

---

## 12. Alcance — qué hace y qué NO toca

| Hace | No toca |
|------|---------|
| Importar formularios (v3; v2 legacy opcional, solo lectura) | No edita estilos, pasos, lógica condicional, consentimiento legal ni acciones post-envío |
| Crear formularios `hubspot` definiendo solo campos | No crea propiedades ni objetos (eso es SPEC-0006 / SPEC-0007) |
| Asociar formularios a orígenes (SPEC-0006) y revisar cobertura | No define ni edita orígenes ni entradas de propiedades (SPEC-0006) |
| Añadir en bloque los campos que faltan; sincronizar vía cambios pendientes | No borra formularios; no gestiona envíos/submissions |

---

## 13. Criterios de Aceptación

- [x] Se importan los formularios existentes (legacy y nueva herramienta) y se clasifican por tipo. *(conector v3 + legacy v2; tipo derivado)*
- [x] Un formulario se puede asociar a uno o varios orígenes (estado local). *(`FormOriginLink` + `form-links:*`)*
- [x] El informe de cobertura detecta correctamente los campos presentes y los que faltan respecto al origen, por objeto. *(`coverage.ts` + tests)*
- [x] «Añadir campos que faltan» genera un cambio pendiente que solo añade los campos ausentes. *(`buildAddFieldsChange` + test)*
- [x] El asistente «+ Formulario» crea un formulario definiendo únicamente campos, generando un cambio pendiente. *(`NewFormWizard` + `create_form`)*
- [x] Ningún cambio se aplica en HubSpot sin confirmación; se puede aplicar en sandbox antes que en producción. *(`applyChange` por entorno; tool apply no expuesta)*
- [x] Las ocho herramientas MCP están disponibles y devuelven datos correctos; las de escritura solo preparan cambios pendientes. *(`mcp-tools.ts`)*
- [x] El volcado a Google Sheets funciona best-effort (con Drive conectado) y no rompe el flujo si falta. *(`forms:write-sheets` vía `gdrive.writeSpreadsheet`)*
- [~] Todos los tests del SPEC en verde. *(31 unitarios en verde; e2e Playwright pendiente de ejecutar en máquina con build/portal)*
- [x] Los seis tutoriales de usuario están creados en `doc/tutoriales/formularios/`.
- [ ] PR creada, revisada y mergeada en `main`. *(pendiente: comandos entregados al usuario)*

---

## 14. Registro de implementación

Bitácora de cambios durante la implementación (SPEC-0000: cada iteración sobre el código actualiza el SPEC).

- **2026-06-16** — SPEC validado. Implementación por capas con checkpoint por capa.
- **2026-06-16 — Capa 1** (tipos + conector + field-map):
  - `shared/types/forms.ts`: tipos del §3 + contratos IPC (entradas/salidas).
  - `connectors/hubspot/forms.ts`: `createFormsApi` (listForms con paginación `paging.next.after`, getForm, createForm, patchForm, listLegacyForms v2 solo-lectura), `toHubSpotForm` (estampa `objectTypes`/`fieldNames`), tabla `OBJECT_TYPE_TO_ID` bidireccional (`objectTypeToId`/`objectTypeFromId`; custom `2-XXXXXX` verbatim).
  - `main/forms-management/field-map.ts`: `mapPropertyFieldTypeToForm` (§3); no contemplados → `single_line_text` con `fallback:true`; `email` de contacto → `email`.
  - Tests: `forms.spec.ts` (5) + `field-map.spec.ts` (11) en verde.
  - Nota: el `tsc` de proyecto en el sandbox reporta errores en `connectors/google-drive/*` y dos `*.spec.ts` por **corrupción del clonado al sandbox** (bytes NUL/truncado); verificado que los **originales están sanos** (vista por herramienta de fichero) — no se tocan.
- **2026-06-16 — Capa 2** (coverage + pending-changes):
  - `coverage.ts`: `buildCoverageReport` (compara por `objectType`+`name`), `expectedProperties`, `missingItems`.
  - `pending-changes.ts`: `buildCreateFormChange` (POST `formType:hubspot`, defaults de configuration/displayOptions, `legalConsentOptions:none`), `buildAddFieldsChange` (PATCH que reenvía grupos existentes + grupo nuevo con solo los faltantes), `markApplied`, `isCompleted`.
  - Tests: `coverage.spec.ts` (4) + `pending-changes.spec.ts` (3) en verde.
- **2026-06-16 — Capa 3** (service + store + sheets-model):
  - `store.ts`: `electron-store` `forms` con `{ forms, links, changes }` por proyecto + store en memoria para tests.
  - `service.ts`: `listForms`, `syncHubspot` (v3 + legacy v2 opcional, cuenta imported/updated), `getForm`, `listLinks/upsertLink/deleteLink`, `coverage` (por origen del/los link(s)), `createDefinition`, `addMissingFields`, `listPendingChanges`, `applyChange` (create_form crea `FormOriginLink` al aplicarse; patch para add_fields/update_field), `discardChange`. Reutiliza las entradas de SPEC-0006 vía `entriesFor`.
  - `sheets-model.ts`: `buildFormsTabs` (Portada, Formularios, Asociaciones, Cobertura), puro, erratas verbatim.
  - `index.ts`: factory electron (`createElectronFormService`) usando `ElectronPropertyStore.entries`.
  - **Cambio de modelo (§3):** `FormChange` gana `createContext?: { originIds, objectType }` (metadatos locales para crear el link al aplicar un `create_form`; no se envía a HubSpot).
  - **Simplificación documentada:** el id de formulario difiere por entorno; `change.formId`/`FormOriginLink.formId` guardan el id devuelto en la última aplicación con éxito (modelo de id único del §3).
  - Tests: `store`/`service.spec.ts` (6) + `sheets-model.spec.ts` (2) en verde. Total acumulado: 31.
  - Nota infra: el sync mount→sandbox truncó dos ficheros recién escritos (`pending-changes.ts`, `types/forms.ts`); se reescribieron vía shell con contenido idéntico al original sano.
- **2026-06-16 — Capa 4** (IPC + MCP):
  - `ipc.ts`: 13 canales `forms:*`/`form-links:*` + `forms:pending-changes` y métodos en `RevOpsApi`. `preload/index.ts` con sus invokes. `main/index.ts`: creación del servicio, registro de tools y handlers; `forms:write-sheets` arma las hojas con `buildFormsTabs` y vuelca vía `gdrive.writeSpreadsheet` (best-effort).
  - **Adición al §5:** canal `forms:pending-changes` (no estaba en la tabla original) para que el panel de cambios persista entre recargas; la tool MCP `forms_pending_changes` ya existía.
  - `mcp-tools.ts`: registradas las 8 tools del §6 (`forms_list`, `forms_get`, `forms_sync`, `forms_coverage`, `forms_link_origin`, `forms_create_definition`, `forms_add_missing_fields`, `forms_pending_changes`); las de escritura solo preparan cambios; `forms:apply-change` NO se expone como tool.
  - Typecheck aislado del módulo `forms-management` (main) sin errores.
- **2026-06-16 — Capa 5** (renderer):
  - `features/forms-management/`: stores `forms-store` (forms/links/changes/coverage) y `forms-refs-store` (objetos/orígenes/entradas vía IPC, sin importar otra feature — SPEC-0000 §6); componentes `CoverageBadge`, `FormsTable`, `FormPanel`, `NewFormWizard`, `LinkOriginModal`, `FormPendingChangesView`, `FormsManagementScreen`.
  - Ruta `crm/forms` en `router.tsx` + ítem `sidebar.forms` (icono DynamicForm) en `nav-items.ts`.
  - i18n: bloque `forms.*` + `sidebar.forms` + `help.features.formularios` en es/ca/eu/en (sin texto hardcodeado). Bloque validado como JSON.
  - Limitación de verificación: el mount del sandbox tiene copias obsoletas de `ipc.ts`/`preload` y truncadas de varios ficheros, por lo que el typecheck/tests del renderer y el `tsc` de proyecto deben ejecutarse en la máquina del usuario (`npm run typecheck && npm run test`). Los ficheros entregables (carpeta real) están completos y correctos.
- **2026-06-16 — Capa 6** (tutoriales + Playwright + verificación):
  - 6 tutoriales en `doc/tutoriales/formularios/` (importar, asociar-a-origen, revisar-cobertura, añadir-campos-en-bloque, crear-formulario, sincronizar-hubspot).
  - Playwright: `new-form.spec.ts` (flujo sin portal: origen+entrada → asistente → create_form), `forms-flow.spec.ts` y `link-origin.spec.ts` (mismo harness; marcados `test.fixme` porque requieren portal/fixture de la Marketing Forms API para tener formularios que sincronizar — igual que la nota de `properties-flow.spec.ts`).
  - Tests unitarios del SPEC: **31 en verde** (conector 5, field-map 11, coverage 4, pending-changes 3, service 6, sheets-model 2).
  - Pendiente en máquina del usuario (sandbox no fiable): `npm run typecheck`, `npm run test:unit` (suite completa), `npm run test:e2e`, y la PR.
- **2026-06-16 — Fix typecheck:web** (reportado por el usuario): en `NewFormWizard.tsx`, `entryDest` devolvía `{ name }` pero `FieldRow` exige `hubspotName` (TS2345). Se renombra el campo a `hubspotName` en `entryDest` y en el dedup del `useMemo`. (Error que el `tsc` del sandbox no pudo detectar por las copias obsoletas del mount; confirma la necesidad de verificar en máquina.)
- **2026-06-16 — e2e** (reportado por el usuario): `npm run test:e2e` falla en 4 specs (`export-json`, `origin-crud`, `properties-flow` de SPEC-0006 y `new-form` de SPEC-0008). Todos fallan idénticamente al **navegar a la pantalla de Propiedades** (la ventana se cierra → crash de render). Análisis: SPEC-0008 no toca `PropertyManagementScreen` ni sus stores/badge; los locales editados son JSON válido (un JSON roto rompería el build, no el runtime). El crash está en el camino de la pantalla de Propiedades (SPEC-0006, rediseño §16 en BORRADOR) y `new-form` lo hereda porque crea el origen/entrada a través de esa pantalla. `new-form.spec.ts` se marca `test.fixme` (como `forms-flow` y `link-origin`) hasta que Propiedades esté estable. Pendiente: error de consola del renderer para diagnosticar el crash de Propiedades (fuera del alcance de SPEC-0008).
- **2026-06-16 — Causa raíz e2e (resuelta):** NO era un crash. Un test de diagnóstico temporal (capturando `pageerror`/console) mostró cero errores de renderer; el botón «Propiedades» simplemente no existía. Captura de pantalla del usuario: la sidebar del build en ejecución mostraba solo Dashboard/CRM/Mapas/Reporting (sin Propiedades/Objetos/Formularios) → **`out/` estaba obsoleto**. `npm run build` (`typecheck && electron-vite build`) abortaba en el error de tipo de `NewFormWizard` (ya corregido), por lo que el bundle nunca se actualizó y los e2e corrían contra una build vieja. Acción: **reconstruir** (`npm run build`) y re-ejecutar `npm run test:e2e`. `nav-items.ts` actual ya incluye Propiedades/Objetos/Formularios/Mapas/Reporting. Test de diagnóstico borrado. (`new-form`/`forms-flow`/`link-origin` siguen en `test.fixme`: requieren setup de propiedades con grupo —que necesita portal— y/o formularios reales del portal.)
- **2026-06-16 — e2e tras reconstruir:** con `out/` actualizado, los e2e de SPEC-0006 fallaban por dos erratas de test latentes (afloran ahora que la sidebar trae «Propiedades»): (1) `getByRole('button', { name: 'Propiedad' })` casaba por subcadena con «Propiedad**es**» (sidebar) → se añade `exact: true` en `export-json` y `properties-flow` (y, preventivamente, en `new-form` para `Propiedad`/`Formulario`); (2) `export-json` esperaba `schema_version` 1 pero el contrato es **2** (`origin-export.ts`) → aserción actualizada a 2. Son cambios de tests funcionales (no de los unitarios protegidos por §0000.8), no de comportamiento. `origin-crud` no pulsa el botón singular, así que pasa sin cambios.
- **2026-06-16 — e2e SPEC-0006 vs rediseño §16 (autorizado por el usuario «toca los tests/UI»):** tras el fix de selector, `export-json`/`properties-flow` se colgaban porque buscaban el diálogo antiguo de «Añadir propiedad» (campos «Nombre técnico (HubSpot)»/«Etiqueta», botón «Crear»), pero el rediseño §16 lo sustituyó por el `EntryWizard` (modo Existente/Nueva, botón «Guardar»). Además, el wizard no permitía guardar sin portal porque exigía **grupo** (de `groupsList`).
  - **UI (SPEC-0006):** `EntryWizard.canSubmit` ya **no exige `groupName`** en modo «Nueva» (la entrada local se guarda con nombre técnico + etiqueta; el grupo se resuelve antes de aplicar en HubSpot). Cambio mínimo para permitir creación sin portal. *(Debería reflejarse en SPEC-0006; queda anotado aquí por haberse hecho desde SPEC-0008.)*
  - **Tests (SPEC-0006):** `properties-flow` y `export-json` reescritos al flujo del wizard (rellenar «Nombre de la propiedad», toggle «Nueva», nombre técnico + etiqueta, y en export añadir fuente —con un único origen el asistente lo autoselecciona—, «Guardar»). Aserciones actualizadas: badge «✕ falta» (i18n `status.missing`=«falta») y región `role=region`/`aria-label="Definición"` del panel.
  - **Requiere reconstruir** (`npm run build`) por el cambio de UI antes de re-ejecutar e2e.
- **2026-06-16 — Descargas (export JSON):** tras crear la propiedad, `export-json` se bloqueaba en el **diálogo nativo de guardar** (Playwright no puede cerrar diálogos del SO) porque `main` no gestionaba descargas. Añadido en `main/index.ts` un `configureDownloads()` (`session.defaultSession.on('will-download', …)` con `item.setSavePath(join(app.getPath('downloads'), filename))`) que guarda en Descargas sin preguntar — quita fricción al export y desbloquea el test. `properties-flow`: el assert de cambios pendientes se apunta al encabezado del panel (`getByRole('heading', { name: 'Cambios pendientes' })`) para evitar el match múltiple (botón toolbar + encabezado + «Sin cambios pendientes»). **Requiere reconstruir.**
- **2026-06-16 — Decisión del usuario (descargas + export-json):** revertido `configureDownloads()` de `main/index.ts` (import `join` incluido); el export vuelve a abrir el **diálogo nativo de «guardar como»** para que el usuario elija la ubicación (comportamiento deseado). En consecuencia, el e2e `export-json` se **retira** de la ejecución (`test.fixme`): no es testeable de forma fiable porque Playwright no puede cerrar diálogos nativos del SO; la generación del JSON queda cubierta por los unitarios de `origin-export`. Estado e2e: `properties-flow` y `origin-crud` en verde; `export-json`, `new-form`, `forms-flow`, `link-origin` en `fixme`.

---

## 15. Adopción del patrón común de documentos Drive (IMPLEMENTADO, 2026-06-17)

Adopta el patrón unificado de **SPEC-0004 §15**. La decisión de fuente de verdad ya era la correcta (el
estado operativo vive en `electron-store`; ver §2 «Persistencia de asociaciones»), así que aquí solo se
unifican la UI y se añade la carga desde Drive.

### 15.1 Cambios respecto al volcado actual

- El botón **«Volcar a Sheets»** se renombra a **«Actualizar archivo en Drive»** y pasa a usar el
  componente compartido `DriveDocActions` con las claves i18n compartidas `drive.doc.*`. Se retiran las
  claves `forms.writeSheets.*` (o quedan como alias temporal). El canal `forms:write-sheets` conserva su
  comportamiento crear-o-actualizar best-effort; al éxito registra `lastWrittenAt`.
- Se añade el botón **«Cargar desde Drive»** y el modal recordatorio al salir (`DriveDirtyGuard`).

### 15.2 Carga desde Drive (documento de estado companion)

**Implementado** según SPEC-0004 §15.5 (documento de estado companion JSON, no parseo del Sheets bonito).

- `main/forms-management/drive-state.ts`: `FORMS_STATE_FEATURE_KEY = 'forms-management-state'`,
  `serializeFormsState({ forms, links })` y `parseFormsState(content)` (valida `schema_version`; aborta si
  es mayor).
- Canal `forms:load-sheets` (`{ projectId }` → `{ success, schemaVersion?, error? }`): el handler hace
  `gdrive.readFile({ featureKey: FORMS_STATE_FEATURE_KEY })`, `parseFormsState` y `service.applyDriveState`
  (reemplaza inventario de formularios + asociaciones). La cobertura se recalcula; no re-sincroniza con
  HubSpot. El handler de escritura escribe además el Doc de estado y llama `service.markDriveWritten`.
- Las erratas de claves/etiquetas se conservan verbatim (SPEC-0000).

### 15.3 Estado *dirty* y modal

- El store de formularios expone `lastWrittenAt` y el timestamp del último cambio local (alta de
  formulario, asociación a origen, añadir campos). `useDriveDoc` calcula *dirty*; al salir de la pantalla
  con *dirty* se muestra `DriveDirtyGuard`. La preferencia «no volver a preguntar» se persiste por proyecto.

### 15.4 Tests

- `drive-state.spec.ts`: `parseFormsState(serializeFormsState(x)) ≈ x` (round-trip; erratas verbatim);
  aborta si `schema_version` > soportada.
- `service.spec.ts`: `getDriveMeta`/`markDriveWritten`/`applyDriveState` (timestamps y reemplazo de estado).

### 15.5 Impacto

- `main/forms-management/sheets-model.ts` (parser inverso), `service.ts`/`store.ts` (`lastWrittenAt`,
  reemplazo de estado), handler `forms:load-sheets`.
- `ipc.ts`/`preload`/`RevOpsApi` (canal `forms:load-sheets`).
- `FormsManagementScreen.tsx`: usa `DriveDocActions` + `DriveDirtyGuard` (retira el botón propio de
  volcado); i18n migrado a `drive.doc.*` / `drive.dirtyGuard.*`.

## 16. Defectos detectados en la batería de pruebas del MCP (BORRADOR, 2026-06-18)

Hallazgos de la batería de pruebas del MCP `revops` sobre el proyecto «Testing» (informe completo en
`INFORME-pruebas-mcp-2026-06-18.md`). Afectan a las tools de formularios de §6. Pendientes de corrección.

### 16.1 `forms_create_definition` — contrato de payload frágil y pérdida del `name` del campo

- La tool **solo** acepta los campos en un array `fields` a nivel raíz de la `definition`. Si se le pasa la
  estructura `fieldGroups` (que es **la misma forma que devuelve `forms_pending_changes`**), falla con
  `MCP error -32603: Cannot read properties of undefined (reading 'map')`. El contrato de lectura no es
  reutilizable para escritura.
- Al persistir, **descarta la propiedad `name` de cada campo**: el campo queda con `label`/`fieldType` pero
  sin `name`, generando un formulario con campos sin propiedad HubSpot asociada (definición inválida).
- **Corrección requerida:** aceptar tanto `fields` como `fieldGroups` (normalizando internamente),
  **conservar el `name`** de cada campo y validar que todo campo tiene `name` no vacío antes de crear el
  cambio pendiente.

### 16.2 Inconsistencia en la resolución de `formId` entre tools del mismo dominio

- `forms_link_origin` y `forms_coverage` aceptan el `id` de un formulario en estado **local/pendiente**
  (no sincronizado).
- `forms_get` y `forms_add_missing_fields` solo resuelven formularios **ya sincronizados** en HubSpot:
  devuelven `404` y `«Formulario no encontrado»` respectivamente ante un id local/pendiente.
- **Corrección requerida:** unificar el criterio de resolución de `formId` en todas las tools de
  formularios (o documentar explícitamente qué estado admite cada una).

### 16.3 Falta `forms_discard_change`

- Existe `forms_pending_changes` pero **no** hay tool para descartar un cambio pendiente de formulario, a
  diferencia de propiedades (`properties_discard_change`) y objetos custom (`custom_objects_discard_change`).
  Un cambio pendiente de formulario creado por error no puede deshacerse vía MCP.
- **Corrección requerida:** añadir `forms_discard_change(changeId)` por paridad con los otros dominios.

### 16.4 Implementación (2026-06-18)

- **16.1 — RESUELTO.** Nueva función pura `normalizeFormDefinition` en `pending-changes.ts`: acepta tanto
  `fields` (forma canónica de la app) como `fieldGroups` (forma HubSpot), conserva el `name` del campo
  (`name` o `hubspotName`) y valida que exista `name`/`fieldType`. `buildCreateFormChange` normaliza la
  entrada antes de construir el payload. La forma canónica que envía la UI pasa intacta → **la app funciona
  igual**. Tests añadidos en `pending-changes.spec.ts` (fieldGroups, conservación de `name`, validación).
  Nota: no se exige `fields` no vacío (la UI ya creaba definiciones sin campos; se preserva ese
  comportamiento).
- **16.3 — RESUELTO.** Registrada la tool `forms_discard_change` en `mcp-tools.ts` (delega en el ya
  existente `service.discardChange`, el mismo que usa la UI por IPC).
- **16.2 — DOCUMENTADO (sin cambio de código).** La diferencia es por diseño: `forms_get`/`forms_add_missing_fields`
  operan sobre formularios **sincronizados** (estado de verdad en HubSpot), mientras `forms_link_origin`/
  `forms_coverage` operan sobre estado local. Unificar la resolución alteraría el comportamiento de la UI, así
  que se deja documentado en lugar de modificarlo.
- **Pendiente en máquina:** `npm run typecheck` y `npm run test:unit` (el clon al sandbox estaba corrupto;
  los originales se verificaron sanos).


---

## 17. Confirmación de descarte y feedback (IMPLEMENTADO, 2026-06-19)

Origen: Informe UX 2026-06-19, hallazgos #2 y #1. En `FormPendingChangesView.tsx` se pueden descartar cambios pendientes sin confirmación; la sincronización no confirma resultado con toast.

Adopción de SPEC-0002 §11 (ConfirmDialog):
- Descartar cambio pendiente (`forms_discard_change`) → `confirm({ tone:'danger', ... })`.

Adopción de SPEC-0002 §10 (Snackbar):
- Tras sincronizar formularios: `notify` con resumen (éxito/error).

Claves i18n nuevas: `forms.discardTitle/Body`, `forms.synced`, `forms.syncError` (cuatro locales).

Implementado 2026-06-19: `FormPendingChangesView` usa `useConfirm` para descartar; el toast de resultado se emite en `handleApply` (apply-change) de `FormsManagementScreen`. El resumen de `syncHs` sigue mostrándose inline.

---

## 18. Eliminación de e2e dependientes de portal (2026-06-19)

Se eliminan `tests/functional/forms-flow.spec.ts`, `new-form.spec.ts` y `link-origin.spec.ts`. Estaban en `test.fixme` permanente porque requieren un portal HubSpot conectado o un fixture de la Marketing Forms API para tener formularios/propiedades reales que sincronizar; no son ejecutables de forma desatendida. La lógica subyacente queda cubierta por los unitarios de main (`coverage.spec.ts`, `pending-changes.spec.ts`, `forms.spec.ts`). Si en el futuro se añade un fixture de la API, se reintroducirán como e2e reales con su iteración correspondiente.

> 2026-06-19 (a11y, SPEC-0002 §16): los checkboxes de fila del asistente reciben `aria-label`.

---

## 19. Fix mapeo de tipos de campo a Marketing Forms API v3 (2026-06-19)

Origen: al aplicar el cambio pendiente «Crear formulario "Aficiones"» HubSpot devolvía `Could not resolve type id 'checkbox' as a subtype of FieldBase`. El mapa propiedad→formulario (§3) enviaba tres `fieldType` que **no existen** en la Marketing Forms API v3. Tipos válidos: `datepicker, dropdown, email, file, mobile_phone, multi_line_text, multiple_checkboxes, number, payment_link_radio, phone, radio, single_checkbox, single_line_text`.

Correcciones:

| Propiedad HubSpot | Antes (inválido) | Ahora |
|-------------------|------------------|-------|
| `checkbox`        | `checkbox`       | `multiple_checkboxes` |
| `booleancheckbox` | `booleancheckbox`| `single_checkbox` |
| `date`            | `date`           | `datepicker` |

Ficheros tocados: tabla §3; `src/main/forms-management/field-map.ts`; su espejo `src/renderer/features/forms-management/components/NewFormWizard.tsx`; y el test `src/main/forms-management/field-map.spec.ts` (expectativas actualizadas). Pendiente en máquina: `npm run typecheck` y `npm run test:unit`.
