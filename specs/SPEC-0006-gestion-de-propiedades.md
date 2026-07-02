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
- **CRM Properties API, versión por fecha `2026-03`** (la más moderna; ver §28). Base `/crm/properties/2026-03/{objectType}`.
  - Lectura: `GET /crm/properties/2026-03/{objectType}` (y `/groups`).
  - Creación/edición: `POST/PATCH /crm/properties/2026-03/{objectType}` (`/{name}` para PATCH).
- Histórico: hasta §28 se usaba `v3` (`/crm/v3/properties/...`). Migrado a `2026-03` (ver §28).

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

## 27. Adopción del patrón de estados de carga (SPEC-0002 §17) (IMPLEMENTADO, 2026-06-22)

Las superficies de propiedades adoptan el patrón de SPEC-0002 §17: `PropertyManagementScreen` pinta
`LoadingState` mientras resuelve entradas/objetos; `EntryWizard` se abre de inmediato con su esqueleto y carga
después (propiedades HubSpot del objeto, grupos), reseteando el estado en cada apertura (ya resetea el formulario
por `open`, falta el `aria-busy`/esqueleto durante la carga de `hubspotPropertiesList`/`groupsList`);
`OriginsModal`, `EntryPanel` y la vista de cambios pendientes muestran su estado de carga accesible. Los diálogos
`OptionsDialog`/`SourceOptionsDialog` (§25.8) son síncronos sobre datos ya cargados, por lo que no requieren
carga asíncrona. Pendiente de implementación junto al resto de superficies.

## 28. Migración a CRM Properties API 2026-03 (IMPLEMENTADO, 2026-06-22)

Por la preferencia de versión (CLAUDE.md: `2026-03` > `v4` > `v3` > `v2` > `v1`) y la auditoría de APIs por SPEC,
Properties era el único recurso que seguía en `v3` pudiendo usar la versión por fecha **`2026-03`** (la doc
oficial recomienda usar siempre la última versión por fecha para integraciones nuevas).

### 28.1 Cambio

`connectors/hubspot/properties.ts` pasa el path base de `/crm/v3/properties/...` a
**`/crm/properties/2026-03/...`** en las cinco llamadas: `listProperties`, `createProperty`, `patchProperty`,
`listGroups`, `createGroup`. El resto (request genérico, normalización, tipos) no cambia: la respuesta y el
cuerpo son los mismos, y los atributos de §25 (`numberDisplayHint`, `textDisplayHint`, `calculationFormula`,
`hasUniqueValue`, `dataSensitivity`, `externalOptions`/`referencedObjectType`, etc.) son **nativos** de
`2026-03` (es donde se verificaron). Verificado contra *Create a property* (2026-03):
`POST https://api.hubapi.com/crm/properties/2026-03/{objectType}`.

### 28.2 Efecto sobre `phone_number`

`2026-03` admite `phone_number` como `type` (a diferencia de la guía legacy). El enum `HsPropertyType` ya es
abierto y lo preserva verbatim, así que la migración **resuelve** la discrepancia anotada en §15/§25.2.

### 28.3 Alcance y notas

- Es un cambio de **conector** (SPEC-0003 expone el `request` genérico; el path lo fija cada feature). Solo se
  toca la feature de propiedades; objetos custom (Schemas, `v3`) y formularios (Marketing Forms `v3` +
  Subscriptions `v4`) **siguen en su versión más moderna disponible** (no hay equivalente `2026-03` para esos
  recursos: schemas no está date-versionado y de Forms solo lo está «Form events and instances», no el CRUD de
  definiciones). El endpoint de verificación del conector ya usaba `account-info/2026-03/details`.
- **Grupos** (`/crm/properties/2026-03/{objectType}/groups`): mismo recurso anidado que en `v3`.

### 28.4 Tests

`properties.spec.ts`: las aserciones de path comprueban `/crm/properties/2026-03/...` en
list/create/patch. Requiere **rebuild del MCP** para que el binario en ejecución use el nuevo path. typecheck/test
en máquina (el clon al sandbox venía truncado; el conector real verificado por lectura).

## 29. Borrado (archivado) de propiedades como cambio pendiente (IMPLEMENTADO, 2026-06-22)

Se expone el **archivado** de la propiedad destino en HubSpot, manteniendo la regla del proyecto «nada se aplica
en HubSpot sin confirmación»: el borrado **no es inmediato**, sino un **cambio pendiente** que se aplica por
entorno (sandbox→producción) como create/update. Es **borrado lógico** (recuperable), no hard-delete.

### 29.1 Modelo y flujo

- `ChangeOperation` gana `'delete'`. `PropertyEntry` gana `pendingDelete?: boolean`.
- `service.requestDelete({ entryId })` marca `pendingDelete = true` (no llama a HubSpot). Tool MCP
  `properties_request_delete` (scope write).
- `reconcileEntries`: si `pendingDelete` y la propiedad **existe** en HubSpot, el único cambio de la entrada es
  un `delete` (`buildDeleteChange`); se regenera en cada `properties_sync` igual que el `create` desde
  `mode:'new'` (sobrevive a la regeneración de `changeId`, §22.2). Si no existe remoto, no genera nada.
- `applyChange` con `operation:'delete'` → `api.deleteProperty(objectType, destName, environment)` →
  `DELETE /crm/properties/2026-03/{objectType}/{name}` (archiva). Aplicado a **producción**, se limpia
  `pendingDelete` para no regenerarlo. Para cancelar antes de aplicar: `properties_discard_change`.
- La entrada **local** del mapa se borra aparte con `entries_delete` (sin tocar HubSpot); archivar la propiedad
  y borrar la entrada local son acciones independientes.

### 29.2 Alcance

- Solo Properties. Grupos: el borrado de grupos sigue **diferido** (§22.3). Schemas/formularios no se borran por
  la app (SPEC-0007/0008).
- Scopes: `crm.schemas.*.write` (ya requeridos para crear/editar).

### 29.3 Tests

- `properties.spec.ts`: `deleteProperty` hace `DELETE /crm/properties/2026-03/{objectType}/{name}`.
- `service.spec.ts`: `requestDelete` + `sync` genera un cambio `delete` cuando el remoto existe; `applyChange`
  llama a `deleteProperty`; `requestDelete` con entryId inexistente → error.
- Requiere **rebuild del MCP** para exponer `properties_request_delete` y el nuevo path. typecheck/test en
  máquina (clon al sandbox truncado; ficheros reales verificados por lectura).

## 30. Adopción de la identidad visual de los documentos de Drive (SPEC-0012) (IMPLEMENTADO, 2026-06-23)

El Sheets del mapa de propiedades adopta SPEC-0012. `buildPropertyMapTabs` (`sheets-model.ts`) pasa a emitir
hojas globales `00_Portada`/`01_Indice`/`02_Origenes` y un **bloque por objeto con entradas**
`<NN>_<Obj>_(Campos|Fuentes|Opciones)` (SPEC-0012 §2.3; la hoja de propiedades se titula `Campos`, no
«Entradas»); `Opciones` se omite si el objeto no tiene fuentes
`enum`. Nombres de hoja saneados al límite de 100 caracteres y colisiones resueltas. `SHEETS_SCHEMA_VERSION`
2 → 3. El estilo (banner de marca, cabeceras `#090017`, notas, validación/formato condicional de `Estado`,
wrap, anchos fijos) lo aporta `buildStyleRequests` (`sheets-style.ts`, SPEC-0012 §3.1). El documento de estado
companion y su round-trip (SPEC-0004 §15.5) no cambian. Tests: `sheets-model.spec.ts` y `sheets-writer.spec.ts`
actualizados (autorizado por SPEC-0012 §6/§11).

---

## 31. Adopción de tooltips i18n en campos rellenables (SPEC-0002 §18) (IMPLEMENTADO, 2026-06-23)

