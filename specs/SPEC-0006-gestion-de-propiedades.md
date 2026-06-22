# SPEC-0006 — Gestión de Propiedades

**Estado:** IMPLEMENTADO  
**Branch:** `feat/spec-0006-gestion-propiedades`  
**Fecha:** 2026-06-09 (implementado 2026-06-11)  
**Depende de:** SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0005

---

## 1. Objetivo

Centralizar la gestión del mapa de propiedades de un proyecto RevOps: qué propiedades existen en HubSpot, cuál es su origen, qué transformaciones requieren, y qué cambios hay que aplicar en HubSpot para mantener la coherencia. El estado operativo vive en el estado local del proyecto (`electron-store`) y HubSpot; el Google Sheets con identidad CD es un artefacto exportable y reimportable (no fuente de verdad — ver §21 y SPEC-0004 §15). La app es la interfaz de edición y sincronización con HubSpot.

---

## 2. Contexto y Decisiones de Diseño

### Fuente de verdad
- El estado operativo del mapa de propiedades vive en el **estado local del proyecto** (`electron-store`).
- El **Google Sheets** gestionado por SPEC-0004 es un artefacto **exportable y reimportable**, no la fuente de verdad. La escritura y la carga son acciones explícitas del usuario (ver §21 y SPEC-0004 §15). ~~La app lee de Drive al abrirse y ante sincronización manual; escribe en Drive ante cualquier cambio del usuario.~~ **Revocado por §21 (BORRADOR, 2026-06-17).**
- HubSpot es la fuente de verdad del estado actual de las propiedades en el portal; la app reconcilia la definición del proyecto con ese estado para detectar divergencias.

### Estructura del Google Sheets (schema_version: 1)
Cuatro hojas, diseño cerrado por versión (solo el usuario puede editar las columnas marcadas como editables):

| Hoja | Contenido |
|------|-----------|
| `00_Portada` | Identidad CD, descripción del archivo, guía de uso, columnas editables vs. gestionadas, `schema_version` |
| `01_Origenes` | Catálogo de orígenes de datos del proyecto |
| `02_Propiedades` | Listado maestro de propiedades con su definición en HubSpot |
| `03_Mapeo_Origenes` | Relación propiedad ↔ origen con reglas de transformación |

### Versión de API HubSpot utilizada
- Lectura de propiedades: **CRM Properties API v3** — `GET /crm/v3/properties/{objectType}`
- Creación/edición de propiedades: **CRM Properties API v3** — `POST/PATCH /crm/v3/properties/{objectType}`
- Verificar en `https://developers.hubspot.com/docs/api/crm/properties` antes de implementar.

### Cambios en HubSpot
- La app **nunca aplica cambios en HubSpot de forma automática**. Todos los cambios propuestos se presentan como una lista de operaciones pendientes que el usuario debe revisar y aceptar explícitamente.
- El usuario puede aplicar un cambio al entorno **sandbox** primero para validarlo antes de aplicarlo a **producción**.
- Un cambio aceptado en sandbox no se marca como completado hasta que también se aplica en producción (o el usuario lo descarta para producción).

### Exportación JSON
- El JSON exportado por origen es un contrato de integración para desarrolladores.
- Se genera bajo demanda (no se guarda en Drive automáticamente).
- El schema del JSON es versionado (`schema_version` en la raíz).

---

## 3. Modelo de Datos

### Tipo `DataOrigin`
```typescript
type OriginType = 'integration' | 'migration' | 'user' | 'workflow';

interface DataOrigin {
  id: string;           // uuid
  name: string;         // ej: 'Salesforce Migration Q1'
  type: OriginType;
  description?: string;
  createdAt: string;
}
```

### Tipo `HubSpotProperty`
```typescript
type HsPropertyType =
  | 'string' | 'number' | 'date' | 'datetime'
  | 'enumeration' | 'bool' | 'phone_number';

interface HsPropertyOption {
  label: string;
  value: string;
  displayOrder: number;
  hidden: boolean;
}

interface HubSpotProperty {
  id: string;                      // uuid interno
  hubspotName: string;             // nombre técnico en HubSpot
  label: string;                   // etiqueta legible
  objectType: string;              // 'contacts' | 'deals' | 'companies' | ...
  type: HsPropertyType;
  fieldType: string;               // 'text' | 'select' | 'checkbox' | ...
  groupName: string;
  isCustom: boolean;               // true = propiedad creada por el cliente
  description?: string;
  options?: HsPropertyOption[];    // para enumeration
  hubspotStatus: 'exists' | 'missing' | 'divergent'; // estado vs. HubSpot real
  pendingChanges?: HsPropertyChange[];
}
```

### Tipo `TransformationRule`
```typescript
interface TransformationRule {
  sourceValue: string;
  targetValue: string;
}
```

### Tipo `PropertyOriginMapping`
```typescript
interface PropertyOriginMapping {
  id: string;
  propertyId: string;       // ref a HubSpotProperty.id
  originId: string;         // ref a DataOrigin.id
  sourceField: string;      // nombre del campo en el origen
  transformations: TransformationRule[]; // solo si el tipo lo requiere
  notes?: string;
}
```

### Tipo `HsPropertyChange` (cambio pendiente en HubSpot)
```typescript
type ChangeOperation = 'create' | 'update_label' | 'update_options' | 'update_field_type';

interface HsPropertyChange {
  id: string;
  propertyId: string;
  operation: ChangeOperation;
  payload: unknown;               // body de la llamada a la API
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
}
```

### Contrato JSON de exportación por origen
```typescript
interface OriginExport {
  schema_version: 1;
  origin: Pick<DataOrigin, 'id' | 'name' | 'type'>;
  exported_at: string;           // ISO 8601
  properties: Array<{
    hubspot_name: string;
    label: string;
    object_type: string;
    type: HsPropertyType;
    source_field: string;
    transformations: Array<{
      sourceValue: string;  // valor tal como llega del origen
      targetValue: string;  // valor válido en HubSpot
    }>;
    notes?: string;
  }>;
}
```

---

## 4. Estructura del Google Sheets (schema_version: 1)

### Hoja `01_Origenes`
| Columna | Editable | Descripción |
|---------|----------|-------------|
| ID | No | UUID generado por la app |
| Nombre | Sí | Nombre descriptivo del origen |
| Tipo | Sí | `integration` / `migration` / `user` / `workflow` |
| Descripción | Sí | Texto libre |
| Fecha de creación | No | Gestionada por la app |

### Hoja `02_Propiedades`
| Columna | Editable | Descripción |
|---------|----------|-------------|
| ID | No | UUID interno |
| Nombre HubSpot | No | Nombre técnico |
| Etiqueta | Sí | Etiqueta legible |
| Objeto | No | contacts / deals / ... |
| Tipo | No | Tipo de campo HubSpot |
| Personalizada | No | Sí / No |
| Grupo | No | Grupo en HubSpot |
| Opciones | No | Valores permitidos (para enumeraciones) |
| Descripción | Sí | Texto libre |
| Estado HubSpot | No | exists / missing / divergent |
| Cambios pendientes | No | Resumen textual de cambios propuestos |
| Orígenes | No | Lista de nombres de orígenes mapeados a esta propiedad, cada uno con hipervínculo a su fila en `03_Mapeo_Origenes` |

### Hoja `03_Mapeo_Origenes`
| Columna | Editable | Descripción |
|---------|----------|-------------|
| ID | No | UUID |
| Propiedad (nombre HubSpot) | No | Referencia |
| Origen | No | Nombre del origen |
| Campo origen | Sí | Nombre del campo en el sistema de origen |
| Transformaciones | Sí | JSON inline de reglas (valor_origen → valor_hs) |
| Notas | Sí | Texto libre |

---

## 5. Interfaz de Usuario

### Menú lateral — nueva entrada
```
CRM
  — Propiedades     ← nueva entrada
```

### Vista principal: Propiedades

```
┌─────────────────────────────────────────────────────────┐
│  [DARK]  CRM / Propiedades         [PROD]  [↻ Sync HS] │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT]                                                │
│  [+ Propiedad]  [Orígenes (3)]  [Exportar JSON ▾]      │
│  Buscar...    Objeto ▾   Tipo ▾   Origen ▾   Estado ▾  │
│  ──────────────────────────────────────────────────     │
│  hs_lead_status     contacts  enumeration  ● exists    │
│    Orígenes: [Salesforce] [Workflow: Lead Score]        │
│  custom_tier        contacts  enumeration  ⚠ divergent │
│    Orígenes: [Migration Q1]     [Ver cambios →]        │
│  new_custom_prop    contacts  string       ✕ missing   │
│    Orígenes: [Integración X]    [Aplicar en HS →]      │
└─────────────────────────────────────────────────────────┘
```

