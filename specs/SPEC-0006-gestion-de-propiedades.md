# SPEC-0006 — Gestión de Propiedades

**Estado:** VALIDADO — criterios de aceptación pendientes hasta implementación  
**Branch:** `feat/spec-0006-gestion-propiedades`  
**Fecha:** 2026-06-09  
**Depende de:** SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0005

---

## 1. Objetivo

Centralizar la gestión del mapa de propiedades de un proyecto RevOps: qué propiedades existen en HubSpot, cuál es su origen, qué transformaciones requieren, y qué cambios hay que aplicar en HubSpot para mantener la coherencia. El estado de verdad vive en Google Drive (Google Sheets con identidad CD); la app es la interfaz de edición y sincronización con HubSpot.

---

## 2. Contexto y Decisiones de Diseño

### Fuente de verdad
- El archivo de mapa de propiedades es un **Google Sheets** gestionado por SPEC-0004.
- La app lee de Drive al abrirse y ante sincronización manual; escribe en Drive ante cualquier cambio del usuario.
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
- `export-json.spec.ts` — exportar JSON de un origen; verificar estructura y valores con fixtures

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