Las superficies con campos rellenables adoptan el patrón de **[SPEC-0002 §18](SPEC-0002-app-shell.md)** (norma en
**[SPEC-0000 §3](SPEC-0000-normas-del-proyecto.md)**): cada campo lleva un `FieldTooltip` con texto i18n,
asociado por `aria-describedby` (en campos repetidos dentro de `.map` se usa `FieldTooltip` directo, sin el hook,
por las reglas de hooks). Cobertura:

- **`EntryWizard`** — nombre, modo HubSpot, selector de propiedad, grupo, origen, objeto/campo de origen, tipología,
  valor verdadero/falso, notas, y «Opciones avanzadas» (§25.7): formato de número (moneda/porcentaje/duración),
  símbolo de moneda, propiedad de moneda, formato de texto, fórmula de cálculo, valor único y sensibilidad. Claves
  `properties.wizard.fieldHelp.*` y `properties.advanced.fieldHelp.*`.
- **`OptionsDialog`** (§25.8) — etiqueta/valor de cada opción (`properties.wizard.fieldHelp.optionLabel/optionValue`).
- **`SourceOptionsDialog`** — valor origen/HubSpot del mapeo (reutiliza `optionValue`/`optionLabel`).
- **`OriginsModal`** — nombre, tipo, descripción y nombre de objeto (`properties.originsModal.fieldHelp.*`).
- **`EntryPanel`** — sin cambios: es de solo lectura (no tiene campos rellenables).

Claves en `es`/`ca`/`eu`/`en`. typecheck/test en máquina.

---

## 32. Hoja de definición completa por objeto (SPEC-0012 §12) (IMPLEMENTADO, 2026-06-24)

### 32.1 Diagnóstico

La hoja `<NN>_<Obj>_Campos` (cabecera `ENTRADAS_HEADER` en `sheets-model.ts`) es una vista de **resumen** con
9 columnas (`ID`, `Objeto`, `Nombre`, `Propiedad HubSpot`, `¿Nueva?`, `Tipo HubSpot`, `Estado`, `Nº orígenes`,
`Cambios pendientes`). De la definición real de la propiedad destino (`HubSpotPropertyDef`, §3 /
`shared/types/properties.ts`) solo refleja `hubspotName` y `type` (y `mode` de forma derivada). Quedan fuera
16 campos de definición y el catálogo de opciones de las propiedades nuevas de enumeración. La hoja
`Opciones` solo guarda el mapeo origen→HubSpot (`SourceEnumOption`), no `HsPropertyOption`.

La recuperación íntegra del estado **no depende del Sheets**: se carga desde el Doc de estado companion (JSON
íntegro, `drive-state.ts`, SPEC-0004 §15.5). Esta enmienda solo mejora la legibilidad/auditoría del Sheets.

### 32.2 Hoja `<NN>_<Obj>_Definicion` (nueva)

Una fila por entrada del objeto. Mapeo columna → campo de `HubSpotPropertyDef`:

| Columna | Campo |
|---------|-------|
| `ID` | `entry.id` |
| `Nombre` | `entry.name` |
| `Propiedad HubSpot` | `hubspotName` |
| `Etiqueta` | `label` |
| `Tipo` | `type` |
| `Field type` | `fieldType` |
| `Grupo` | `groupName` |
| `Descripción` | `description` |
| `Formato número` | `numberDisplayHint` |
| `Símbolo moneda` | `showCurrencySymbol` |
| `Propiedad moneda` | `currencyPropertyName` |
| `Formato texto` | `textDisplayHint` |
| `Fórmula cálculo` | `calculationFormula` |
| `Valor único` | `hasUniqueValue` |
| `Sensibilidad` | `dataSensitivity` |
| `Opciones externas` | `externalOptions` |
| `Objeto referenciado` | `referencedObjectType` |
| `Orden` | `displayOrder` |
| `Oculta` | `hidden` |
| `Campo de formulario` | `formField` |

Para entradas `mode: 'existing'` sin `definition` cacheada, las columnas de definición van vacías (refleja el
estado de sincronización, no es errata — coherente con la norma de no corregir erratas, solo reflejarlas).

### 32.3 Hoja `<NN>_<Obj>_DefOpciones` (nueva, opcional)

Catálogo de opciones de las propiedades **nuevas** (`mode: 'new'`) de tipo `enumeration` con `options`
(`HsPropertyOption`). Se omite si el objeto no tiene ninguna. Columnas: `ID`, `Nombre`, `Propiedad HubSpot`,
`Valor` (`value`), `Etiqueta` (`label`), `Orden` (`displayOrder`), `Oculta` (`hidden`).

### 32.4 Implementación

`buildPropertyMapTabs` emite `Definicion` (siempre que el objeto tenga entradas) y `DefOpciones` (condicional)
en el orden Campos → Definicion → Fuentes → Opciones → DefOpciones, con funciones puras `definicionRow` /
`defOpcionRows`. `SHEETS_SCHEMA_VERSION` 3 → 4. La estructura, migración, estilo y tests se rigen por
**[SPEC-0012 §12](SPEC-0012-identidad-visual-documentos-drive.md)**. No cambia ningún contrato IPC ni tipo
compartido; `HubSpotPropertyDef` ya contiene todos los campos volcados.

### 32.5 Estado

IMPLEMENTADO (2026-06-24). `buildPropertyMapTabs` (`sheets-model.ts`) emite `Definicion` (siempre) y
`DefOpciones` (condicional) por bloque; `definicionRow`/`defOpcionRows` puras; `SHEETS_SCHEMA_VERSION` 3 → 4;
índice ampliado con columnas `Definicion`/`DefOpciones`. Estilo en `sheets-style.ts` (ocultar/congelar
extendido a `_Definicion`). Verificación (sandbox): `sheets-model.spec.ts` 11/11 (incluye Definicion y
DefOpciones), `sheets-writer.spec.ts` 1/1. typecheck/suite completa + PR en la máquina del usuario.

---

## 33. Borrado de grupos de propiedades (BORRADOR, 2026-06-24)

Retira el diferido de §22.3. **No implementar hasta validación**: es una escritura **destructiva en
producción** de HubSpot.

### 33.1 Motivación y riesgo

§22.3 dejó el borrado de grupos fuera por ser destructivo y no estar expuesto en la UI. Se especifica aquí
para poder retomarlo de forma controlada. Riesgos: el borrado de un grupo es **permanente** (no hay archivado
como en propiedades). Según la Property Groups API, un grupo **con propiedades** no puede borrarse sin más; hay
que vaciarlo antes (mover/archivar sus propiedades). El alcance debe confirmarse contra la API real.

### 33.2 API

Versión más alta disponible para grupos (prioridad CLAUDE.md): `DELETE
/crm/properties/2026-03/{objectType}/groups/{groupName}` (o `v3` si `2026-03` no expone grupos). A confirmar:
comportamiento con grupo no vacío (¿409/400?), y si existe operación de archivado.

### 33.3 Modelo — cambio pendiente destructivo

A diferencia de las propiedades (cambios por entrada, §29), los grupos no son entradas. Se modela como un
**cambio pendiente propio de grupo**, nunca automático:

- Nuevo tipo de cambio de grupo (`group_delete`) con `objectType` + `groupName`, materializado solo por acción
  explícita del usuario y aplicado por entorno (sandbox primero, luego producción), reutilizando el flujo de
  aplicar/descartar de §23/§29.
- Precondición: el grupo debe estar **vacío** (sin propiedades activas mapeadas ni en HubSpot); si no, se
  bloquea con aviso y se ofrece mover/archivar primero.

### 33.4 UI

Acción «Eliminar grupo» en la gestión de grupos, con `ConfirmDialog` (SPEC-0002 §11) de **doble
confirmación**, texto explícito de que es permanente y afecta a producción, y selección de entorno. Oculta o
deshabilitada si el grupo no está vacío.

### 33.5 MCP

Tool `properties_groups_request_delete` (crea el cambio pendiente, no borra directo), simétrica con
`properties_request_delete` (§29). Requiere rebuild MCP. No expone borrado inmediato.