Indicadores de estado:
- `● exists` — badge lima (propiedad existe y coincide con la definición)
- `⚠ divergent` — badge gris con icono (existe pero difiere)
- `✕ missing` — badge gris oscuro (no existe en HubSpot)

### Panel lateral de propiedad (al hacer clic)

Muestra la definición completa, los orígenes mapeados con sus transformaciones, y el listado de cambios pendientes con botones de acción.

### Vista de Cambios Pendientes

```
┌─────────────────────────────────────────────────────────┐
│  [DARK]  Propiedades / Cambios pendientes               │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT]                                                │
│  [01]  custom_tier  —  Añadir opción "enterprise"       │
│        PATCH /crm/v3/properties/contacts/custom_tier    │
│        [ Aplicar en Sandbox ]  [ Aplicar en Producción ]│
│        Estado: sandbox ✓  producción ✕                  │
│                                                         │
│  [02]  new_custom_prop  —  Crear propiedad              │
│        POST /crm/v3/properties/contacts                 │
│        [ Aplicar en Sandbox ]  [ Aplicar en Producción ]│
│        Estado: pendiente                                │
└─────────────────────────────────────────────────────────┘
```

### Modal "Gestionar Orígenes"

Tabla CRUD de `DataOrigin` del proyecto. Tipos disponibles: integración, migración, usuario, workflow.

### Exportar JSON

Dropdown con un ítem por origen. Al seleccionar, descarga `{nombre-origen}_{fecha}.json`.

---

## 6. IPC Channels

| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `properties:list` | renderer → main | `{ projectId }` | `HubSpotProperty[]` |
| `properties:upsert` | renderer → main | `{ projectId, property }` | `HubSpotProperty` |
| `properties:sync-hubspot` | renderer → main | `{ projectId }` | `{ updated: number, divergent: number, missing: number }` |
| `properties:apply-change` | renderer → main | `{ projectId, changeId, environment }` | `{ success, error? }` |
| `properties:discard-change` | renderer → main | `{ projectId, changeId }` | `{ success }` |
| `origins:list` | renderer → main | `{ projectId }` | `DataOrigin[]` |
| `origins:create` | renderer → main | `{ projectId, origin }` | `DataOrigin` |
| `origins:update` | renderer → main | `{ projectId, origin }` | `DataOrigin` |
| `origins:delete` | renderer → main | `{ projectId, originId }` | `{ success }` |
| `mappings:list` | renderer → main | `{ projectId, propertyId? }` | `PropertyOriginMapping[]` |
| `mappings:upsert` | renderer → main | `{ projectId, mapping }` | `PropertyOriginMapping` |
| `mappings:delete` | renderer → main | `{ projectId, mappingId }` | `{ success }` |
| `properties:export-json` | renderer → main | `{ projectId, originId }` | `OriginExport` |

---

## 7. Scopes HubSpot Necesarios

| Scope | Motivo |
|-------|--------|
| `crm.schemas.contacts.read` | Leer propiedades de contactos |
| `crm.schemas.deals.read` | Leer propiedades de deals |
| `crm.schemas.companies.read` | Leer propiedades de companies |
| `crm.schemas.contacts.write` | Crear/editar propiedades de contactos |
| `crm.schemas.deals.write` | Crear/editar propiedades de deals |
| `crm.schemas.companies.write` | Crear/editar propiedades de companies |

---

## 8. Herramientas MCP expuestas

| Tool | Descripción |
|------|-------------|
| `properties_list` | Lista las propiedades del proyecto con su estado vs. HubSpot |
| `properties_get` | Detalle de una propiedad por nombre o ID |
| `properties_export_origin` | Genera el JSON de exportación para un origen |
| `origins_list` | Lista los orígenes de datos del proyecto |
| `properties_pending_changes` | Lista los cambios pendientes de aplicar en HubSpot |

---

## 9. Implementación — Tareas Atómicas

1. **`connectors/hubspot/properties.ts`** — funciones `listProperties()`, `createProperty()`, `patchProperty()` usando CRM Properties API v3
2. **`renderer/features/property-management/store/`** — Zustand stores: `propertiesStore`, `originsStore`, `mappingsStore`
3. **IPC handlers** `properties:*`, `origins:*`, `mappings:*`
4. **Lógica de reconciliación** — comparar propiedades locales vs. respuesta de HubSpot, generar `HsPropertyChange[]`
5. **Lógica de exportación** — transformar store a `OriginExport`
6. **Google Sheets writer** — funciones para escribir/leer las cuatro hojas con el schema v1 (usando conector de SPEC-0004); incluye portada con identidad CD
7. **Componente `<PropertiesTable />`** — tabla con filtros y badges de estado
8. **Componente `<PropertyPanel />`** — panel lateral con detalle, orígenes y cambios
9. **Componente `<OriginsModal />`** — CRUD de orígenes
10. **Componente `<PendingChangesView />`** — lista de cambios con acciones por entorno
11. **Registro de tools MCP** en `mcp/registry`
12. **Documentación de usuario** — crear tutoriales en `doc/tutoriales/propiedades/`
13. **Commit** — `feat(properties): gestión de propiedades con mapa Drive y sincronización HubSpot`

---

## 10. Tests Requeridos

### Unitarios
- `properties-reconcile.spec.ts` — detecta correctamente `exists`, `divergent` y `missing` al comparar definición local vs. respuesta mock de HubSpot
- `origin-export.spec.ts` — el JSON exportado cumple el schema `OriginExport` y contiene las transformaciones correctas
- `pending-changes.spec.ts` — una propiedad `divergent` genera las operaciones de cambio correctas; los cambios se marcan como aplicados al recibir respuesta OK
- `sheets-writer.spec.ts` — las cuatro hojas se escriben con el contenido correcto (mock del cliente Drive)

### Funcionales
- `properties-flow.spec.ts` — flujo completo: sincronizar con HS (mock) → ver propiedad divergente → aplicar cambio en sandbox → estado actualizado
- `origin-crud.spec.ts` — crear, editar y eliminar un origen; verificar que el cambio se refleja en el Sheets (mock Drive)

---

## 11. Documentación de Usuario

Tutoriales a crear en `doc/tutoriales/propiedades/`:

| Fichero | Tarea que describe |
|---------|-------------------|
| `gestionar-origenes.md` | Cómo crear, editar y eliminar orígenes de datos (integraciones, migraciones, usuario, workflows) y cuándo usar cada tipo |
| `anadir-propiedad.md` | Cómo añadir una propiedad al mapa, qué campos rellenar y cómo asociarle orígenes |
| `mapear-transformaciones.md` | Cómo definir el campo origen y las reglas de transformación de valores para cada origen de una propiedad |
| `sincronizar-hubspot.md` | Cómo sincronizar el mapa con HubSpot, entender los estados (exists / divergent / missing) y qué implica cada uno |
| `aplicar-cambios-hubspot.md` | Cómo revisar los cambios pendientes, aplicarlos primero en sandbox, validar y luego aplicar en producción |
| `exportar-json.md` | Cómo exportar las definiciones de propiedades por origen en JSON y para qué sirve ese fichero en desarrollo |

---

## 12. Consideraciones de Seguridad

- Los cambios en HubSpot requieren confirmación explícita del usuario — sin operaciones de escritura silenciosas.
- El entorno activo (prod/sandbox) siempre visible antes de confirmar cualquier operación de escritura.
- Las transformaciones definidas por el usuario se validan antes de guardar (no se permiten scripts, solo mappings de valor).

---

## 13. Criterios de Aceptación

- [ ] Las propiedades se sincronizan con HubSpot y se clasifica su estado correctamente
- [ ] Se pueden crear, editar y eliminar orígenes de datos
- [ ] Se pueden mapear propiedades a orígenes con reglas de transformación
- [ ] Los cambios propuestos en HubSpot se muestran como operaciones pendientes; ninguno se aplica sin confirmación
- [ ] Un cambio se puede aplicar en sandbox antes que en producción
- [ ] El JSON exportado por origen contiene todas las propiedades y transformaciones
- [ ] El Google Sheets se crea con las cuatro hojas, identidad CD y portada de contexto
- [ ] Las herramientas MCP están disponibles y devuelven datos correctos
- [ ] Todos los tests del SPEC en verde
- [ ] Los seis tutoriales de usuario están creados en `doc/tutoriales/propiedades/`
- [ ] PR creada, revisada y mergeada en `main`

---

## 14. Notas de Implementación (2026-06-11)

Decisiones tomadas durante la implementación, registradas según la norma «cada iteración sobre un código debe modificar el spec»:

