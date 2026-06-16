# SPEC-0008 — Gestión de Formularios

**Estado:** BORRADOR  
**Branch:** `feat/spec-0008-gestion-formularios`  
**Fecha:** 2026-06-16  
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
| `checkbox`                           | `checkbox`                |
| `booleancheckbox`                    | `booleancheckbox`         |
| `date`                               | `date`                    |
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
- `forms-flow.spec.ts` — sincronizar (mock) → ver formulario con campos faltantes → «Añadir campos» → cambio pendiente → aplicar en sandbox → cobertura actualizada.
- `new-form.spec.ts` — asistente «+ Formulario»: elegir objeto y origen, preselección de campos, generar `create_form`.
- `link-origin.spec.ts` — asociar un formulario `captured` a un origen y ver el informe de cobertura.

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

- [ ] Se importan los formularios existentes (legacy y nueva herramienta) y se clasifican por tipo.
- [ ] Un formulario se puede asociar a uno o varios orígenes (estado local).
- [ ] El informe de cobertura detecta correctamente los campos presentes y los que faltan respecto al origen, por objeto.
- [ ] «Añadir campos que faltan» genera un cambio pendiente que solo añade los campos ausentes.
- [ ] El asistente «+ Formulario» crea un formulario definiendo únicamente campos, generando un cambio pendiente.
- [ ] Ningún cambio se aplica en HubSpot sin confirmación; se puede aplicar en sandbox antes que en producción.
- [ ] Las ocho herramientas MCP están disponibles y devuelven datos correctos; las de escritura solo preparan cambios pendientes.
- [ ] El volcado a Google Sheets funciona best-effort (con Drive conectado) y no rompe el flujo si falta.
- [ ] Todos los tests del SPEC en verde.
- [ ] Los seis tutoriales de usuario están creados en `doc/tutoriales/formularios/`.
- [ ] PR creada, revisada y mergeada en `main`.