### 33.6 Seguridad

Destructivo y permanente: por defecto inactivo, sandbox-first, doble confirmación, precondición de grupo
vacío, y nunca como efecto secundario de otra acción. Alinear con SPEC-0005 §11 (CRUD del MCP) y §22.3.

### 33.7 Estado

**IMPLEMENTADO (2026-06-24), incluida la UI.**

Validado el spec. Implementado en main + MCP + tests:

- **Conector** `connectors/hubspot/properties.ts`: `deleteGroup(objectType, groupName, environment)` →
  `DELETE /crm/properties/2026-03/{objectType}/groups/{groupName}` (confirmado contra la doc de HubSpot, mismo
  patrón que `listGroups`/`createGroup`).
- **Tipos** `shared/types/properties.ts`: `GroupDeleteChange` + inputs (`GroupDeleteRequestInput`,
  `GroupChangesListInput`, `GroupApplyChangeInput`, `GroupDiscardChangeInput`).
- **Store** `store.ts`: `PropertyState.groupChanges`. **Limitación**: se persiste en electron-store (local), no
  en el documento de estado companion de Drive (no se bumpea su esquema); los borrados pendientes de grupo no
  son portables hasta una iteración posterior.
- **Servicio** `service.ts`: `requestGroupDelete` (dedup), `listGroupChanges`, `applyGroupChange` (precondición
  **grupo vacío** comprobada con `listProperties` del entorno destino; sandbox marca flag, producción retira el
  cambio), `discardGroupChange`.
- **MCP** `mcp-tools.ts`: `properties_groups_request_delete`, `properties_group_pending_changes`,
  `properties_groups_apply_change`, `properties_groups_discard_change` (DESTRUCTIVO, requiere rebuild MCP).
- **Tests** `service.spec.ts`: request/dedup, rechazo por grupo no vacío, aplicar en producción (borra+retira),
  sandbox (marca flag), discard. No ejecutables en el sandbox por truncación del espejo (originales sanos);
  verificación en la máquina.

**Confirmación API (Chrome, cuenta Cloud District)**: el endpoint de grupos sigue el patrón estándar ya usado;
el diseño exige **grupo vacío** antes de borrar, así que el comportamiento de la API con grupos no vacíos no
afecta a la seguridad.

- **IPC + preload** (`ipc.ts`, `main/index.ts`, `preload/index.ts`): canales `groups:request-delete`,
  `groups:changes`, `groups:apply-change`, `groups:discard-change` + métodos en `RevOpsApi`.
- **UI** (decisión 2026-06-24: **sección «Grupos» en Propiedades**): botón «Grupos» en la barra de
  `PropertyManagementScreen` abre `GroupsModal` (nuevo) con: lista de grupos del objeto activo, acción
  «Eliminar» con **doble confirmación** (`useConfirm` ×2, tono `danger`), deshabilitada si el grupo tiene
  propiedades (chip «Con propiedades») o ya tiene borrado pendiente; y panel de **borrados pendientes** con
  Aplicar (sandbox/producción) y Descartar. Feedback por Snackbar; `LoadingState` al cargar.
- **i18n** `properties.manageGroups` + `properties.groupsModal.*` en `es`/`ca`/`eu`/`en` (JSON validado).

El borrado es operable por UI y por MCP. typecheck/suite/e2e + rebuild MCP en la máquina del usuario.

---

## 34. Descripción de la propiedad en el UI (IMPLEMENTADO, 2026-06-24)

### 34.1 Diagnóstico

`HubSpotPropertyDef.description` ya existe en el modelo (§25.3), se edita en `EntryWizard` y se vuelca a la
hoja `<NN>_<Obj>_Definicion` del Sheets (§32). Lagunas detectadas en el UI:

- El campo de edición vive dentro del acordeón colapsado «Opciones avanzadas» (§25.7), poco visible.
- `EntryPanel` (panel lateral de solo lectura) **no muestra** la descripción.

Fuera de alcance de esta enmienda: la fila de lista de `PropertyManagementScreen` (no se añade descripción
ahí, decisión del usuario 2026-06-24).

### 34.2 Editor — mover la descripción al núcleo del wizard

- El `TextField` de descripción (hoy en el `Accordion` de «Opciones avanzadas», `EntryWizard.tsx` :331-338)
  se traslada al **bloque principal** de `definitionEditor`, siempre visible, tras `label`/`type`/`fieldType`
  y antes de las opciones de enumeración. Multilínea (`minRows={2}`), mantiene el `FieldTooltip`
  (`properties.advanced.fieldHelp.description`) y la clave de etiqueta `properties.advanced.description`.
- Se aplica tanto a `mode: 'new'` como a `mode: 'existing'` (`definitionEditor` ya se renderiza en ambos).
- `hasAdvancedContent` deja de considerar `description` para decidir la apertura automática del acordeón
  (la descripción ya no vive ahí). El resto de campos avanzados no cambian.
- No se crean claves i18n nuevas (se reutilizan las existentes).

### 34.3 Vista de solo lectura — `EntryPanel`

- `EntryPanel` añade un bloque de **descripción** bajo «Propiedad destino» (tras `destName`), antes del
  `Divider` que precede a «Fuentes». Render condicional: solo si la definición destino tiene `description`.
- Lectura del valor: `entry.hubspotProperty.definition?.description` (en `mode: 'existing'` la definición
  puede no estar cacheada → no se muestra nada, coherente con §32.2; no es errata, refleja el estado de
  sincronización). Texto con `whiteSpace: 'pre-wrap'`.
- Etiqueta con clave i18n `properties.panel.description`. **Ya existía** en los 7 locales
  (`es`/`ca`/`eu`/`en`/`gl`/`pt`/`fr`); no se crea ninguna clave nueva.

### 34.4 Sheets

Sin cambios estructurales: la descripción ya se vuelca en la hoja `<NN>_<Obj>_Definicion` (§32, columna
`Descripción`). No se duplica en la hoja de resumen `Campos`. `SHEETS_SCHEMA_VERSION` no se toca.

### 34.5 MCP

Sin cambios: `entries_upsert` ya transporta la definición completa con `description`; las tools de lectura ya
la exponen. No requiere rebuild.

### 34.6 Impacto / ficheros

- `renderer/features/property-management/components/EntryWizard.tsx` (mover el campo; ajustar
  `hasAdvancedContent`).
- `renderer/features/property-management/components/EntryPanel.tsx` (bloque de descripción de solo lectura).
- i18n: sin cambios (la clave `properties.panel.description` ya existía en los 7 locales).

### 34.7 Tests

- `EntryPanel.spec.tsx` (nuevo): con definición que tiene `description` se renderiza el bloque (etiqueta +
  texto); sin `description` no aparece.
- typecheck/test:unit + e2e en la máquina del usuario.

### 34.8 Estado

IMPLEMENTADO (2026-06-24). `EntryWizard.tsx` (campo descripción movido al núcleo de `definitionEditor`,
`hasAdvancedContent` ya no mira `description`); `EntryPanel.tsx` (bloque de descripción de solo lectura);
`EntryPanel.spec.tsx` (2 casos). i18n sin cambios. La suite del renderer **no es ejecutable en el sandbox**
por el truncado del espejo del clonado (`src/renderer/i18n/index.ts` queda cortado a mitad de línea; original
sano, 50 líneas) — typecheck/test:unit/e2e en la máquina del usuario.

---

## 35. Diagnóstico de entradas en `falta` y acción «Convertir a Nueva» (BORRADOR, 2026-06-25)

### 35.1 Diagnóstico

La reconciliación (`reconcile.ts`) clasifica como `missing` dos casos que **no son equivalentes**:

1. **`missing` con remedio** — entrada en modo `new` sin remoto en HubSpot: genera un cambio pendiente `create`
   (`reconcile.ts` :52-59). Aparece en *Cambios pendientes*, se aplica y se crea la propiedad. Flujo normal.