- **Canal `properties:upsert`**: la tabla IPC del §6 no contemplaba crear/editar propiedades, pero la maqueta del §5 incluye el botón «+ Propiedad». Se añadió el canal `properties:upsert` (y el método equivalente en `RevOpsApi`) para soportar el alta y edición local de propiedades. Una propiedad nueva nace con estado `missing`; la sincronización genera su cambio `create`.
- **Extensión del conector de Google Drive (SPEC-0004)**: el conector solo escribía Google Docs. Para el Google Sheets de cuatro hojas se añadió `connectors/google-drive/sheets-client.ts` (Sheets API v4 real, inyectable) y el método `writeSpreadsheet()` al conector. Esto amplía el alcance de SPEC-0004; queda anotado aquí y en ese SPEC.
- **Importación en sincronización**: al sincronizar, las propiedades del portal que no estaban en el mapa se importan con estado `exists`, de modo que la tabla se puebla desde el primer uso.
- **Volcado a Sheets best-effort**: si el proyecto no tiene carpeta de Drive seleccionada, las operaciones locales no fallan; el volcado al Sheets se omite silenciosamente y el estado local sigue siendo válido.
- **Reconciliación**: módulo puro `property-management/reconcile.ts` + `pending-changes.ts`. Estados: `exists` (coincide), `divergent` (existe pero difiere en etiqueta, tipo/fieldType u opciones), `missing` (no existe).
- **Tools MCP**: registradas las cinco del §8, todas de solo lectura. La aplicación de cambios en HubSpot nunca pasa por MCP.

### Ficheros principales creados

- `connectors/hubspot/properties.ts` — CRM Properties API v3
- `connectors/google-drive/sheets-client.ts` — Sheets API v4
- `main/property-management/` — `reconcile.ts`, `pending-changes.ts`, `origin-export.ts`, `sheets-model.ts`, `sheets-writer.ts`, `service.ts`, `store.ts`, `mcp-tools.ts`, `index.ts`
- `renderer/features/property-management/` — stores (`properties`, `origins`, `mappings`) y componentes (`PropertiesTable`, `PropertyPanel`, `OriginsModal`, `PendingChangesView`, `AddPropertyDialog`, `MappingDialog`, `StatusBadge`, `PropertyManagementScreen`)
- `doc/tutoriales/propiedades/` — los seis tutoriales del §11
- Tests unitarios (Vitest) y funcionales (Playwright) de los §10

---

## 15. Corrección — Reconocimiento fiel de tipos y reconciliación por objeto (IMPLEMENTADO, 2026-06-11)

### Contexto

Tras la primera sincronización real (portal «Testing») se observan propiedades mal clasificadas y divergencias falsas: por ejemplo `annualrevenue` aparece como `divergent` con un cambio propuesto `update_field_type` a «text», pese a no haberla editado el usuario. Es un único arreglo lógico con dos facetas que se resuelven juntas.

### Causas raíz (confirmadas vía MCP de HubSpot)

1. **Colapso de tipos.** `connectors/hubspot/properties.ts` → `normalizeType()` solo admitía 7 valores y colapsaba cualquier otro a `string`. Además, el conjunto era incorrecto: incluía `phone_number` (que **no** es un `type` de HubSpot) y omitía `json` y `object_coordinates`.
2. **Reconciliación por nombre global.** `reconcile.ts` indexaba los remotos en un `Map` por `name`, sin tener en cuenta el objeto. Como una misma propiedad existe en varios objetos con definición distinta (confirmado: `annualrevenue` es `string` en **contacts** y `number` en **companies**), colisionaban y se comparaba la local de un objeto contra el remoto de otro → `divergent` falso.

### Enum autorizado de HubSpot (Properties API, doc oficial)

- **`type`:** `bool`, `enumeration`, `date`, `datetime`, `string`, `number`, `object_coordinates`, `json`.
- **`fieldType`:** `booleancheckbox`, `calculation_equation`, `checkbox`, `date`, `file`, `html`, `number`, `phonenumber`, `radio`, `select`, `text`, `textarea`.

### Solución implementada (preservar verbatim)

1. **Preservar verbatim.** `toRemoteProperty()` y la importación guardan el `type` y el `fieldType` **exactos** de HubSpot, sin colapsar. `normalizeType()` pasa a ser un passthrough.
2. **`HsPropertyType`** (en `shared/types/properties.ts`) pasa al enum real de HubSpot (los 8 `type`) **más un fallback abierto** (`(string & {})`). Se elimina `phone_number` del enum.
3. **Reconciliación por objeto.** `reconcile()` indexa por la clave compuesta **`objectType + name`**; `RemoteProperty` gana `objectType`, que `listProperties()` estampa por llamada. Un local de `contacts` solo se compara con el remoto de `contacts`.
4. **`diffProperty()`** solo genera `update_field_type` ante diferencia real dentro del mismo objeto.

### Tests añadidos

- `reconcile.spec.ts`: `annualrevenue` (string@contacts / number@companies) no produce divergencia cruzada; ambas quedan `exists`.
- `properties.spec.ts`: un `type` no estándar se preserva verbatim (no se colapsa a `string`); se verific
### 16.11 Objetos de origen (iteración UI, 2026-06-11)

Cada `DataOrigin` puede tener sus propios **objetos** (`OriginObject { id, name }`, p. ej. «contactos», «empresas» del sistema origen), dados de alta con la misma mecánica que los orígenes, dentro del modal de Orígenes. En el asistente «Añadir propiedad», cada fuente añade un selector **Objeto del origen** (origen → objeto → campo); el objeto elegido se guarda en `EntrySource.originObjectId` y se refleja en la exportación JSON (`source_object`). Gestión vía `origins:update` (sin canal nuevo).
ctor** de propiedades por objeto y el **estado** (exists/divergent/missing). La creación de **objetos custom** se especifica aparte en **SPEC-0007** (referenciado desde aquí); esta iteración solo permite **seleccionar** objetos existentes (estándar y custom ya creados en el portal).

### 16.1 Concepto

La lista pasa a organizarse **por objeto de HubSpot**. Dentro de cada objeto, el usuario define **entradas** con «Añadir propiedad». Cada entrada vincula un nombre lógico, una **propiedad de HubSpot destino** (existente o nueva; **puede repetirse** entre entradas) y **uno o varios orígenes**, cada uno con su **campo de origen** y una **definición genérica de tipo** propia del origen.

### 16.2 Modelo de datos

```typescript
type SourceFieldKind = 'number' | 'text' | 'boolean' | 'enum' | 'memo';

// Cómo llega un booleano desde el origen (formato de recepción).
interface BooleanReception {
  truthy: string;   // p.ej. 'true' | '1' | 'Yes'
  falsy: string;    // p.ej. 'false' | '0' | 'No'
}

// Opción de un campo de origen limitado y su mapeo a la opción de HubSpot.
interface SourceEnumOption {
  sourceValue: string;
  sourceLabel?: string;
  hubspotValue?: string;   // opción HubSpot mapeada (si el destino es enumeration)
}

interface SourceFieldDefinition {
  kind: SourceFieldKind;
  boolean?: BooleanReception;     // solo si kind === 'boolean'
  options?: SourceEnumOption[];   // solo si kind === 'enum'
}

interface EntrySource {
  id: string;
  originId: string;               // ref a DataOrigin
  sourceField: string;            // nombre del campo en el sistema de origen
  definition: SourceFieldDefinition;
  notes?: string;
}

// Propiedad de HubSpot destino: existente o nueva (a crear).
type HubSpotPropertyRef =
  | { mode: 'existing'; hubspotName: string }
  | { mode: 'new'; definition: HubSpotPropertyDef };

interface HubSpotPropertyDef {
  hubspotName: string;
  label: string;
  type: HsPropertyType;
  fieldType: string;
  groupName: string;
  options?: HsPropertyOption[];
}

// Nuevo elemento maestro de la lista (sustituye a HubSpotProperty + PropertyOriginMapping).
interface PropertyEntry {
  id: string;
  objectType: string;                  // objeto HubSpot (estándar o custom)
  name: string;                        // nombre lógico de la entrada
  hubspotProperty: HubSpotPropertyRef; // destino (puede repetirse entre entradas)
  sources: EntrySource[];              // uno o varios orígenes
  hubspotStatus: 'exists' | 'missing' | 'divergent';
  pendingChanges?: HsPropertyChange[];
}

// Catálogo de objetos disponibles (estándar + custom existentes).
interface HubSpotObject {
  objectType: string;   // 'contacts' | 'companies' | ... | id del custom
  label: string;
  custom: boolean;
}
```