2. **`missing` sin remedio (bloqueo)** — entrada en modo `existing` que apunta a una propiedad **inexistente** en
   HubSpot (`reconcile.ts` :71-73): estado `missing`/`falta` pero `pendingChanges: []`. **No genera ningún cambio**,
   por eso *Cambios pendientes (0)* y no hay nada que sincronizar. Es un callejón sin salida: la entrada asume que la
   propiedad ya existe, pero no existe.

El caso 2 es invisible en el resumen actual `{ updated, divergent, missing }`: el usuario (y un consumidor LLM) ve
`N sin crear` sin saber que esas N no se crearán nunca por sí solas. **Esta casuística debe destaparse
explícitamente** y ofrecer remedio. Detectado en el portal con 30 entradas en `falta` y `Cambios pendientes (0)`.

Esta sección complementa el gate de guía del MCP (**[SPEC-0005 §15](SPEC-0005-capa-mcp-api.md)**): §35.6 aporta el
contenido de guía que explica la casuística; aquí se añaden el diagnóstico en la salida y la acción de remedio.

### 35.2 Clasificación en la reconciliación

`reconcileEntries` distingue el subtipo de `missing` y reporta los bloqueos sin cambiar el `hubspotStatus` (sigue
siendo `missing` para no romper la UI ni los tests existentes de estado):

- `ReconcileResult.summary` añade `blocked: number` (cuenta del caso 2). `missing` sigue contando el total de
  faltantes (casos 1 + 2) para no alterar el `syncSummary` actual; `blocked` es un subconjunto informativo.
- `ReconcileResult` añade `blockers: Blocker[]`:

  ```ts
  export interface Blocker {
    entryId: string;
    entry: string;        // nombre legible de la entrada
    objectType: string;
    hubspotName: string;  // propiedad destino inexistente
    reason: 'existing-missing-remote';
    remediation: 'convert-to-new';
  }
  ```

- El caso 2 se detecta en la rama `ref.mode === 'existing' && !remote` (`reconcile.ts` :71-73): se añade a `blockers`
  y se incrementa `summary.blocked`.

### 35.3 Propagación a `syncHubspot` y al MCP

- `PropertiesSyncResult` (tipo de retorno de `service.syncHubspot`) pasa de devolver solo `summary` a
  `{ ...summary, blocked, blockers }`. `properties_sync` (MCP) y el IPC de sync devuelven esa estructura ampliada.
  Así la salida de `properties_sync` **levanta la liebre**: incluye la lista de entradas que están en `falta` y no se
  van a crear, con el remedio.
- `properties_pending_changes` (MCP, `mcp-tools.ts` :56-74) añade, junto a los cambios, un campo `blockers` con la
  misma lista (recalculada del estado), para que un consumidor que solo mire los pendientes también vea el bloqueo.

### 35.4 Acción «Convertir a Nueva»

Convierte una entrada de modo `existing` (que apunta a algo inexistente) a modo `new`, de modo que la siguiente
sincronización genere el cambio `create`.

- Servicio `convertEntryToNew({ projectId, entryId })`:
  - Solo aplica a entradas en modo `existing`. Si ya es `new`, no-op idempotente.
  - Construye `hubspotProperty = { mode:'new', definition }` reutilizando la `definition` cacheada si existe
    (§25.3/§32); si no hay definición, **siembra** una mínima válida: `hubspotName` = el `hubspotName` actual de la
    referencia `existing`, `label` = nombre de la entrada, `type`/`fieldType` por defecto `string`/`text`, `groupName`
    = el grupo existente si lo hubiera. La definición sembrada es un punto de partida; el usuario la completa en el
    wizard antes de aplicar.
  - Devuelve `{ success, seeded: boolean }` (`seeded:true` si no había definición cacheada → avisar al usuario de que
    revise la definición antes de aplicar).
- Servicio masivo `convertMissingToNew({ projectId, objectType? })`: aplica `convertEntryToNew` a todas las entradas
  actualmente en estado `missing` y modo `existing` (opcionalmente filtradas por objeto). Devuelve
  `{ converted: number, seeded: number }`.
- Tras convertir, **no** se sincroniza automáticamente: la UI invita a sincronizar para materializar los `create`
  (coherente con §22.2: los cambios pendientes los genera `properties_sync`).

### 35.5 MCP

Dos tools nuevas (escritura), **con `requiresGuidance: true`** (SPEC-0005 §15.5):

- `properties_convert_to_new` — `{ entryId }` requerido. Convierte una entrada.
- `properties_convert_missing_to_new` — `{ objectType? }` opcional. Convierte en bloque.

`description` de ambas: deben explicar que solo afectan a entradas en modo `existing` sin remoto y que la creación
real requiere `properties_sync` + `properties_apply_change`. **Requiere rebuild del MCP.**

### 35.6 Contenido de guía (registro de SPEC-0005 §15.4)

`registerPropertyTools` (o el wiring del feature) registra una `GuidanceSection` `{ featureKey:'property-management',
order:10, title:'Propiedades: estados y sincronización' }` con cuerpo (texto literal, castellano) que cubre:

- Distinción `existing` (mapea a propiedad que ya existe) vs `new` (crea la propiedad).
- Casuística del bloqueo: `existing` + propiedad inexistente → estado `falta` **sin** cambio pendiente; **no se crea
  sola**. Hay que avisar al usuario y usar «Convertir a Nueva».
- Cómo leer `properties_sync`: `blocked > 0` y `blockers[]` señalan entradas que **no** se sincronizarán; el flujo
  correcto es `properties_convert_*` → `properties_sync` → `properties_apply_change` (por entorno).
- Que `Cambios pendientes (0)` con `missing > 0` **no** significa «todo en orden».

### 35.7 Interfaz de usuario

- **Aviso de bloqueo** en `PropertyManagementScreen`: cuando `blocked > 0`, banner `Alert severity="warning"` sobre la
  lista: «N propiedades referencian campos que no existen en HubSpot y no se crearán automáticamente.» con botón
  **«Convertir todas a Nueva (N)»** (acotado al objeto activo del selector). El botón abre `ConfirmDialog`
  (SPEC-0002 §11) antes de la conversión masiva; tras convertir, `Snackbar` (SPEC-0002 §10) con resultado e
  invitación a sincronizar.
- **Acción por entrada**: en `EntryPanel` (panel lateral) y/o en la fila, para entradas en `falta` + modo `existing`,
  botón **«Convertir a Nueva»** (`startIcon`, SPEC-0002 §19). Si la conversión fue `seeded`, el `Snackbar` advierte de
  revisar la definición.
- **Badge**: `StatusBadge` para estas entradas mantiene `falta` pero expone un `title`/tooltip («No existe en HubSpot;
  conviértela a Nueva para crearla»). No se crea un estado nuevo.
- i18n: claves nuevas en los **7 locales** (`es` canónico, `ca`/`eu`/`en`/`gl`/`pt`/`fr`): `properties.blocked.banner`,
  `properties.blocked.convertAll`, `properties.actions.convertToNew`, `properties.convert.confirmTitle`,
  `properties.convert.confirmBody`, `properties.convert.done`, `properties.convert.seededWarning`,
  `properties.status.missingTooltip`.

### 35.8 Tests

- `reconcile.spec.ts`: entrada `existing` sin remoto → `summary.blocked === 1`, `blockers[0].reason ===
  'existing-missing-remote'`; entrada `new` sin remoto → `blocked === 0` y genera `create` (regresión).
- `service.spec.ts`: `convertEntryToNew` con definición cacheada (no `seeded`) y sin ella (`seeded:true`, definición
  mínima válida); idempotencia sobre entrada ya `new`; `convertMissingToNew` cuenta `converted`/`seeded` y respeta el
  filtro por `objectType`; tras convertir + sync se genera el `create`.
- `mcp-tools` / `registry.spec.ts`: ambas tools registradas con `requiresGuidance:true` y `WRITE_SCOPES`; sección de
  guía registrada.
- e2e: banner de bloqueo visible con datos mock; «Convertir todas a Nueva» reduce el bloqueo y, tras sync, aparecen
  cambios `create`.
- typecheck/test:unit/e2e en la máquina del usuario.

### 35.9 Impacto / ficheros

- `src/main/property-management/reconcile.ts` (clasificación + `blockers`) y `reconcile.spec.ts`.
- `src/main/property-management/service.ts` (`convertEntryToNew`, `convertMissingToNew`; `syncHubspot` devuelve
  `blockers`) y `service.spec.ts`.
- `src/shared/types/properties.ts` (`Blocker`, ampliación de `PropertiesSyncResult`, `ReconcileResult.summary.blocked`).
- `src/main/property-management/mcp-tools.ts` (2 tools nuevas con `requiresGuidance`; `blockers` en
  `properties_pending_changes`; registro de la `GuidanceSection`).
- IPC + preload (`properties:convert-to-new`, `properties:convert-missing-to-new`).
- `renderer/features/property-management/components/` (`PropertyManagementScreen` banner, `EntryPanel`/fila acción,
  `StatusBadge` tooltip).
- i18n: claves nuevas §35.7 en los 7 locales.
- **Requiere rebuild del MCP.**

### 35.10 Estado

IMPLEMENTADO (2026-06-25). Tipos `Blocker`/`ConvertEntry*`/`ConvertMissing*` y `PropertiesSyncResult` ampliado
(`blocked`, `blockers`); `reconcile.ts` (clasificación + `blockers`, `summary.blocked`) y `reconcile.spec.ts`
(blocker + regresión new); `service.ts` (`convertEntryToNew`, `convertMissingToNew`, `syncHubspot` devuelve
`blockers`) y `service.spec.ts` (5 casos: blockers, seeded/no-seeded, idempotencia, bulk con filtro); `mcp-tools.ts`
(2 tools convert con `requiresGuidance`, `blockers` en `properties_pending_changes`, sección de guía registrada,
`requiresGuidance` en tools de escritura); IPC/preload `properties:convert-to-new` / `properties:convert-missing-to-new`;
UI: banner de bloqueo en `PropertyManagementScreen` + «Convertir todas a Nueva», botón «Convertir a Nueva» en
`EntryPanel`, tooltip en `StatusBadge`, acciones en `entries-store`; i18n en los 7 locales (`status.missingTooltip`,
`actions.convertToNew`, `blocked.*`, `convert.*`). Adopta el gate de **[SPEC-0005 §15](SPEC-0005-capa-mcp-api.md)**.
**Requiere rebuild del MCP.** typecheck/test:unit/e2e en la máquina del usuario — el espejo del sandbox no sincroniza
los ficheros editados (trunca); originales verificados sanos vía lectura directa.

---

## 36. Divergencia perpetua en enumeraciones — `hidden` no normalizado (BORRADOR, 2026-06-25)

### 36.1 Diagnóstico

Síntoma: propiedades `enumeration` con definición cacheada y muchas opciones (catálogos: «País de Nacimiento»,
«Compañía») aparecen **siempre** como `diverge`, con un cambio `update_options` que no desaparece al aplicarse.

Causa raíz (confirmada vía MCP en producción, `properties_pending_changes`):

- `optionsEqual` (`pending-changes.ts`) compara `match.hidden === option.hidden`.
- Las opciones **remotas** se normalizan con `hidden: false` (`connectors/hubspot/properties.ts` `normalizeOptions`).
- Las opciones de la definición **local** de esos catálogos llegan **sin** `hidden` (`undefined`) porque provienen de
  import/CSV/Sheets, no del selector del wizard (que usa `toDef`/`normalizeOptions`, ya con `hidden:false`).
- `false === undefined` → las opciones nunca se consideran iguales → `update_options` perpetuo. Al aplicarlo, el payload
  va **sin** `hidden`; HubSpot guarda `hidden:false`; la siguiente sync vuelve a divergir → bucle infinito.

Esto explica que solo afecte a los desplegables grandes (definición importada) y no a los enums pequeños mapeados
desde el wizard. `displayOrder` no interviene (`optionsEqual` ya lo ignora).

### 36.2 Corrección

- `optionsEqual`: comparar `(a.hidden ?? false) === (b.hidden ?? false)` (normalizar ambos lados). Comparar también
  el conjunto en ambos sentidos para no pasar por alto que el remoto tenga opciones que el local no (igualdad de
  conjuntos por `value`, además de la longitud).
- `cleanOptions`: normalizar cada opción a forma canónica `{ label, value, displayOrder: i, hidden: hidden ?? false }`,
  para que las opciones almacenadas y el payload de `create`/`update_options` lleven siempre `hidden` y no
  reintroduzcan la divergencia.
- Sin cambio de contrato ni de superficie MCP; afecta solo a la comparación y al saneo.

### 36.3 Tests

- `pending-changes.spec.ts`: `optionsEqual` con opciones idénticas salvo `hidden` `undefined` vs `false` → iguales;
  `diffDefinition` de una `enumeration` cuya def carece de `hidden` frente a remota con `hidden:false` → **sin**
  `update_options`; `cleanOptions` rellena `hidden:false` cuando falta.

### 36.4 Impacto / ficheros

- `src/main/property-management/pending-changes.ts` (`optionsEqual`, `cleanOptions`) + `pending-changes.spec.ts`.
- Requiere **rebuild de la app/MCP** para que el binario en uso recoja el cambio (la lógica la comparte el servicio
  con las tools MCP). No cambia la lista de tools.

### 36.5 Estado

IMPLEMENTADO (2026-06-25). `pending-changes.ts`: `optionsEqual` normaliza `(hidden ?? false)` en ambos lados;
`cleanOptions` rellena `hidden: hidden ?? false`. `pending-changes.spec.ts`: 2 casos nuevos (cleanOptions normaliza
hidden; `diffDefinition` no emite `update_options` con def sin hidden vs remoto `hidden:false`). Requiere rebuild de
la app/MCP para que el binario en uso recoja el cambio. test:unit/typecheck en la máquina del usuario — el espejo del
sandbox trunca los ficheros editados; originales verificados sanos vía lectura directa.

---

## 37. El estado (exists/missing/divergent) se reconcilia siempre contra Producción (BORRADOR, 2026-06-25)

### 37.1 Diagnóstico

El estado de cada entrada (`exists`/`missing`/`divergent`), que se muestra en la lista, en el panel y en la columna
«Estado» del Sheets, lo calcula `syncHubspot` (`service.ts`) reconciliando contra las propiedades remotas obtenidas con
`api.listProperties(objectType)` **sin entorno** → usa el **entorno activo** (sandbox o production según el conector).

Requisito: el «existe o no» debe reflejar **siempre Producción**, con independencia del entorno activo. La existencia de
una propiedad es una verdad de negocio que se evalúa contra producción; el entorno activo solo gobierna a qué entorno se
**aplican** los cambios (`properties_apply_change`, sin cambios).

### 37.2 Corrección

- `syncHubspot`: obtener las remotas con `api.listProperties(objectType, 'production')` (forzar producción). El resto de
  la reconciliación no cambia. `listProperties` ya acepta el parámetro de entorno.
- `applyChange`/`applyGroupChange` mantienen el entorno explícito elegido por el usuario (sandbox/production): el estado se
  lee de producción, pero los cambios se aplican donde el usuario decida.
- Si el token de producción no está configurado o un objeto no es accesible en producción, el objeto se salta (mecanismo
  `failedObjects` existente) y sus entradas quedan intactas, sin abortar el sync.

Fuera de alcance: el selector de propiedades existentes del wizard (`listHubSpotProperties`) y el catálogo de objetos
(`listObjects`) siguen usando el entorno activo; solo se fuerza producción en el cálculo del estado.

### 37.3 Tests