`DataOrigin` se mantiene igual. `TransformationRule` queda **sustituido** por `SourceFieldDefinition` (tipado y, para enum, mapeo de opciones). `HsPropertyChange` se mantiene (create / update_label / update_options / update_field_type) y ahora deriva de la definición destino de las entradas.

### 16.3 Flujo «Añadir propiedad» (por objeto)

1. El usuario elige el **objeto** (selector con estándar + custom existentes).
2. **Nombre de la propiedad** (lógico).
3. **Propiedad de HubSpot destino**: seleccionar una existente del objeto, o **crear nueva** (define `HubSpotPropertyDef`; queda como cambio pendiente `create`). La misma propiedad puede usarse en varias entradas.
4. **Orígenes** (añadir uno o varios). Por cada origen:
   - Selección del **origen** (de los `DataOrigin` del proyecto).
   - **Campo de origen** (texto).
   - **Definición genérica**: `número` | `texto` | `booleano` | `enum` | `memo`.
     - `booleano`: indicar el **formato de recepción** (`truthy`/`falsy`: true/false, 0/1, Yes/No…).
     - `enum`: definir las **opciones de origen** y, si el destino HubSpot es `enumeration`, el **mapeo** opción origen → opción HubSpot.
   - Notas opcionales.

> **Sincronización con SPEC-0007 (editor de tipo/`fieldType`).** El editor de la **definición de propiedad de HubSpot** (`type` → `fieldType`) del `EntryWizard` se comparte conceptualmente con el asistente de creación de objetos custom de **[SPEC-0007](SPEC-0007-objetos-custom-hubspot.md)**: el mapeo `FIELD_TYPES_BY_TYPE` y las claves i18n `properties.fieldTypes.*` deben ser **idénticos** en ambas interfaces. Cualquier cambio en los tipos/fieldTypes admitidos o en sus etiquetas debe aplicarse en los dos sitios a la vez (y anotarse en ambos SPECs). Ver SPEC-0007 §4 y §14.

### 16.4 Estructura del Google Sheets (schema_version: 2)

El documento de Drive sube a `schema_version: 2` y refleja el nuevo modelo:

| Hoja | Contenido |
|------|-----------|
| `00_Portada` | Identidad CD + `schema_version: 2` + guía actualizada |
| `01_Origenes` | Igual que v1 (catálogo de orígenes) |
| `02_Entradas` | ID, Objeto, Nombre, Propiedad HubSpot, ¿Nueva?, Tipo HubSpot, Estado, Nº orígenes, Cambios pendientes |
| `03_Fuentes` | ID, Entrada, Objeto, Origen, Campo origen, Tipo genérico, Formato booleano, Notas |
| `04_Opciones` | Entrada, Origen, Valor origen, Etiqueta origen, Valor HubSpot (mapeo enum) |

### 16.5 Interfaz de usuario

- La vista de Propiedades se **agrupa por objeto** (selector/encabezado de objeto).
- «Añadir propiedad» pasa a ser un asistente con los pasos de §16.3 (sustituye al diálogo actual de alta y al de mapeo).
- El panel lateral de una entrada muestra: destino HubSpot, estado, y la lista de orígenes con su definición genérica y, en su caso, el mapeo de opciones.

### 16.6 IPC (cambios)

- Nuevos: `objects:list` (catálogo estándar + custom), `entries:list`, `entries:upsert`, `entries:delete`.
- `properties:*` se reorientan: `properties:sync-hubspot` sigue existiendo (alimenta selector + estado), `properties:apply-change`/`discard-change` se mantienen. `properties:upsert` y `mappings:*` quedan **sustituidos** por `entries:*`.
- `properties:export-json` por origen pasa a derivarse de las entradas/fuentes.

### 16.7 Reconciliación

El estado de una entrada se calcula sobre su **propiedad HubSpot destino** (por `objectType + hubspotName`): `exists` si existe y la definición destino coincide; `divergent` si existe pero difiere (etiqueta/tipo/opciones); `missing` si es `mode: 'new'` o no existe → cambio `create`. Varias entradas pueden apuntar a la misma propiedad destino.

### 16.8 Tests requeridos

- Alta de entrada con destino existente → `exists`; con destino nuevo → `missing` + cambio `create`.
- Origen `boolean` con formato de recepción persistido y aplicado.
- Origen `enum` con opciones y mapeo a opciones de HubSpot.
- Dos entradas con la misma propiedad destino conviven sin conflicto.
- El Sheets v2 escribe las cinco hojas con la estructura anterior (mock del cliente Drive).

### 16.9 Fuera de alcance (→ SPEC-0007)

- Creación de objetos custom en HubSpot (CRM Schemas API). Aquí solo se **seleccionan** objetos existentes; el catálogo se obtiene del portal.

### 16.10 Impacto

- `shared/types/properties.ts` (nuevos tipos `PropertyEntry`, `EntrySource`, `SourceFieldDefinition`, `HubSpotObject`).
- `connectors/hubspot/` (listado de objetos vía Schemas API; selector de propiedades por objeto).
- `main/property-management/` (servicio y store de entradas; reconciliación por destino; export desde entradas; `sheets-model` v2).
- `renderer/features/property-management/` (vista por objeto, asistente «Añadir propiedad», panel de entrada).
- Migración del Sheets v1 → v2 y del estado local existente.

## 17. Corrección — Saneo de opciones vacías y traducción de estados (IMPLEMENTADO, 2026-06-15)

### Contexto

Dos defectos detectados al aplicar y revisar entradas de tipo enumeración:

1. Aplicar un `update_options` sobre HubSpot devolvía `Request failed with status code 400` cuando la
   definición incluía una opción con `label`/`value` vacíos (el editor dejaba una fila en blanco).
2. Tras actualizar correctamente en HubSpot, la entrada seguía marcada como `divergent`: la
   reconciliación comparaba `def.options` (con la opción vacía) contra las opciones reales de HubSpot.
3. Los chips de estado (`exists`/`divergent`/`missing`) se mostraban en inglés: las claves
   `properties.status.*` existían con el valor en inglés como marcador en los cuatro idiomas.

### Solución implementada

- `pending-changes.ts`: `cleanOptions()` descarta opciones con `label`/`value` vacíos y reindexa
  `displayOrder`. Se aplica al construir los payloads (`create` y `update_options`) **y** en la
  comparación de `diffDefinition` (`optionsEqual(cleanOptions(def.options), remote.options)`), de modo
  que una opción vacía almacenada no genera divergencia falsa.
- `service.ts`: `sanitizeRef()` sanea las opciones de la definición destino al hacer `upsertEntry`, de
  forma que el dato vacío no queda almacenado en el store. Además `hubspotErrorMessage()` extrae el
  mensaje real del cuerpo de error 4xx de HubSpot en lugar del genérico de axios.
- Traducciones `properties.status.*`: es (`existe`/`diverge`/`falta`), ca (`existeix`/`divergeix`/`falta`),
  eu (`badago`/`desberdina`/`ez dago`), en se mantiene (`exists`/`divergent`/`missing`).

### Tests añadidos

- `pending-changes.spec.ts`: `cleanOptions` y payloads descartan opciones vacías; `diffDefinition`
  ignora opciones vacías al comparar (no marca divergencia).

## 18. Volcado del mapa de propiedades a Google Sheets (IMPLEMENTADO, 2026-06-15)

La escritura a Drive (§16.4) quedó diferida porque el conector de Drive no funcionaba; `sheets-model.ts`
y `sheets-writer.ts` son stubs. Con el conector ya operativo (SPEC-0004 §13/§14), se implementa el volcado.

### 18.1 Builder de hojas (`sheets-model.ts`)

`buildPropertyMapTabs(entries: PropertyEntry[], origins: DataOrigin[]): SheetTab[]` genera las cinco hojas
de §16.4 (esquema `schema_version: 2`):

- **`00_Portada`** — identidad CD, `schema_version: 2`, fecha y guía (texto fijo + nº de entradas/orígenes).
- **`01_Origenes`** — `ID, Nombre, Tipo, Descripción, Objetos`.
- **`02_Entradas`** — `ID, Objeto, Nombre, Propiedad HubSpot, ¿Nueva?, Tipo HubSpot, Estado, Nº orígenes,
  Cambios pendientes`.
- **`03_Fuentes`** — `ID, Entrada, Objeto, Origen, Campo origen, Tipo genérico, Formato booleano, Notas`.
- **`04_Opciones`** — `Entrada, Origen, Valor origen, Etiqueta origen, Valor HubSpot`.

Las erratas en nombres/claves de items se reflejan **tal cual** (no se corrigen; SPEC-0000 / preferencia
del usuario). El builder es puro y testeable, sin dependencias de Drive.

### 18.2 Orquestación (sin acoplar el servicio a Drive)