- `service.spec.ts`: `syncHubspot` invoca `listProperties` con `'production'` (aunque el conector mock no distinga
  entorno, se verifica el argumento).

### 37.4 Impacto / ficheros

- `src/main/property-management/service.ts` (`syncHubspot`) + `service.spec.ts`.
- Requiere **rebuild de la app/MCP**.

### 37.5 Estado

IMPLEMENTADO (2026-06-25). `service.ts` `syncHubspot`: `api.listProperties(objectType, 'production')`. `service.spec.ts`:
caso §37 que verifica el argumento `'production'`. Requiere **rebuild de la app/MCP**. test:unit/typecheck en la máquina
del usuario — el espejo del sandbox trunca los ficheros editados; originales verificados sanos.

---

## 38. `create` ya existente en el entorno → reconciliar y aplicar update (BORRADOR, 2026-06-25)

### 38.1 Diagnóstico

Consecuencia de §37: el estado se reconcilia contra **Producción**, así que una propiedad ausente en producción genera un
cambio `create` aunque ya exista en **sandbox**. Al pulsar «Aplicar en Sandbox», HubSpot responde `A property named
'<x>' already exists.` y la operación falla. Síntoma del usuario: «dice que en sandbox no existe cuando sí existe».

### 38.2 Corrección

- `applyChange`, operación `create`: si `createProperty` falla porque la propiedad **ya existe en el entorno destino**
  (no se propaga el error), se **reconcilia contra la propiedad existente en ESE entorno** y se aplica el `update`
  equivalente:
  - se obtiene la remota del entorno destino (`listProperties(objectType, environment)`), se busca por `hubspotName`;
  - se calcula el diff con `diffDefinition(def, remote)` (la `def` es la definición de la entrada) y se aplica cada
    `patch` resultante (`patchProperty`) en ese entorno;
  - si no hay diferencias, es un no-op (la propiedad ya coincide).
  - en cualquiera de los casos el cambio se marca aplicado en ese entorno.
- Detección `isAlreadyExists(error)`: `response.status === 409`, o `response.data.category === 'OBJECT_ALREADY_EXISTS'`,
  o el mensaje contiene `already exists` (case-insensitive).
- El diff es **inherentemente por entorno** (se compara contra la propiedad real de ese entorno); por eso se resuelve en
  el momento de aplicar, no como cambio pendiente global. Aplicar en producción sigue creando de verdad donde falta.
- No cambia el comportamiento de `update_*`/`delete` ya existentes.

### 38.3 Tests

- `service.spec.ts`: `create` cuya `createProperty` rechaza con `409 OBJECT_ALREADY_EXISTS` y cuya remota en sandbox
  tiene la etiqueta distinta → se llama a `patchProperty('contacts','x',{label:'X'},'sandbox')` y el cambio queda
  `appliedToSandbox:true`.

### 38.4 Impacto / ficheros

- `src/main/property-management/service.ts` (`applyChange` + helper `isAlreadyExists` + reconciliación con
  `diffDefinition`) + `service.spec.ts`.
- Requiere **rebuild de la app/MCP**.

### 38.5 Estado

IMPLEMENTADO (2026-06-25). `applyChange` absorbe «ya existe» y reconcilia contra la propiedad del entorno destino
aplicando el `update` equivalente (`diffDefinition` + `patchProperty`); no-op si coincide. `service.spec.ts`: caso §38
(verifica el `patchProperty`). Requiere rebuild. test:unit/typecheck en la máquina del usuario — el espejo del sandbox
trunca los ficheros editados; originales verificados sanos.

---

## 39. Endurecimiento de `entries_upsert` y definición real de propiedades vía MCP (BORRADOR, 2026-06-25)

Origen: informe `2026-06-25-revopshelper-bugs.md` (HC Marbella). Un payload malformado en `entries_upsert`
(`hubspotProperty` como string, `sources` como strings/`originIds`) se persistía sin validar y reventaba aguas abajo:
`Cannot read properties of undefined (reading 'hubspotName')` en `reconcile` y en `PropertyManagementScreen`.

### 39.1 Validación del `entry` (raíz)

`service.upsertEntry` valida la forma antes de persistir (`assertValidEntryInput`), con error accionable:

- `objectType` y `name`: string no vacío.
- `hubspotProperty`: objeto (nunca string) con `mode` `'existing'` (requiere `hubspotName`) o `'new'` (requiere
  `definition` con `hubspotName`/`label`/`type`/`fieldType`; `groupName` opcional, string si está).
- `sources`: array de `EntrySource` (objetos) con `originId`/`sourceField`/`definition.kind`; nunca strings ni `originIds`.

### 39.2 `inputSchema` enriquecido

`entries_upsert` documenta el discriminated union `HubSpotPropertyRef` (`oneOf` por `mode`) y `EntrySource` con
`required`, para que el cliente MCP conozca la forma. La `description` lo recuerda explícitamente.

### 39.3 Defensa aguas abajo

`destName` se hace defensivo en `reconcile.ts`, `PropertyManagementScreen.tsx` y `EntryPanel.tsx` (lee `mode`/
`definition` con `?.` y devuelve `''` ante datos malformados), de modo que un dato heredado inválido no tumbe el sync ni
el render (complementa la validación, que evita nuevos datos malos).

### 39.4 Tool de lectura `hubspot_properties_list`

Nueva tool de solo lectura (scopes `*.read`, **sin** `requiresGuidance`) que expone `service.listHubSpotProperties`:
devuelve `HubSpotPropertyDef` completo (`type`, `fieldType`, `groupName`, `options`, atributos) del **entorno activo**.
Input `{ objectType, name? }`. Resuelve la inferencia de `fieldType` que causaba divergencias (`phonenumber`,
`checkbox`): el cliente toma el `fieldType`/`groupName`/`options` reales en vez de inferirlos desde `type`.

### 39.5 Guía MCP

`revops_guidance` (sección `property-management`) añade la «Forma del entry» (objeto, no string; `sources` objetos) y la
instrucción de consultar `hubspot_properties_list` antes de crear, para no inferir `fieldType`.

### 39.6 Tests

- `service.spec.ts`: `upsertEntry` lanza con `hubspotProperty` string y con `sources` de strings.
- (UI) `destName` defensivo cubierto por no-crash; e2e en máquina.

### 39.7 Impacto / ficheros

- `service.ts` (`assertValidEntryInput`, `entryDestName` defensivo) + `service.spec.ts`.
- `reconcile.ts`, `PropertyManagementScreen.tsx`, `EntryPanel.tsx` (`destName` defensivo).
- `mcp-tools.ts` (schema de `entries_upsert`, tool `hubspot_properties_list`, guía).
- Requiere **rebuild de la app/MCP**.

### 39.8 Estado

IMPLEMENTADO (2026-06-25). Validación + schema + tool de lectura + guía + destName defensivo. ErrorBoundary de ruta en
**[SPEC-0002 §20](SPEC-0002-app-shell.md)**. test:unit/typecheck/e2e en la máquina del usuario — el espejo del sandbox
trunca los ficheros editados; originales verificados sanos.

### 39.9 Pulido de mensajes de error (IMPLEMENTADO, 2026-06-25)

Iteración sobre §39.1/§39.2 para mensajes accionables (informe punto 6):

- **Errores estructurados + acumulativos**: nuevo `entry-validation.ts` con `validateEntryInput(entry)` que devuelve
  **todas** las `ValidationIssue` (no solo la primera), cada una con `code`, `field`, `message` y `example` de la forma
  correcta; y `EntryValidationError` (`code:'ENTRY_VALIDATION'`, `issues[]`). `service.upsertEntry` lanza
  `EntryValidationError`. `entry-validation.spec.ts` (4 casos, en verde en sandbox).
- **Respuesta MCP estructurada**: el handler de `entries_upsert` captura `EntryValidationError` y devuelve
  `{ error: { code, message, issues } }` en lugar de una excepción opaca, para que el LLM corrija el payload.
- **Mapeo de errores de la API de HubSpot**: `hubspotErrorMessage` traduce `401` (token caducado/ inválido), `403`
  (faltan scopes), `429` (rate limit), `409`/`OBJECT_ALREADY_EXISTS` (ya existe) y `400` (datos inválidos) a mensajes
  accionables conservando el detalle del body. Fluye a la UI por el `Snackbar` de apply ya existente.
- **i18n en la UI**: clave `errors.entryValidation` en los 7 locales; `PropertyManagementScreen.onSubmit` captura el
  fallo de `upsert` y lo muestra localizado (con el detalle técnico como `{{detail}}`).

Ficheros: `entry-validation.ts` (+spec), `service.ts` (`upsertEntry`, `hubspotErrorMessage`), `mcp-tools.ts`
(`entries_upsert`), `PropertyManagementScreen.tsx`, `locales/*/common.json` (`errors.entryValidation`). Requiere rebuild
de la app/MCP.

---

## 40. Documentación del mapeo de valores (`valueMap`) en la guía (IMPLEMENTADO, 2026-06-30)

Del informe de remapeo de erratas (Pipedrive→HubSpot): el mapeo valor-origen → opción corregida no estaba documentado en
`revops_guidance`, lo que obligó a descubrirlo por prueba y error.

Aclaración de errata (no se renombra el campo): el informe lo llama `valueMap`; el campo real del helper es
`EntrySource.definition.options[]` con `{ sourceValue, sourceLabel?, hubspotValue? }` (kind `enum`) y
`EntrySource.definition.boolean { truthy, falsy }` (kind `boolean`). Vive en `sources[].definition`, no en la propiedad.

`PROPERTY_GUIDANCE` (en `mcp-tools.ts`) se amplía documentando: el bloque `sources[].definition` con `options`
(remapeo `sourceValue`→`hubspotValue`, ejemplo `Spain`→`España`) y `boolean`; y las reglas del nombre interno
(minúsculas/números/`_`, máx. 100, no truncar). Sin cambios de contrato. Requiere rebuild del MCP.

---

## 41. Consistencia e idempotencia de cambios pendientes al editar (IMPLEMENTADO, 2026-06-30)

Del informe (puntos 2 y 3): al cambiar el `hubspotName`/definición de una entrada, la creación anterior quedaba como
cambio huérfano y `properties_pending_changes` (que lee el snapshot del estado, recalculado solo en `syncHubspot`)
seguía mostrándola, con riesgo de crear propiedades duplicadas al aplicar.

Fix en `service.upsertEntry`: si el `hubspotProperty` entrante difiere del de la entrada existente (comparación
estructural), se resetean `pendingChanges = []`, `hubspotStatus` a su valor por modo (`exists`/`missing`) y
`pendingDelete = undefined`, de modo que la siguiente `syncHubspot` los regenere limpios (idempotente, sin huérfanos).
Editar solo `name`/`sources` preserva los cambios. Test `§41` en `service.spec.ts`. Sin tool nueva.

---

## 42. Operaciones en batch (IMPLEMENTADO, 2026-06-30)

Del informe (punto 5): `entries_upsert`/`entries_delete`/`properties_discard_change` operaban de una en una; para ~150
entradas suponía cientos de llamadas, agravado por el gate de guía entre lotes.

Tres tools MCP nuevas que reutilizan los servicios existentes y devuelven un resultado por ítem (un fallo no aborta el lote):

- `entries_upsert_batch` (`entries[]`) → `{ results: [{ index, ok, id?, error? }] }`; el `error` de validación conserva
  `code`/`issues` (§39.9). Lleva `requiresGuidance: true`.
- `entries_delete_batch` (`entryIds[]`) → `{ results: [{ id, ok, error? }] }`. `requiresGuidance: true`.
- `properties_discard_changes_batch` (`changeIds[]`) → `{ results: [{ changeId, ok, error? }] }`. Útil para limpiar
  huérfanos en bloque.

Ficheros: `mcp-tools.ts`. Requiere rebuild del MCP.

---

## 43. Propiedades de sistema no-creables (IMPLEMENTADO, 2026-06-30)

Del informe (punto 6): Owner, `createdate`, `closedate`, etc. aparecían como `existing-missing-remote` con remediación
`convert-to-new`, incorrecta (no deben recrearse).

- Nuevo módulo `system-properties.ts` con `isSystemProperty(objectType, name)`: lista curada (`createdate`, `closedate`,
  `lastmodifieddate`, `hubspot_owner_id`, `hs_object_id`, owners/teams, …) + heurística de prefijo `hs_`.
- `reconcile.ts`: una entrada `existing` sin remoto que sea de sistema produce un blocker con `reason: 'system-property'`
  y `remediation: 'relink'` (probable error de nombre interno), nunca `convert-to-new`. El enum `Blocker` se amplía en
  `shared/types/properties.ts` (`reason: 'existing-missing-remote' | 'system-property'`,
  `remediation: 'convert-to-new' | 'relink'`).
- `properties_pending_changes` (mcp-tools) usa la misma clasificación; `convertMissingToNew` excluye las de sistema de
  la conversión en bloque.

Tests: `system-properties.spec.ts` (4) y caso nuevo en `reconcile.spec.ts`. Requiere rebuild del MCP.

---

## 44. Validación de longitud y patrón de `hubspotName` (IMPLEMENTADO, 2026-06-30)

Del informe (punto 7): el helper no avisaba del límite de longitud; al truncar nombres largos se produjeron colisiones
entre propiedades distintas.

- `entry-validation.ts`: `HUBSPOT_PROPERTY_NAME_MAX = 100` y patrón `^[a-z][a-z0-9_]*$`. `pushNameIssues` añade
  `HUBSPOTNAME_TOO_LONG` y `HUBSPOTNAME_PATTERN` (con `example`) tanto en modo `existing` como `new`.
- Colisión: el modelo permite que varias entradas compartan una propiedad **existente**, pero dos entradas que **crean**
  (`mode: 'new'`) el mismo `hubspotName` en el mismo objeto son un duplicado real → `service.upsertEntry` lanza
  `HUBSPOTNAME_COLLISION`. El remedio es acortar el nombre en origen, no truncar.
- Límite de 100 caracteres: valor documentado de la Properties API; pendiente de confirmación final contra la doc
  (conector Chrome) — la constante está centralizada para ajustarla en un punto.

Tests: casos `§44` en `entry-validation.spec.ts` y `service.spec.ts`. Requiere rebuild del MCP.

---

## 45. Filtro por nombre en el listado (IMPLEMENTADO, 2026-06-30)

Buscar a mano en listados largos era complejo. En `PropertyManagementScreen` se añade un `TextField` (`type="search"`,
`aria-label`) que filtra `objectEntries` por `name` y por nombre de propiedad destino (`destName`), insensible a
mayúsculas y acentos (`norm` con `NFD`). Estado local que se resetea al cambiar de objeto; si el filtro no devuelve nada
se muestra `properties.noResults`. i18n: clave `properties.filters.search` añadida en los 7 locales (reutiliza
`properties.search`/`properties.noResults`, ya presentes). Solo UI; no toca lógica de negocio.

---

## 46. Exposición formal de `formField` (disponibilidad en formularios y chatbots) por MCP y UI (BORRADOR, 2026-07-02)

### 46.1 Diagnóstico

El atributo `formField` (booleano) controla si una propiedad puede usarse como campo en formularios de HubSpot **y** en
bots/chatflows (HubSpot lo gobierna con un único flag; no hay flag separado para chatbots). Hoy el atributo está
soportado en el núcleo pero **no expuesto formalmente**:

- Modelo: `HubSpotPropertyDef.formField?: boolean` ya existe (`properties.ts`).
- Backend: está en `ATTRIBUTE_KEYS` de `pending-changes.ts`, por lo que `createBody` y `diffDefinition` lo envían y
  detectan. `reconcile.ts` pasa `ref.definition` íntegra. Es columna de la hoja `Definicion` de Drive (§32,
  `sheets-model.ts`).