El servicio de propiedades **no** recibe el conector de Drive. El handler IPC en `main/index.ts` orquesta:
construye los `SheetTab[]` a partir de `service.listEntries`/`listOrigins` (vía
`buildPropertyMapTabs`) y los escribe con el conector ya existente
`gdrive.writeSpreadsheet({ projectId, name, featureKey, schemaVersion, tabs })`.

- `featureKey = 'property-management'` (`PROPERTY_MAP_FEATURE_KEY`, ya definido).
- `name = 'Mapa de propiedades CRM'`.
- Requiere cuenta de Google conectada y carpeta de trabajo seleccionada; si falta, `writeSpreadsheet`
  devuelve `{ success:false, error }` y la UI lo muestra.

### 18.3 IPC

| Canal | Dirección | Input | Output |
|-------|-----------|-------|--------|
| `properties:write-sheets` | renderer → main | `{ projectId }` | `{ success, spreadsheetId?, error? }` |

### 18.4 Interfaz de usuario

Botón **«Volcar a Google Sheets»** en la pantalla de Propiedades (junto a «Exportar JSON»). Estados:
deshabilitado mientras no haya entradas; al pulsar muestra progreso y, al terminar, un aviso de éxito
(con el id del documento) o el error devuelto. Si no hay carpeta de Drive, el aviso indica que
se configure el conector.

### 18.5 Tests

- `sheets-model.spec.ts`: `buildPropertyMapTabs` produce las cinco hojas con sus encabezados y una fila por
  entrada/fuente/opción; refleja erratas sin corregirlas.
- El handler se prueba de forma ligera (mock de `writeSpreadsheet`) o queda cubierto por el test del builder
  + el `sheets-client.spec` ya existente del conector.

### 18.6 Impacto

- `sheets-model.ts` (builder real + tipos), `sheets-writer.ts` se elimina o queda absorbido por el builder.
- `service.ts` o un módulo `sheets-export.ts`: helper para obtener entradas+orígenes (ya disponible).
- `ipc.ts`/`preload`/`main` (canal `properties:write-sheets`; el handler usa `gdrive` + builder).
- `PropertyManagementScreen.tsx` (botón + feedback), claves i18n `properties.writeSheets.*` en es/ca/eu/en.

### 18.7 Notas de implementación (2026-06-15)

- `sheets-model.ts`: `buildPropertyMapTabs(entries, origins, generatedAt?)` puro → `SheetTab[]` (5 hojas).
  `PROPERTY_MAP_FEATURE_KEY` se traslada aquí; `sheets-writer.ts` queda como re-export de compatibilidad.
- Handler `properties:write-sheets` en `main/index.ts`: construye las hojas con el servicio
  (`listEntries`/`listOrigins`) y escribe con `gdrive.writeSpreadsheet` (`SheetTab` es estructuralmente
  compatible con el del conector). Contrato en `ipc.ts`/`preload`/`RevOpsApi` (`WriteSheetsResult`).
- UI: botón «Volcar a Google Sheets» junto a «Exportar JSON» con aviso de éxito/error.
- Tests: `sheets-model.spec.ts` (5 casos: 5 hojas, entradas, fuentes con formato booleano, opciones enum,
  erratas reflejadas). Verificado en verde; el typecheck completo debe ejecutarse en la máquina del usuario.
- Con esto, §16.4 y §16.8 (escritura de las 5 hojas) quedan IMPLEMENTADOS. Requiere Drive conectado con
  carpeta seleccionada en tiempo de ejecución.

## 19. Estilo corporativo y bloqueo del Sheets generado (IMPLEMENTADO, 2026-06-15)

Tras escribir los valores (§18), se aplica un `batchUpdate` de formato + protección. Sigue la guía de marca
Cloud District (tokens en `skills/cloud-district-brand`), regla «Table Alternation».

### 19.1 Estilo (marca CD)

- **Fuente Poppins** en todo el libro (`textFormat.fontFamily = 'Poppins'`).
- **Cabecera** (fila 1 de cada hoja de datos): texto **Deep Navy `#14072B`** en negrita, fondo `#F3F3F3`,
  **borde inferior** `#14072B`, fila **congelada** (`frozenRowCount = 1`). Sin bordes laterales.
- **Filas alternas** `#FFFFFF` / `#F3F3F3` (banding, `addBanding`).
- **Autoajuste** del ancho de columnas (`autoResizeDimensions`).
- **`00_Portada`**: bloque oscuro de marca — celda de título A1 con fondo `#090017` y texto blanco, mayor
  tamaño (ritmo dark/light). El valor de `schema_version` se resalta con acento **lima `#AFFC41`** (uso
  puntual, fondo de celda con texto Deep Navy) — único uso del lima.
- Paleta restringida a la de marca; sin otros colores.

### 19.2 Bloqueo (protección de contenido) — decisión validada

- Por cada hoja se añade un **rango protegido** que cubre toda la hoja (`addProtectedRange`,
  `warningOnly: false`, sin `editors`): solo el **propietario** (la cuenta conectada / la app) puede editar;
  los colaboradores no. **No** se tocan los permisos de compartición de Drive (queda fuera, lo gestiona el
  usuario si quiere solo-lectura total).
- **Idempotencia**: antes de recrear, se eliminan los rangos protegidos y las bandas previos (en cada
  volcado el archivo se regenera).

### 19.3 Contrato

- `SheetsRawApi.get` se amplía para devolver, por hoja, `sheetId`, `gridProperties` (filas/columnas) y los
  `protectedRanges`/`bandedRanges` existentes (sus ids), de modo que el paso de estilo pueda limpiarlos.
- Nuevo módulo **puro** `sheets-style.ts`: `buildStyleRequests(sheetsMeta, tabs)` → `Request[]` de
  `batchUpdate` (formato cabecera, banding, congelado, autoajuste, portada, protección, y los `delete*`
  previos). Testeable sin Drive.
- `writeSpreadsheet` añade un paso final `sheets.batchUpdate({ requests })` con esos requests.
- El wiring `googleSheetsClientFor` (SPEC-0004) adapta `spreadsheets.get` para pedir
  `sheets(properties,protectedRanges,bandedRanges)` en `fields`.

### 19.4 Tests

- `sheets-style.spec.ts`: genera el formato de cabecera con `#14072B`/negrita y borde inferior; banding
  `#FFFFFF`/`#F3F3F3`; `frozenRowCount=1`; un `addProtectedRange` por hoja con `warningOnly:false`; e
  incluye los `deleteProtectedRange`/`deleteBanding` cuando `get` reporta previos (idempotencia).

### 19.5 Impacto

- `sheets-client.ts` (`get` ampliado; paso de estilo/protección en `writeSpreadsheet`).
- `sheets-style.ts` (nuevo) + `sheets-style.spec.ts`.
- `connectors/google-drive/index.ts` (`fields` de `spreadsheets.get` en el wiring real).
- Sin cambios de UI ni IPC (el botón «Volcar a Google Sheets» ya dispara todo el flujo).

### 19.6 Notas de implementación (2026-06-15)

- `sheets-style.ts` (puro): `buildStyleRequests(sheets, tabs)` → requests de `batchUpdate`. Tokens CD en
  `CD`. Limpia `protectedRanges`/`bandedRanges` previos (idempotente).
- `sheets-client.ts`: `SheetsRawApi.get` devuelve `SheetMeta[]`; `writeSpreadsheet` añade un `get` final +
  `batchUpdate(styleRequests)`. El test existente sigue en verde (su `get` simulado no casa títulos, así que
  no añade estilo) y `sheets-style.spec.ts` cubre el nuevo módulo (cabecera, banding, portada/lima,
  protección `warningOnly:false`, idempotencia).
- Wiring real: `spreadsheets.get` pide `fields` con `protectedRanges`/`bandedRanges`.
- Verificado: 6 tests en verde. Typecheck completo a ejecutar en la máquina del usuario.

---

## 20. Ajustes derivados de SPEC-0008 (IMPLEMENTADO, 2026-06-16)

Cambios realizados sobre esta característica durante la implementación de SPEC-0008 (gestión de
formularios), al ejecutar la suite e2e completa contra un build actualizado. Se documentan aquí para
mantener la trazabilidad en el SPEC propietario.

### 20.1 `EntryWizard`: el grupo deja de ser obligatorio para guardar (modo «Nueva»)

- **Antes:** `canSubmit` exigía `def.groupName` para crear una propiedad nueva. El grupo se carga de
  `groupsList` (HubSpot), por lo que **sin portal conectado no se podía crear ninguna entrada** (la lista
  de grupos venía vacía y «Guardar» quedaba deshabilitado).