- MCP: el `inputSchema` de `entries_upsert` (§39.2) **no declara** `formField`; funciona por no fijar
  `additionalProperties: false`, pero el cliente MCP no sabe que puede activarlo y la guía no lo menciona.
- UI: el `EntryWizard` **no ofrece control** para `formField` (igual que `hidden`, que tampoco se expone). El `EntryPanel`
  de solo lectura tampoco lo muestra.

Esta sección lo expone como campo de primera clase en MCP y UI, sin tocar el pipeline de reconciliación (ya lo soporta).

### 46.2 Semántica y valor por defecto (tri-estado)

Se mantiene la semántica de `hasUniqueValue` (§25) y `showCurrencySymbol`:

- `formField === undefined` → **no se envía**; HubSpot aplica su valor por defecto. Es el estado inicial de una entrada
  nueva y de las entradas heredadas que no lo fijaron.
- `formField === true | false` → se envía explícito en `create`/`patch` y participa en el diff.

Aplica tanto a `mode: 'new'` (create) como a `mode: 'existing'` (patch): a diferencia de `hasUniqueValue` (inmutable),
`formField` es editable vía `PATCH`, por lo que el control se muestra en **ambos** modos.

### 46.3 MCP

- `entries_upsert` e `entries_upsert_batch`: el `inputSchema` de la rama `definition` (modos `new` y `existing`) declara
  `formField: { type: 'boolean' }`. Sin cambio de validación en `entry-validation.ts` (booleano opcional; si viene con
  tipo incorrecto se ignora aguas arriba como el resto de atributos opcionales).
- `hubspot_properties_list` (§39.4): el parseo remoto **no** capturaba `formField` (`RawProperty`/`RemoteProperty`/
  `toRemoteProperty` en `connectors/hubspot/properties.ts` y `toDef` en `service.ts`). Se añade `formField?` a esa cadena.
  Es imprescindible: sin ello el diff vería el remoto siempre como `undefined` y produciría un `update` perpetuo tras
  aplicar (mismo patrón que el bug §36 de `hidden`).
- Guía `revops_guidance` (sección `property-management`): se documenta `formField` — qué controla (formularios y bots),
  que es opcional y tri-estado, y que se puede fijar en `create` y `update`.

### 46.4 UI — `EntryWizard`

- Nuevo `Switch` dentro del `Accordion` «Opciones avanzadas», junto a `hasUniqueValue`, visible en ambos modos
  (`editableName` y selección de existente). `checked={Boolean(def.formField)}`,
  `onChange={(e) => setDef({ ...def, formField: e.target.checked })}`. Con `FieldTooltip` (SPEC-0002 §18).
- `hasAdvancedContent` incluye `def.formField !== undefined` para auto-expandir la sección al editar una entrada que ya
  lo tenga fijado.

### 46.5 UI — `EntryPanel` (solo lectura)

Bloque de solo lectura que muestra el estado de `formField` (p. ej. «Disponible en formularios y chatbots: Sí/No/—»
para `true`/`false`/`undefined`), siguiendo el patrón de §34.

### 46.6 i18n

Claves nuevas en los **7 locales** (`es`/`ca`/`eu`/`en`/`gl`/`pt`/`fr`):

- `properties.advanced.formField` (etiqueta del Switch).
- `properties.advanced.fieldHelp.formField` (tooltip).
- `properties.panel.formField` (etiqueta en `EntryPanel`).
- `properties.panel.formFieldOn` / `formFieldOff` / `formFieldDefault` (valor de solo lectura: Sí / No / default de
  HubSpot para `true`/`false`/`undefined`).

Nota: se detectó un desfase **preexistente** (ajeno a esta sección) de 76 claves en `ca`/`eu`/`en` respecto a `es`
(incluida `common.loading`); `gl`/`pt`/`fr` están a paridad. Las 6 claves de `formField` sí están en los 7.

### 46.7 Sheets

Sin cambios: la hoja `Definicion` ya incluye la columna `formField` (§32); no cambia `SHEETS_SCHEMA_VERSION`.

### 46.8 Tests

- `pending-changes.spec.ts` (§46): `createBody` incluye `formField` true/false y lo omite si `undefined`;
  `diffDefinition` marca `update_attributes` al cambiar y no diverge si coincide.
- `EntryPanel.spec.tsx` (§46): render del bloque con los tres estados (Sí/No/default).
- Paridad de claves de locales verificada por script (las 6 claves en los 7 locales).

### 46.9 Impacto / ficheros

- `connectors/hubspot/properties.ts` (`formField?` en `RawProperty`/`RemoteProperty`/`toRemoteProperty`).
- `service.ts` (`formField` en `toDef`).
- `mcp-tools.ts` (schema de `entries_upsert` modos new/existing, guía `PROPERTY_GUIDANCE`).
- `EntryWizard.tsx` (`Switch` + `hasAdvancedContent`).
- `EntryPanel.tsx` (bloque de solo lectura).
- `locales/{es,ca,eu,en,gl,pt,fr}/common.json` (6 claves).
- Requiere **rebuild de la app/MCP**.

### 46.10 Fuera de alcance

- No se expone `hidden` ni ningún otro atributo no solicitado.
- No se altera el pipeline de reconciliación/diff (ya soporta `formField`).
- No cambia el mecanismo del conector Drive ni el esquema de Sheets.

### 46.11 Estado

IMPLEMENTADO (2026-07-02). MCP (schema + guía + parseo remoto de `formField`), UI (`EntryWizard` + `EntryPanel`) e i18n
(6 claves × 7 locales). `pending-changes` 16/16 + `EntryPanel` 5/5 + suite property-management/mcp 109/109, typecheck
node/web en verde en sandbox. Requiere **rebuild de la app/MCP**.

## 47. Correctitud del servicio: concurrencia y validación de orígenes (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgos 2.4 y 2.8.

### 47.1 Relectura del store tras los await de red (§2.4)

`applyChange` y `syncHubspot` capturaban `state` antes de varios `await` de red y escribían ese snapshot completo
al final: una edición concurrente (UI + tool MCP simultáneas) se perdía (last-write-wins). Se adopta el patrón ya
usado por formularios (`forms-management/service.ts`, relectura `fresh` antes de escribir):

- `applyChange`: la escritura final mapea sobre `deps.store.get(...)` releído; solo toca la entrada y el cambio
  afectados.
- `syncHubspot`: las entradas reconciliadas se indexan por id (`reconciledById`) y se sustituyen sobre el estado
  releído; las entradas creadas durante el sync se conservan y las borradas no resucitan. Las entradas de objetos
  fallidos (`failedObjects`) quedan como estén en el estado fresco (equivalente al comportamiento previo de
  `skipped`). `reconcileEntries` solo transforma las entradas de entrada (verificado), así que el mapeo por id no
  pierde resultados.

### 47.2 `updateOrigin` valida el id (§2.8)

Antes devolvía `input.origin` aunque el id no existiera (sin tocar el store). Ahora valida la existencia (lanza
`Error('Origen no encontrado')`, que el IPC propaga) y devuelve el origen fusionado real (`{ ...existing,
...input.origin }`), no el input.

### 47.3 Estado

IMPLEMENTADO (2026-07-02). Sin cambios de API ni de UI. Requiere rebuild de la app/MCP; typecheck/test en la
máquina del usuario.

## 48. Gate de guía en las tools de descarte (IMPLEMENTADO, 2026-07-02)

Adopción del criterio homogéneo de SPEC-0005 §18.2 (informe 2026-07-02, hallazgo 3.1): los descartes mutan estado
local y quedan gated como el resto de escrituras. `requiresGuidance: true` añadido a `properties_discard_change`,
`properties_discard_changes_batch` y `properties_groups_discard_change` (el resto de tools de escritura/sync ya lo
llevaban desde §35). Requiere rebuild del MCP.