- **Ahora:** en modo «Nueva», `canSubmit = nombre + nombre técnico + etiqueta` (sin exigir grupo). El
  grupo se resuelve antes de **aplicar** el cambio en HubSpot (el payload de creación sigue admitiendo
  `groupName`; si está vacío se asigna/edita antes de aplicar). Esto permite definir entradas locales sin
  portal y desbloquea el flujo de trabajo offline.
- **Fichero:** `renderer/features/property-management/components/EntryWizard.tsx` (`canSubmit`).
- **Nota:** decisión menor de UX tomada desde SPEC-0008; si se prefiere mantener el grupo obligatorio,
  revertir esta línea y dotar al asistente de un grupo por defecto sin depender de HubSpot.

### 20.2 Tests funcionales (e2e) alineados con el rediseño §16

Los e2e de propiedades apuntaban al **diálogo antiguo** de «Añadir propiedad» (campos «Nombre técnico
(HubSpot)»/«Etiqueta», botón «Crear»), sustituido por el `EntryWizard` (modo Existente/Nueva, botón
«Guardar»). Se actualizaron:

- **`tests/functional/properties-flow.spec.ts`**: flujo nuevo (rellenar «Nombre de la propiedad» → toggle
  «Nueva» → nombre técnico + etiqueta → «Guardar»). Aserciones corregidas: badge **«✕ falta»** (i18n
  `properties.status.missing` = «falta», antes el test esperaba «missing») y panel por
  `getByRole('region', { name: 'Definición' })` + `getByRole('heading', { name: 'Cambios pendientes' })`
  (evita el match múltiple con el botón de toolbar y «Sin cambios pendientes»).
- **`tests/functional/export-json.spec.ts`**: reescrito al asistente (fuente añadida dentro del wizard; con
  un único origen se autoselecciona) y `schema_version` esperado **= 2** (era 1; el contrato es 2 desde
  §16.4 / `origin-export.ts`). **Retirado de la ejecución (`test.fixme`)**: la exportación abre el **diálogo
  nativo de «guardar como»** (por diseño, para que el usuario elija ubicación) y Playwright no puede cerrar
  diálogos del SO. La generación del JSON sigue cubierta por los **unitarios** de `origin-export`.
- **`tests/functional/origin-crud.spec.ts`**: sin cambios (no pulsa el botón singular «Propiedad», que por
  match de subcadena de Playwright colisionaba con el ítem de sidebar «Propiedad**es**»).
- Desambiguación de selector: donde se pulsa el botón «Propiedad» se usa `{ name: 'Propiedad', exact: true }`.

### 20.3 Estado e2e tras los ajustes

- Verde: `properties-flow`, `origin-crud` (+ resto de la suite no relacionada).
- `export-json` en `fixme` (diálogo nativo de descarga; cubierto por unitarios).
- La generación del JSON de exportación no cambia de comportamiento; solo se ajustó la prueba.

---

## 21. Adopción del patrón común de documentos Drive (IMPLEMENTADO, 2026-06-17)

Adopta el patrón unificado definido en **SPEC-0004 §15**. Sustituye el volcado actual (§18) por el patrón
común y añade la carga desde Drive.

### 21.1 Cambios respecto a §18

- El botón **«Volcar a Google Sheets»** se renombra a **«Actualizar archivo en Drive»** y pasa a usar el
  componente compartido `DriveDocActions` con las claves i18n compartidas `drive.doc.*`. Se retiran las
  claves `properties.writeSheets.*` (o quedan como alias temporal). El canal `properties:write-sheets`
  conserva su comportamiento crear-o-actualizar best-effort; al éxito registra `lastWrittenAt`.
- Se añade el botón **«Cargar desde Drive»** y el modal recordatorio al salir (`DriveDirtyGuard`).

### 21.2 Carga desde Drive (documento de estado companion)

**Implementado** según la decisión de SPEC-0004 §15.5: la carga **no** parsea el Sheets bonito (es
*lossy*), sino un documento de estado companion (Google Doc JSON) escrito junto al Sheets.

- `main/property-management/drive-state.ts`: `PROPERTY_STATE_FEATURE_KEY = 'property-management-state'`,
  `serializePropertyState({ entries, origins })` y `parsePropertyState(content)` (valida `schema_version`;
  aborta si es mayor que la soportada).
- Canal `properties:load-sheets` (`{ projectId }` → `{ success, schemaVersion?, error? }`): el handler hace
  `gdrive.readFile({ featureKey: PROPERTY_STATE_FEATURE_KEY })`, `parsePropertyState` y
  `service.applyDriveState`. Reconstruye entradas + orígenes **sobrescribiendo** el estado local. No
  re-sincroniza con HubSpot automáticamente.
- El handler de escritura (`properties:write-sheets`) escribe además el Doc de estado y llama
  `service.markDriveWritten`.

### 21.3 Estado *dirty* y modal

- El store de propiedades expone `lastWrittenAt` y el timestamp del último cambio local (alta/edición de
  entrada u origen, reconciliación). `useDriveDoc` calcula *dirty*; al salir de la pantalla con *dirty* se
  muestra `DriveDirtyGuard`. La preferencia «no volver a preguntar» se persiste por proyecto.

### 21.4 Tests

- `drive-state.spec.ts`: `parsePropertyState(serializePropertyState(x)) ≈ x` (round-trip de entradas y
  orígenes; erratas verbatim, SPEC-0000); `parsePropertyState` aborta si `schema_version` > soportada.
- `service.spec.ts`: `getDriveMeta` refleja `lastChangedAt` tras mutación y `lastWrittenAt` tras
  `markDriveWritten`; `applyDriveState` reemplaza estado e iguala timestamps.

### 21.5 Impacto

- `main/property-management/sheets-model.ts` (parser inverso), `service.ts`/`store.ts` (`lastWrittenAt`,
  reemplazo de estado), `mcp-tools.ts`/handler `properties:load-sheets`.
- `ipc.ts`/`preload`/`RevOpsApi` (canal `properties:load-sheets`).
- `PropertyManagementScreen.tsx`: usa `DriveDocActions` + `DriveDirtyGuard` (retira el botón propio de
  volcado); i18n migrado a `drive.doc.*` / `drive.dirtyGuard.*`.

## 22. Defectos detectados en la batería de pruebas del MCP (BORRADOR, 2026-06-18)

Hallazgos de la batería de pruebas del MCP `revops` sobre el proyecto «Testing» (informe completo en
`INFORME-pruebas-mcp-2026-06-18.md`). Afectan a las tools de propiedades, entradas y orígenes. Pendientes
de corrección.

### 22.1 `entries_upsert` no valida `originId`

- La tool acepta y persiste una entrada cuyo `sources[].originId` apunta a un origen **inexistente**, sin
  error ni aviso (verificado al pasar, por errata, un id no registrado).
- **Corrección requerida:** validar que cada `originId` referenciado existe en los orígenes del proyecto y
  devolver error claro en caso contrario.

### 22.2 Los cambios pendientes los genera `properties_sync`, con `changeId` efímeros

- Crear una entrada con propiedad nueva (`mode: "new"`) **no** genera por sí mismo un cambio pendiente; el
  cambio aparece solo tras ejecutar `properties_sync` (que detecta la propiedad como `missing`).
- Además, **`properties_sync` regenera el `changeId` en cada ejecución** (son efímeros): un `changeId`
  leído antes de un `sync` puede dejar de ser válido. Los consumidores deben **releer `properties_pending_changes`
  inmediatamente antes de cada `properties_apply_change`**.
- **Corrección/documentación requerida:** estabilizar los `changeId` entre sincronizaciones o documentar
  explícitamente este comportamiento en el contrato de la tool. `properties_apply_change` (sandbox) y
  `properties_discard_change` quedaron verificados OK (apply idempotente).

### 22.3 Falta borrado de orígenes y de grupos vía MCP

- `origins_*` solo expone `list`/`upsert` (no hay borrado de orígenes) y `groups_*` solo `list`/`create`
  (no hay borrado de grupos). Un origen o grupo de prueba creado vía MCP queda como **residuo no eliminable
  programáticamente** (el grupo, además, es una escritura real en HubSpot).
- **Corrección requerida:** añadir borrado de orígenes (estado local) y evaluar borrado/archivado de grupos.

### 22.4 Implementación (2026-06-18)

- **22.1 — RESUELTO.** `service.upsertEntry` valida que cada `source.originId` exista entre los orígenes del
  proyecto y lanza `Origen no encontrado: <id>` en caso contrario. La UI siempre envía orígenes válidos →
  **la app funciona igual**. Test añadido en `service.spec.ts` (rechazo de id inexistente + alta con id
  válido).
- **22.3 (orígenes) — RESUELTO.** Registrada la tool `origins_delete` (delega en el ya existente
  `service.deleteOrigin`, el mismo que usa la UI; retira el origen y lo limpia de las `sources`).
- **22.3 (grupos) — DIFERIDO.** El borrado de grupos es una escritura destructiva en HubSpot que la UI
  tampoco expone hoy; se difiere para no introducir comportamiento divergente.
- **22.2 — DOCUMENTADO (sin cambio de código).** Los `changeId` los regenera `reconcileEntries` en cada
  `properties_sync` (mismo patrón en objetos custom). Estabilizarlos alteraría la generación de cambios y los
  tests de reconciliación; se mantiene el comportamiento y se documenta el contrato: **releer
  `properties_pending_changes` justo antes de cada `properties_apply_change`**.
- **Pendiente en máquina:** `npm run typecheck` y `npm run test:unit` (clon al sandbox corrupto; originales
  verificados sanos).

---

## 23. Confirmación de borrados y feedback de sincronización (IMPLEMENTADO, 2026-06-19)

Origen: Informe UX 2026-06-19, hallazgos #2 y #1. Borrar propiedad (`EntryPanel.tsx`) y borrar origen (`OriginsModal.tsx` L127-129) se ejecutan a un clic; la aplicación de cambios a sandbox/producción no confirma resultado con un toast.

Adopción de SPEC-0002 §11 (ConfirmDialog):
- Borrar entrada de propiedad → `confirm({ tone:'danger', ... })`.
- Borrar origen de datos → `confirm({ tone:'danger', ... })`.

Adopción de SPEC-0002 §10 (Snackbar):
- Tras `properties_apply_change` / aplicar a sandbox/producción: `notify` con resumen (éxito) o error.

Claves i18n nuevas: `properties.deleteEntryTitle/Body`, `properties.deleteOriginTitle/Body`, `properties.applied`, `properties.applyError` (cuatro locales).

Implementado 2026-06-19: `EntryPanel`/`OriginsModal` usan `useConfirm` para borrar entrada/origen; el toast de resultado se emite en `handleApply` de `PropertyManagementScreen`.

---

## 24. Eliminación del e2e `export-json` (2026-06-19)

Se elimina `tests/functional/export-json.spec.ts`. Estaba en `test.fixme` permanente: el export abre el diálogo nativo «guardar como» del SO (comportamiento deseado, §19.x) que Playwright no puede cerrar, por lo que nunca era ejecutable de forma fiable. La generación del JSON sigue cubierta por los unitarios de `origin-export` (`origin-export.spec.ts`). No se pierde cobertura real.

> 2026-06-19 (higiene, SPEC-0002 §16): eliminado el fichero muerto `PropertiesTable.tsx`.

---

## 25. Ampliación de tipologías de propiedad (IMPLEMENTADO, 2026-06-22)

### 25.1 Contexto

El modelo solo capturaba `type` + `fieldType` + `options` + `groupName`. Contrastado contra la doc oficial
(`developers.hubspot.com/docs/api-reference/latest/crm/properties/create-property`, versión `2026-03`),
faltaban casuísticas que sí admite la API: formato de número (**moneda**, **porcentaje**, duración…),
formato de texto (email, teléfono, dirección…), propiedades **calculadas**, **valor único**, **sensibilidad**
del dato y opciones por referencia. El `fieldType` `calculation_equation` estaba listado en §15 pero no se
ofrecía en ninguna parte de la UI.

### 25.2 Catálogo oficial (verificado en `2026-03`)

- **`type`:** `bool`, `enumeration`, `date`, `datetime`, `string`, `number`, `phone_number` (+ `object_coordinates`,
  `json` internos, no creables).
- **`fieldType`:** `booleancheckbox`, `calculation_equation`, `checkbox`, `date`, `file`, `html`, `number`,
  `phonenumber`, `radio`, `select`, `text`, `textarea`.
- **`numberDisplayHint`:** `unformatted`, `formatted`, `currency`, `percentage`, `duration`, `probability`.
- **`textDisplayHint`:** `unformatted_single_line`, `multi_line`, `email`, `phone_number`, `domain_name`,
  `ip_address`, `physical_address`, `postal_code`.
- **`dataSensitivity`:** `non_sensitive`, `sensitive`, `highly_sensitive`.
- Otros del cuerpo: `description`, `calculationFormula`, `hasUniqueValue` (inmutable tras crear),
  `showCurrencySymbol`, `currencyPropertyName`, `externalOptions` + `referencedObjectType` (`OWNER`),
  `displayOrder`, `hidden`, `formField`.

**Moneda y porcentaje** no son `type` ni `fieldType`: son una propiedad `number` con
`numberDisplayHint='currency'` (+ `showCurrencySymbol`/`currencyPropertyName`) o `'percentage'`.

**Versión de API y `phone_number`:** la preferencia de versión (CLAUDE.md) es `2026-03` > `v4` > `v3` > `v2` > `v1`.
La discrepancia de `phone_number` (admitido como `type` en `2026-03`, descrito como `string` + `fieldType: phonenumber`
en la guía legacy) es un efecto del cambio de versión. El enum `HsPropertyType` ya es abierto (`(string & {})`),
por lo que preserva `phone_number` verbatim sin colapsar. El conector sigue llamando a `/crm/v3/properties/...`;
la migración del path a `/crm/properties/2026-03/...` queda anotada como evolución del conector (SPEC-0003) y no
bloquea esta ampliación (los nuevos campos también los acepta v3).

### 25.3 Modelo de datos

`HubSpotPropertyDef` (en `shared/types/properties.ts`) gana campos **opcionales**: `description`,
`numberDisplayHint`, `showCurrencySymbol`, `currencyPropertyName`, `textDisplayHint`, `calculationFormula`,
`hasUniqueValue`, `dataSensitivity`, `externalOptions`, `referencedObjectType`, `displayOrder`, `hidden`,
`formField`. Nuevos tipos `NumberDisplayHint`, `TextDisplayHint`, `DataSensitivity`. `ChangeOperation` gana
`update_attributes`. `RemoteProperty` (conector) y `toRemoteProperty`/`toDef` transportan los mismos campos
para que las propiedades existentes los expongan al editarlas y reconciliarlas.

### 25.4 Reconciliación y cambios

- **Creación (`createBody`)**: incluye `hasUniqueValue` y los atributos escalares definidos.
- **Diff (`diffDefinition`)**: compara **solo los atributos que el usuario fijó explícitamente** (no `undefined`)
  contra el remoto, para no generar divergencia falsa frente a los valores por defecto de HubSpot. Si difieren,
  emite un cambio `update_attributes` con únicamente los campos cambiados (se aplica vía `PATCH`, igual que el
  resto de `update_*`).

### 25.5 Constantes compartidas (sincronización con SPEC-0007, §16.3)

Se extrae `renderer/shared/constants/hubspotPropertyTypes.ts` con `HS_TYPES`, `FIELD_TYPES_BY_TYPE`
(ahora con `calculation_equation` en los tipos que lo admiten), `fieldTypesFor`, `defaultFieldType` y los
catálogos `NUMBER_DISPLAY_HINTS`/`TEXT_DISPLAY_HINTS`/`DATA_SENSITIVITIES`. `EntryWizard` (SPEC-0006) y
`ObjectWizard` (SPEC-0007) lo importan, eliminando la duplicación y garantizando que el mapeo type→fieldType
sea idéntico. Cualquier cambio al mapeo se hace ahora en un único sitio. Las claves i18n `properties.fieldTypes.*`
ganan `calculation_equation` en los cuatro idiomas.

### 25.6 Interfaz de usuario (EntryWizard)

El editor de definición añade, de forma condicional al tipo/fieldType: `description` (siempre);
`numberDisplayHint` para `number` (+ `showCurrencySymbol`/`currencyPropertyName` si es `currency`);
`textDisplayHint` para `string` con `text`/`textarea`; `calculationFormula` para `calculation_equation`;
`dataSensitivity` (siempre); `hasUniqueValue` (solo al crear). Nuevas claves i18n `properties.advanced.*`,
`properties.numberHints.*`, `properties.textHints.*`, `properties.sensitivity.*` en es/ca/eu/en.

### 25.7 Reordenación de la UI (IMPLEMENTADO, 2026-06-22)

El editor de definición del `EntryWizard` se reorganiza para no crecer en un único formulario plano:

- **Núcleo siempre visible:** nombre técnico, etiqueta, tipo, `fieldType`, opciones de enumeración y grupo.
- **Sección colapsable «Opciones avanzadas»** (`Accordion`, clave i18n `properties.advanced.section`) que agrupa
  los campos de §25: descripción, formato de número (+ moneda), formato de texto, fórmula de cálculo,
  sensibilidad y valor único.
- **Apertura automática:** la sección se abre al cargar una propiedad que ya use opciones avanzadas
  (`hasAdvancedContent`) y al seleccionar `fieldType = calculation_equation` (para que la fórmula quede a la
  vista). En el resto de casos arranca colapsada.

Queda como posible mejora futura extraer un editor de definición reutilizable compartido con `ObjectWizard`
(SPEC-0007); no es necesario para esta iteración.

### 25.8 Opciones de enumeración en diálogo aparte (IMPLEMENTADO, 2026-06-22)

Las enumeraciones con muchas opciones (p. ej. «Hobby», 100 valores) acaparaban el scroll del `EntryWizard`.
Se extraen a un componente dedicado `OptionsDialog` (`renderer/features/property-management/components/`):

- En el `EntryWizard`, las enumeraciones muestran solo un **resumen** «Opciones · N opciones» con un botón
  **«Editar opciones»** que abre el diálogo. El editor inline (filas, pegado masivo) se retira de ahí.
- `OptionsDialog` es **controlado** (`options` + `onChange`): lista con **scroll propio** (maxHeight), **búsqueda**
  por etiqueta/valor, alta/edición/borrado y **pegado masivo** (separador configurable). Reindexa `displayOrder`.
- El mapeo de opciones de origen→HubSpot del bloque de fuentes sigue leyendo `def.options` (sin cambios).
- Claves i18n nuevas en es: `properties.wizard.editOptions`, `optionsCount`, `searchOption`, `noOptions`
  (el resto del asistente de propiedades es es-only por estado del proyecto; ca/eu/en usan fallback).

El **mapeo de opciones por origen** (opción de origen → opción HubSpot dentro de cada fuente `enum`) recibe el
mismo tratamiento con `SourceOptionsDialog`: cada fuente `enum` muestra «Opciones · N opciones» + «Editar
opciones» que abre un diálogo con scroll propio, búsqueda y pegado masivo de valores de origen (un valor por
línea; el valor HubSpot se mapea con el desplegable del destino si la propiedad destino tiene opciones, o como
texto libre si no). Estado por fuente abierta (`srcOptionsId`). Clave i18n nueva: `properties.wizard.pasteSourceHint`.

**Render diferido (SPEC-0002 §17, 2026-06-22):** ambos diálogos abren **de inmediato** con un `LoadingState`
y difieren el render de la lista (que con 100+ opciones es costoso y bloqueaba la apertura: se percibía
«primero datos, luego modal»). Un flag `ready` (false al abrir → true en el siguiente tick vía `setTimeout 0`)
monta la lista tras pintar el diálogo; además resetea búsqueda/pegado al abrir (sin fuga entre aperturas).

### 25.8 MCP

Sin nuevas tools. `entries_upsert` ya acepta el `entry` completo (schema genérico), por lo que la definición
ampliada fluye sin cambios; `properties_pending_changes` incluye automáticamente los cambios `update_attributes`.
Requiere **rebuild del MCP** para que el binario recoja los tipos nuevos.

### 25.9 Impacto / ficheros

- `shared/types/properties.ts` (campos + enums + `update_attributes`).
- `shared/constants/hubspotPropertyTypes.ts` (nuevo, compartido).
- `connectors/hubspot/properties.ts` (`RemoteProperty`/`RawProperty`/`toRemoteProperty`).
- `property-management/service.ts` (`toDef`), `pending-changes.ts` (`createBody`/`diffDefinition`).
- `features/property-management/components/EntryWizard.tsx` y `features/custom-objects/components/ObjectWizard.tsx`
  (importan las constantes compartidas).
- `locales/{es,ca,eu,en}/common.json` (claves nuevas).

### 25.10 Tests

- `pending-changes.spec.ts`: `createBody` incluye los atributos definidos; `diffDefinition` emite
  `update_attributes` solo ante atributo fijado que difiere y **no** divergencia cuando el atributo local es
  `undefined`.
- Verificación de typecheck/test en la máquina del usuario (el clon al sandbox de los locales no-es venía
  truncado; los originales están sanos —verificado por lectura directa— y `es` valida en verde).

## 26. Hallazgos de la batería MCP de tipologías (BORRADOR, 2026-06-22)

Batería end-to-end vía MCP sobre el proyecto «testing» (informe completo en
`INFORME-pruebas-mcp-tipologias-2026-06-22.md`). Cobertura: todos los `type`/`fieldType` y todas las
casuísticas de §25 (20/21 propiedades creadas en producción; operaciones create/update_label/update_options/
update_field_type/update_attributes/discard; export; orígenes/grupos). El MCP reconstruido **sí** envía los
campos de §25 en los payloads `create`. Hallazgos pendientes de corrección:

- **H1 — `properties_sync` aborta 400 si una entrada referencia un objeto inaccesible** (no aísla el fallo por
  objeto). Capturar el error por objeto y continuar.
- **H2 — `groups_create` solo escribe en el entorno activo** (sin parámetro `environment`); crear propiedad en
  un entorno distinto al activo falla si el grupo es nuevo. Añadir `environment` o garantizar el grupo en el
  entorno destino al aplicar.
- **H3 — `properties_discard_change` devuelve siempre `success: true`** (no valida existencia del id).
- **H4 — `type: bool` exige opciones true/false explícitas**; el editor/MCP debería inyectarlas
  automáticamente para `bool` (hoy fallan los `create` sin opciones).
- **H5 — Propiedad calculada: divergencia falsa recurrente en `calculationFormula`** (HubSpot normaliza la
  fórmula). Excluir `calculationFormula` del diff o normalizar antes de comparar.
- **H6 — `dataSensitivity: sensitive` requiere el scope `sensitive-data-property-create`** en el token; el
  campo se envía bien (no es defecto de código). Documentar y degradar con mensaje claro.

### 26.1 Resolución (IMPLEMENTADO, 2026-06-22)

- **H1 — RESUELTO.** `service.syncHubspot` envuelve `listProperties` por objeto en try/catch: un objeto
  inaccesible se salta (`failedObjects`) y sus entradas quedan **intactas** (no se reconcilian contra remotos
  vacíos, evitando `missing` falsos). Test en `service.spec.ts`.
- **H2 — RESUELTO.** `service.applyChange`, en operaciones `create`, llama a `ensureGroup(api, objectType,
  groupName, environment)`: lista los grupos del **entorno destino** y crea el grupo allí si falta (label =
  name). Así crear una propiedad en producción ya no falla por grupo ausente aunque se creara en otro entorno.
  Test en `service.spec.ts`. (Añadir `environment` explícito a `groups_create`/`groups_list` por MCP queda
  diferido; la garantía al aplicar cubre el caso real.)
- **H3 — RESUELTO.** `service.discardChange` verifica que el `changeId` existe y devuelve
  `{ success:false, error:'Cambio no encontrado' }` si no. Test en `service.spec.ts`.
- **H4 — RESUELTO.** `pending-changes.createBody` inyecta `options:[{true},{false}]` cuando `type==='bool'`
  y no hay opciones (`BOOL_DEFAULT_OPTIONS`). Test en `pending-changes.spec.ts`.
- **H5 — RESUELTO.** `diffDefinition` excluye `calculationFormula` del diff de atributos
  (`DIFF_EXCLUDED_ATTRS`); se sigue enviando en `create`. Elimina la divergencia falsa recurrente. Test en
  `pending-changes.spec.ts`.
- **H6 — DIFERIDO.** No es defecto de código (scope del PAT `sensitive-data-property-create`). El mensaje de
  error real ya se propaga vía `hubspotErrorMessage`. Pendiente: documentar el scope en la configuración del
  conector.
- **Requiere rebuild del MCP** para que el binario en ejecución tome estos fixes. typecheck/test en máquina.

## 27. Adopción del patrón de estados de carga (SPEC-0002 §17) (BORRADOR, 2026-06-22)

Las superficies de propiedades adoptan el patrón de SPEC-0002 §17: `PropertyManagementScreen` pinta
`LoadingState` mientras resuelve entradas/objetos; `EntryWizard` se abre de inmediato con su esqueleto y carga
después (propiedades HubSpot del objeto, grupos), reseteando el estado en cada apertura (ya resetea el formulario
por `open`, falta el `aria-busy`/esqueleto durante la carga de `hubspotPropertiesList`/`groupsList`);
`OriginsModal`, `EntryPanel` y la vista de cambios pendientes muestran su estado de carga accesible. Los diálogos
`OptionsDialog`/`SourceOptionsDialog` (§25.8) son síncronos sobre datos ya cargados, por lo que no requieren
carga asíncrona. Pendiente de implementación junto al resto de superficies.
