# SPEC-0007 — Objetos Custom de HubSpot

**Estado:** IMPLEMENTADO
**Branch:** `feat/spec-0007-objetos-custom`
**Fecha:** 2026-06-11 (detallado y validado 2026-06-16; implementado 2026-06-16)
**Depende de:** SPEC-0002, SPEC-0003, SPEC-0005, SPEC-0006

---

## 1. Objetivo

Permitir **crear, editar y archivar objetos personalizados (custom objects)** de HubSpot desde la app, para que la gestión de propiedades (SPEC-0006) pueda definir entradas también sobre ellos. SPEC-0006 solo **selecciona** objetos existentes (estándar y custom ya creados); la **creación y gestión del schema** del objeto custom se especifica aquí.

Como en SPEC-0006, la app **nunca crea ni modifica nada en HubSpot sin confirmación explícita** del usuario y permite validar primero en **sandbox** antes de **producción**.

---

## 2. Contexto y decisiones de diseño

### API utilizada — CRM Object Schemas API v3

Verificado en la documentación oficial (`https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/schemas/guide`, consultada 2026-06-16). El path base es **`/crm-object-schemas/v3/schemas`**:

| Operación       | Método y path                                                           |
| --------------- | ----------------------------------------------------------------------- |
| Crear schema    | `POST /crm-object-schemas/v3/schemas`                                   |
| Listar todos    | `GET /crm-object-schemas/v3/schemas`                                    |
| Leer uno        | `GET /crm-object-schemas/v3/schemas/{objectTypeId\|fullyQualifiedName}` |
| Editar schema   | `PATCH /crm-object-schemas/v3/schemas/{objectTypeId}`                   |
| Archivar schema | `DELETE /crm-object-schemas/v3/schemas/{objectType}`                    |
| Hard delete     | `DELETE /crm-object-schemas/v3/schemas/{objectType}?archived=true`      |

> **Nota de coherencia con SPEC-0006.** El catálogo de objetos de SPEC-0006 (`connectors/hubspot/objects.ts → listObjects`) usa hoy el alias `GET /crm/v3/schemas`, que sigue funcionando. El nuevo cliente de SPEC-0007 usará el path canónico `/crm-object-schemas/v3/schemas` de la doc actual. Se evaluará unificar ambos en `objects.ts` (anotado en §11).

### Restricciones confirmadas de la API

- **`name` es inmutable** una vez creado el schema. Solo letras, números y guiones bajos; el primer carácter debe ser una letra.
- En `PATCH`, para marcar una propiedad como `requiredProperties` / `searchableProperties` / `primaryDisplayProperty` / `secondaryDisplayProperties`, **la propiedad debe existir previamente** (crearla antes vía Properties API de SPEC-0006 o en el propio POST inicial).
- **No se puede editar `name`** ni cambiar el tipo de una propiedad ya creada vía este endpoint.
- **`DELETE`** solo es posible tras eliminar todos los registros, asociaciones y propiedades del objeto. El hard delete (`?archived=true`) libera el `name` para reutilizarlo.
- Las propiedades del POST por defecto son `type: string`, `fieldType: text`. Soportan `options` y `hasUniqueValue`.
- Custom objects requieren suscripción **Enterprise** (Marketing/Sales/Service/Content/Data Hub). La app debe degradar con elegancia si el portal no lo permite (error 403 → aviso claro).

### No-idempotencia entre entornos (decisión validada)

HubSpot asigna el `objectTypeId` (formato `2-XXXXXXX`) y el `fullyQualifiedName` (`p{HubID}_{name}`) **por portal**. El mismo objeto creado en sandbox y en producción tendrá **ids distintos**. Por tanto:

- La definición local (`CustomObjectDefinition`) guarda el `objectTypeId` y el `fullyQualifiedName` **por entorno** (`{ sandbox?, production? }`).
- La reconciliación e identificación contra el portal se hace por **`name`** (interno, estable) dentro de cada entorno, no por `objectTypeId`.

### Flujo de cambios — cambio pendiente sandbox→producción (decisión validada)

Igual que SPEC-0006: las operaciones de schema (`create` / `update_schema` / `archive`) se registran como **cambios pendientes** revisables. El usuario los aplica primero en **sandbox**, valida, y luego en **producción**. Un cambio no se considera completado hasta aplicarse en producción (o descartarse para producción). Al aplicar `create` en un entorno se guarda el `objectTypeId` devuelto en ese entorno.

### Propiedades iniciales (decisión validada)

El asistente de creación permite definir las **propiedades iniciales** del objeto (incluida la obligatoria `primaryDisplayProperty`), que viajan en el `properties[]` del `POST` de creación del schema. Propiedades adicionales posteriores se gestionan desde SPEC-0006.

---

## 3. Modelo de datos / contratos

Nuevo módulo de tipos `shared/types/custom-objects.ts` (reutiliza `HsPropertyOption`, `HsPropertyType` y `HubSpotEnvironment` ya existentes).

```typescript
import type { HsPropertyOption, HsPropertyType } from '@shared/types/properties';

/** Definición de una propiedad inicial del objeto (superset de HubSpotPropertyDef de SPEC-0006). */
interface CustomObjectPropertyDef {
  name: string; // nombre interno de la propiedad
  label: string;
  type: HsPropertyType; // default 'string'
  fieldType: string; // default 'text'
  groupName?: string; // si se omite, HubSpot usa el grupo por defecto del objeto
  options?: HsPropertyOption[]; // solo enumeration
  hasUniqueValue?: boolean; // propiedad identificadora única
}

/** Etiquetas del objeto. */
interface ObjectLabels {
  singular: string;
  plural: string;
}

/** Ids asignados por HubSpot, por entorno (no idempotentes entre portales). */
interface EnvScopedId {
  sandbox?: string;
  production?: string;
}

type SchemaChangeOperation = 'create' | 'update_schema' | 'archive';

interface SchemaChange {
  id: string;
  objectId: string; // ref a CustomObjectDefinition.id
  operation: SchemaChangeOperation;
  summary: string; // resumen legible del cambio
  payload: unknown; // body de la llamada a la API
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
}

interface CustomObjectDefinition {
  id: string; // uuid interno
  name: string; // nombre interno inmutable (p.ej. 'machine')
  description?: string;
  labels: ObjectLabels;
  primaryDisplayProperty: string; // nombre de una propiedad de `properties`
  secondaryDisplayProperties?: string[];
  searchableProperties?: string[];
  requiredProperties: string[];
  associatedObjects?: string[]; // objectTypeId estándar/custom: '0-1' contactos, '0-2' empresas…
  properties: CustomObjectPropertyDef[];
  objectTypeId?: EnvScopedId; // asignado por HubSpot tras crear, por entorno
  fullyQualifiedName?: EnvScopedId; // p{HubID}_{name}, por entorno
  allowSensitiveProperties?: boolean;
  status: 'draft' | 'created' | 'divergent' | 'archived';
  pendingChanges?: SchemaChange[];
  createdAt: string;
  updatedAt: string;
}
```

### Estados del objeto

- `draft` — definido en la app, no existe aún en ningún entorno → genera cambio `create`.
- `created` — existe en HubSpot (al menos en el entorno activo) y coincide con la definición local.
- `divergent` — existe pero difiere (labels, display/required/searchable props o asociaciones) → genera cambio `update_schema`.
- `archived` — marcado para archivar → genera cambio `archive`.

### Payloads de la API (derivados de la definición)

- **`create`** → body con `name`, `description?`, `labels`, `primaryDisplayProperty`, `secondaryDisplayProperties?`, `searchableProperties?`, `requiredProperties`, `associatedObjects?`, `properties[]`, `allowSensitiveProperties?`.
- **`update_schema`** → body solo con campos editables: `description?`, `labels?`, `primaryDisplayProperty?`, `secondaryDisplayProperties?`, `searchableProperties?`, `requiredProperties?`, `associatedObjects?`. **Nunca `name` ni `properties` con tipos** (las propiedades nuevas se crean vía SPEC-0006 antes de referenciarlas).
- **`archive`** → `DELETE` sobre el `objectTypeId` del entorno. Si HubSpot devuelve 4xx por registros/propiedades existentes, se muestra el mensaje real del cuerpo (patrón `hubspotErrorMessage()` de SPEC-0006).

---

## 4. Interfaz de usuario

### Menú lateral — nueva entrada

```
CRM
  — Propiedades        (SPEC-0006)
  — Objetos custom     ← nueva entrada (path 'crm/objects')
  — Mapas
```

### Vista principal: Objetos custom

```
┌─────────────────────────────────────────────────────────┐
│  [DARK]  CRM / Objetos custom        [PROD]  [↻ Sync HS] │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [LIGHT]                                                │
│  [+ Objeto custom]                  Buscar...  Estado ▾  │
│  ──────────────────────────────────────────────────     │
│  machine        Máquinas      6 props   ● created       │
│  vehicle        Vehículos     4 props   ⚠ divergent  [→]│
│  contract       Contratos     3 props   ✕ draft     [→] │
└─────────────────────────────────────────────────────────┘
```

Badges de estado (tokens CD, sin lima sobre oscuro): `● created` lima sobre badge claro · `⚠ divergent` gris con icono · `✕ draft` gris oscuro · `▢ archived` atenuado.

### Asistente «Crear objeto custom» (`<ObjectWizard />`)

Pasos:

1. **Identidad** — `name` interno (validación: `^[a-z][a-z0-9_]*$`, inmutable; aviso explícito), `labels.singular`, `labels.plural`, `description?`.
2. **Propiedades iniciales** — alta de una o varias `CustomObjectPropertyDef` (nombre, etiqueta, tipo, fieldType, opciones si enumeration, `hasUniqueValue`). Reutiliza el editor de opciones de SPEC-0006.

   > **Sincronización con SPEC-0006.** El selector `type` → `fieldType` de este asistente debe ser **idéntico** al del `EntryWizard` de **[SPEC-0006](SPEC-0006-gestion-de-propiedades.md)** (§16.3): mismo mapeo `FIELD_TYPES_BY_TYPE`, mismo reseteo al cambiar el tipo y las mismas claves i18n `properties.fieldTypes.*`. `fieldType` **nunca** es texto libre. Todo cambio en los tipos/fieldTypes admitidos o en sus etiquetas se aplica en ambas interfaces a la vez y se anota en los dos SPECs.

3. **Propiedad principal y visualización** — `primaryDisplayProperty` (obligatoria, selector entre las propiedades definidas), `secondaryDisplayProperties[]`, `searchableProperties[]`, `requiredProperties[]`.
4. **Asociaciones** — `associatedObjects[]` (multiselección sobre el catálogo `objects:list` de SPEC-0006: estándar + custom existentes).
5. **Resumen** — vista previa del payload `create`; al confirmar se añade como **cambio pendiente** (no se llama a HubSpot todavía).

### Panel lateral de objeto (`<ObjectPanel />`)

Muestra la definición completa, el `objectTypeId`/`fullyQualifiedName` por entorno (si ya creado), el estado y la lista de cambios pendientes con botones **[Aplicar en Sandbox] / [Aplicar en Producción]** y **[Descartar]**. Permite **editar** la definición (genera `update_schema`) y **archivar** (genera `archive`, con confirmación reforzada que recuerda que requiere borrar registros/propiedades primero).

### Vista de cambios pendientes de objetos

Análoga a la de SPEC-0006: por cada cambio, operación + endpoint + estado por entorno (`sandbox ✓ / producción ✕`).

Todo el texto vía claves i18n (`customObjects.*`) en es/ca/eu/en (base es; el resto se completa cuando exista traducción). Identidad visual Cloud District (skill `cloud-district-brand`).

---

## 5. Contratos IPC

Nuevos canales (`renderer → main`). El prefijo `objects:` ya lo inicia SPEC-0006 con `objects:list` (catálogo); aquí se añaden los de gestión de schemas:

| Canal                     | Input                                  | Output                                                  |
| ------------------------- | -------------------------------------- | ------------------------------------------------------- |
| `objects:list-schemas`    | `{ projectId }`                        | `CustomObjectDefinition[]`                              |
| `objects:get-schema`      | `{ projectId, objectId }`              | `CustomObjectDefinition`                                |
| `objects:upsert-draft`    | `{ projectId, definition }`            | `CustomObjectDefinition`                                |
| `objects:request-archive` | `{ projectId, objectId }`              | `{ success }`                                           |
| `objects:delete-draft`    | `{ projectId, objectId }`              | `{ success }`                                           |
| `objects:sync-hubspot`    | `{ projectId }`                        | `{ created: number, divergent: number, draft: number }` |
| `objects:apply-change`    | `{ projectId, changeId, environment }` | `{ success, error? }`                                   |
| `objects:discard-change`  | `{ projectId, changeId }`              | `{ success }`                                           |

`objects:list` (catálogo de SPEC-0006) se mantiene sin cambios; tras aplicar un `create`, el objeto creado aparece automáticamente en él porque `listObjects` lo lee del portal.

---

## 6. Scopes / permisos HubSpot

| Scope                      | Motivo                                              |
| -------------------------- | --------------------------------------------------- |
| `crm.schemas.custom.read`  | Leer schemas de objetos custom                      |
| `crm.schemas.custom.write` | Crear / editar / archivar schemas de objetos custom |

Para leer objetos estándar al elegir asociaciones se reutilizan los scopes ya presentes de SPEC-0006 (`crm.schemas.*.read`).

---

## 7. Herramientas MCP expuestas

Lectura, gestión de borradores y **aplicación de cambios por entorno**, en coherencia con SPEC-0006 (que expone `properties_apply_change`).

| Tool                             | Descripción                                                                                                           | Scopes |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| `custom_objects_list`            | Lista las definiciones de objetos custom del proyecto con su estado                                                   | read   |
| `custom_objects_get`             | Detalle de una definición por `name` o `id`                                                                           | read   |
| `custom_objects_pending_changes` | Lista los cambios de schema pendientes de aplicar                                                                     | read   |
| `custom_objects_upsert_draft`    | Crea o actualiza un **borrador** de objeto custom (no escribe en HubSpot)                                             | write  |
| `custom_objects_apply_change`    | Aplica un cambio pendiente (`create` / `update_schema` / `archive`) en el entorno indicado (`sandbox` o `production`) | write  |
| `custom_objects_discard_change`  | Descarta un cambio pendiente del proyecto                                                                             | write  |

> Decisión registrada (2026-06-16, a petición del usuario): se expone `custom_objects_apply_change` por MCP, igual que SPEC-0006. El input exige `environment` explícito (`sandbox` | `production`); la herramienta no asume entorno por defecto. La **doble confirmación** para `archive` sigue siendo requisito de la UI; vía MCP la responsabilidad de confirmar recae en el cliente que invoca la tool con el entorno explícito.

---

## 8. Implementación — tareas atómicas

1. **`shared/types/custom-objects.ts`** — tipos del §3 e inputs IPC.
2. **`connectors/hubspot/schemas.ts`** — cliente CRM Object Schemas API v3: `createSchema()`, `listSchemas()`, `getSchema()`, `updateSchema()`, `deleteSchema()`, con `environment`, sobre el `request()` del conector (SPEC-0003).
3. **`main/custom-objects/store.ts`** — persistencia local por proyecto (`electron-store`, patrón de `property-management/store.ts`): `{ definitions: CustomObjectDefinition[] }`.
4. **`main/custom-objects/reconcile.ts`** — módulo puro: compara definiciones locales vs schemas del portal (por `name`, dentro del entorno) → estados `created` / `divergent` / `draft` y genera `SchemaChange[]`.
5. **`main/custom-objects/changes.ts`** — construcción de payloads `create`/`update_schema`/`archive`, `markApplied()` por entorno, saneo de opciones (reutiliza `cleanOptions` de SPEC-0006 o equivalente).
6. **`main/custom-objects/service.ts`** — orquesta store + conector + reconciliación; `applyChange()` guarda el `objectTypeId` devuelto por entorno; `hubspotErrorMessage()` para errores 4xx.
7. **`main/custom-objects/mcp-tools.ts`** — registro de las tools del §7.
8. **`main/custom-objects/index.ts`** — wiring Electron (inyección del conector HubSpot).
9. **Handlers IPC** `objects:*` del §5 en `main/index.ts` + contrato en `shared/types/ipc.ts` y `preload`.
10. **`renderer/features/custom-objects/`** — store Zustand + componentes `CustomObjectsScreen`, `ObjectsTable`, `ObjectWizard`, `ObjectPanel`, `PendingObjectChangesView`, `StatusBadge`.
11. **`nav-items.ts` + router** — entrada `crm/objects` y ruta.
12. **i18n** — claves `customObjects.*` en es/ca/eu/en.
13. **Integración SPEC-0006** — verificar que el catálogo `objects:list` refleja los custom recién creados (sin cambios de código esperados).
14. **Documentación de usuario** — tutoriales en `doc/tutoriales/objetos-custom/` (§10).
15. **Commit** — `feat(custom-objects): creación y gestión de objetos custom de HubSpot` (los comandos se entregan al usuario; sin commits ni Git en sandbox).

---

## 9. Tests requeridos

### Unitarios (Vitest)

- `schemas.spec.ts` — `createSchema/listSchemas/getSchema/updateSchema/deleteSchema` llaman al path y método correctos (`/crm-object-schemas/v3/schemas…`) con el `environment` adecuado (mock de `request`).
- `reconcile.spec.ts` — un objeto presente en el portal coincidente → `created`; con labels distintas → `divergent` + `update_schema`; ausente → `draft` + `create`. Identificación por `name`, no por `objectTypeId`.
- `changes.spec.ts` — el payload `create` incluye `properties[]` y `primaryDisplayProperty`; `update_schema` **no** incluye `name` ni tipos de propiedad; al aplicar `create` se guarda el `objectTypeId` del entorno; `markApplied` marca el entorno correcto.
- `service.spec.ts` — alta de borrador → `draft`; aplicar en sandbox no marca producción; error 4xx propaga el mensaje real.

### Funcionales (Playwright, mocks)

- `custom-objects-create-flow.spec.ts` — asistente completo → cambio pendiente → aplicar en sandbox → estado `created` (sandbox) → aplicar en producción.
- `custom-objects-edit-archive.spec.ts` — editar labels genera `update_schema`; archivar pide doble confirmación y refleja el error si HubSpot lo rechaza.

Cobertura objetivo ≥80% por feature. Tests unitarios no se modifican una vez aprobados (SPEC-0000 §8).

---

## 10. Documentación de usuario

Tutoriales en `doc/tutoriales/objetos-custom/`:

| Fichero                      | Tarea                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `crear-objeto-custom.md`     | Crear un objeto custom: nombre interno, etiquetas, propiedades iniciales, propiedad principal y asociaciones           |
| `editar-objeto-custom.md`    | Editar etiquetas, propiedades de visualización, requeridas y asociaciones; qué no se puede cambiar (el nombre interno) |
| `archivar-objeto-custom.md`  | Archivar un objeto: prerrequisitos (borrar registros/propiedades), diferencia archivar vs. hard delete                 |
| `aplicar-cambios-objetos.md` | Revisar cambios pendientes, aplicar primero en sandbox y luego en producción                                           |

Se exponen en la sección **Ayuda** (visor de SPEC-0002) automáticamente.

---

## 11. Consideraciones de seguridad

- Ninguna escritura de schema sin confirmación explícita del usuario; entorno activo (prod/sandbox) siempre visible antes de confirmar.
- **Archivar** un objeto exige doble confirmación en la UI (acción destructiva); el hard delete (`?archived=true`) no se ofrece desde la UI en esta versión (anotado como fuera de alcance).
- Validación de `name` en cliente y servidor (`^[a-z][a-z0-9_]*$`); el cambio de `name` se bloquea en edición.
- La aplicación de cambios de schema se expone por MCP (`custom_objects_apply_change`, §7) exigiendo siempre `environment` explícito; el entorno activo (prod/sandbox) es siempre visible antes de confirmar en la UI.
- **Anotación cross-cutting:** `objects.ts` (SPEC-0006) usa el alias `/crm/v3/schemas`; al implementar este SPEC se valorará unificarlo con `/crm-object-schemas/v3/schemas`. Cualquier cambio sobre `objects.ts` se anota también en SPEC-0006.
- **Anotación de tipos:** si se decide reutilizar `HubSpotPropertyDef` de SPEC-0006 añadiéndole `hasUniqueValue?`, se registra el cambio en SPEC-0006; por defecto se usa `CustomObjectPropertyDef` local para no tocar ese tipo.

---

## 12. Alcance

| Hace                                                                                                                                                                                                                                                                                                                     | No hace                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crear, editar (labels, display/required/searchable props, asociaciones, descripción) y archivar objetos custom vía CRM Object Schemas API v3; catálogo para SPEC-0006; alta como cambio pendiente revisable (sandbox→producción); **documento Drive del catálogo de objetos custom con el patrón común (§15, BORRADOR)** | No gestiona **registros/instancias** de los objetos; no define las **entradas** de propiedades (SPEC-0006); no crea propiedades sueltas sobre objetos existentes (SPEC-0006); no ofrece **hard delete**; no gestiona **association labels** personalizadas (solo `associatedObjects`); no toca workflows ni formularios; el documento Drive **no** es fuente de verdad (SPEC-0004 §15) |

---

## 13. Criterios de aceptación

- [ ] Se pueden crear objetos custom con sus propiedades iniciales, confirmación explícita y soporte sandbox→producción (con `objectTypeId` por entorno).
- [ ] Se puede editar el schema (labels, display/required/searchable props, asociaciones) generando un cambio `update_schema` que no toca `name` ni tipos de propiedad.
- [ ] Se puede archivar un objeto con doble confirmación y manejo del error de HubSpot si hay registros/propiedades.
- [ ] La reconciliación clasifica correctamente `created` / `divergent` / `draft` identificando por `name` dentro del entorno.
- [ ] SPEC-0006 puede seleccionar los objetos custom creados (catálogo `objects:list`).
- [ ] Tools MCP de lectura, borrador y aplicación disponibles; `custom_objects_apply_change` exige `environment` explícito.
- [ ] Tests unitarios y funcionales del §9 en verde.
- [ ] Los cuatro tutoriales de usuario creados en `doc/tutoriales/objetos-custom/`.
- [ ] PR creada (comandos entregados al usuario), revisada y mergeada en `main`.

---

## 14. Notas de implementación (2026-06-16)

Decisiones y desviaciones registradas según la norma «cada iteración sobre un código debe modificar el spec»:

- **Canal `objects:request-archive`** (no contemplado en el §5 original): el archivado necesita encolar un cambio `archive` revisable desde el panel. Se añadió el canal (+ `service.requestArchive`, preload y handler). El cambio se aplica luego por entorno vía `objects:apply-change`. No se expone por MCP.
- **Path canónico**: el cliente nuevo `connectors/hubspot/schemas.ts` usa `/crm-object-schemas/v3/schemas` (POST/GET/PATCH/DELETE). El catálogo de SPEC-0006 (`objects.ts`) sigue con el alias `/crm/v3/schemas` (funciona); unificación pendiente, anotada también en SPEC-0006.
- **`apply_change` por MCP**: implementado (`custom_objects_apply_change` + `custom_objects_discard_change`), exigiendo `environment` explícito, según validación del usuario.
- **`associatedObjects`**: el asistente guarda el `objectType` del catálogo (p. ej. `contacts`). Si HubSpot exigiera `objectTypeId` (`0-1`, `0-2`…) o nombres en mayúsculas, se ajustará el mapeo al validar en sandbox (anotado como punto a verificar).
- **Tipos**: se usó `CustomObjectPropertyDef` local (con `hasUniqueValue`) sin tocar `HubSpotPropertyDef` de SPEC-0006.
- **Corrección UI «Tipo de campo» (2026-06-16)**: en el asistente, `fieldType` pasó de texto libre a **desplegable filtrado por el `type`** de la propiedad (mismo mapeo `FIELD_TYPES_BY_TYPE` y mismas claves i18n `properties.fieldTypes.*` que el `EntryWizard` de SPEC-0006). Al cambiar el `type` se resetea al `fieldType` por defecto. No se pide al usuario adivinar un valor cerrado.
- **Corrección UI visualización/etiquetas (2026-06-16)**: los desplegables de **Visualización** (propiedad principal, requeridas, secundarias, búsqueda) muestran la **etiqueta** de la propiedad en lugar de su nombre interno (el valor sigue siendo el nombre técnico). El campo «Nombre» de cada propiedad se renombró a **«Nombre interno»** (`customObjects.wizard.propName` en es/ca/eu/en).
- **Saneo de referencias obsoletas (2026-06-16)**: HubSpot rechazaba el `create` con 400 cuando `searchableProperties`/`requiredProperties`/`secondaryDisplayProperties` listaban un nombre que ya no existía entre las propiedades (p. ej. una propiedad renombrada de `Nombre` a `name` que seguía referenciada por su valor antiguo). Solución: `createSchemaBody` (`changes.ts`) **filtra** esas listas para conservar solo nombres de propiedades existentes; y `ObjectWizard` sanea **al cargar** (`useEffect`), **al renderizar** (el valor del desplegable se intersecta con las propiedades actuales) y **al guardar** (`handleSubmit`), de modo que una referencia obsoleta ya cargada (que se mostraba como «Nombre, Nombre») desaparece de la selección al abrir el objeto y no se vuelve a persistir. Cubierto por test en `changes.spec.ts`. Nota: en `update_schema` no se filtra contra las propiedades iniciales, porque el objeto puede tener más propiedades en HubSpot añadidas vía SPEC-0006.

### Ficheros principales creados

- `shared/types/custom-objects.ts` — tipos y contratos IPC.
- `connectors/hubspot/schemas.ts` (+ `schemas.spec.ts`) — CRM Object Schemas API v3.
- `main/custom-objects/` — `store.ts`, `changes.ts` (+spec), `reconcile.ts` (+spec), `service.ts` (+spec), `mcp-tools.ts`, `index.ts`.
- `renderer/features/custom-objects/` — `store/custom-objects-store.ts` y componentes `CustomObjectsScreen`, `ObjectWizard`, `ObjectPanel`, `PendingObjectChangesView`, `ObjectStatusBadge`.
- Wiring: `shared/types/ipc.ts`, `preload/index.ts`, `main/index.ts`, `nav-items.ts`, `router.tsx`.
- i18n: bloque `customObjects.*` + `sidebar.objects` + `help.features.objetos-custom` en es/ca/eu/en.
- `doc/tutoriales/objetos-custom/` — los cuatro tutoriales del §10.

### Verificación

- Tests unitarios (Vitest) de `changes`, `reconcile`, `schemas` y `service` en verde (18 casos en la primera ejecución limpia); la prueba de integración MCP sigue en verde con las nuevas tools.
- Durante la verificación, el espejo del sandbox truncó/desincronizó de forma intermitente algunos ficheros (`service.ts` y los `common.json`), provocando falsos errores de transform de esbuild ajenos al código. Los originales están sanos (verificado vía herramienta de lectura). El **typecheck y el test completos deben ejecutarse en la máquina del usuario**.

---

## 15. Documento Drive del catálogo de objetos custom (IMPLEMENTADO, 2026-06-17)

Objetos custom no tenía documento de Drive. Para unificar la experiencia con el resto de características,
estrena uno adoptando el **patrón común de SPEC-0004 §15** (botón crear-o-actualizar, carga desde Drive,
modal al salir). El documento **no** es fuente de verdad: el estado operativo sigue en `electron-store` y
HubSpot.

### 15.1 Contenido del documento (Google Sheets)

`featureKey: custom-objects`. Un Google Sheets con identidad CD y `schema_version: 1`:

| Hoja              | Contenido                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `00_Portada`      | Identidad CD, descripción, guía de uso, `schema_version`                                                                               |
| `01_Objetos`      | Un objeto custom por fila: nombre interno, labels (singular/plural), descripción, `objectTypeId` por entorno, estado de reconciliación |
| `02_Propiedades`  | Propiedades de cada objeto: objeto, nombre interno, etiqueta, tipo, `fieldType`, flags (display/required/searchable/unique)            |
| `03_Asociaciones` | Asociaciones declaradas (`associatedObjects`) por objeto                                                                               |

El builder es puro y testeable (`buildCustomObjectsTabs(objects)`), reutilizando el estilo/protección de
SPEC-0006 §19. Las erratas de nombres/etiquetas se vuelcan verbatim (SPEC-0000).

### 15.2 Patrón común (idéntico al resto)

- Botón **«Actualizar archivo en Drive»** (crear-o-actualizar, best-effort) → canal
  `custom-objects:write-sheets` que arma las hojas con `buildCustomObjectsTabs` y escribe vía
  `gdrive.writeSpreadsheet`. Registra `lastWrittenAt`.
- Botón **«Cargar desde Drive»** → canal `custom-objects:load-sheets`. Implementado con documento de estado
  companion (SPEC-0004 §15.5): `main/custom-objects/drive-state.ts`
  (`CUSTOM_OBJECTS_STATE_FEATURE_KEY = 'custom-objects-state'`, `serializeCustomObjectsState`,
  `parseCustomObjectsState`); el handler hace `gdrive.readFile` + parse + `service.applyDriveState`
  (reemplaza `definitions`). El builder `buildCustomObjectsTabs` solo produce el Sheets legible. Canal de
  metadatos `custom-objects:drive-meta`.
- Modal **`DriveDirtyGuard`** al salir con cambios sin actualizar; preferencia «no volver a preguntar» por
  proyecto.
- UI mediante los componentes compartidos `DriveDocActions` / `DriveDirtyGuard` (SPEC-0004 §15.4) e i18n
  compartida `drive.doc.*` / `drive.dirtyGuard.*`.

### 15.3 Tests requeridos

- `sheets-model.spec.ts` (custom-objects): el builder produce las cuatro hojas con encabezados y una fila por
  objeto/propiedad/asociación; round-trip `parseCustomObjectsTabs(buildCustomObjectsTabs(x)) ≈ x`.
- Funcional: «Actualizar archivo en Drive» best-effort sin carpeta no rompe; «Cargar desde Drive» pide
  confirmación y reconstruye la lista (mock del conector).

### 15.4 Impacto

- `main/custom-objects/sheets-model.ts` (builder + parser inverso), `service.ts`/`store.ts`
  (`lastWrittenAt`, reemplazo de estado), handlers `custom-objects:write-sheets` / `custom-objects:load-sheets`.
- `ipc.ts`/`preload`/`RevOpsApi` (dos canales nuevos).
- `CustomObjectsScreen.tsx`: añade `DriveDocActions` + `DriveDirtyGuard`.
- i18n: usa las claves compartidas `drive.doc.*` / `drive.dirtyGuard.*`.

## 16. Defecto detectado en pruebas del MCP — la creación de objetos custom no es end-to-end (BORRADOR, 2026-06-18)

Hallazgo de la batería de pruebas del MCP `revops` sobre el proyecto «Testing» (informe completo en
`INFORME-pruebas-mcp-2026-06-18.md`). Afecta a las tools de §7. Pendiente de corrección.

### 16.1 No existe la promoción draft → cambio aplicable

- `custom_objects_upsert_draft` deja **siempre** el objeto en `status: "draft"` con `pendingChanges: []`, y
  **ignora** el campo `status` que se le envíe (probado con `status: "ready"`).
- No hay ninguna tool para promover ese draft a un cambio `create` aplicable.
- `custom_objects_apply_change` exige un `changeId` real en la cola: invocado con el `id` del draft devuelve
  `{"success":false,"error":"Cambio no encontrado"}`.
- **Consecuencia:** **no se puede crear un objeto custom de extremo a extremo solo con el MCP.** El paso
  draft → pending vive únicamente en la UI de la app. _Impacto alto_ si se pretende crear objetos custom de
  forma programática (p. ej. desde un cliente MCP).
- **Corrección requerida:** exponer una operación que genere el cambio `create` a partir de un draft
  (o que `apply_change` resuelva directamente un draft), de modo que el ciclo draft → apply sea completo
  vía MCP.

### 16.2 `custom_objects_apply_change` — verificado e idempotente

- Probado aplicando el cambio existente del objeto `ratones` a **sandbox**: `success:true`. Es **idempotente**
  cuando el objeto ya existe (no duplica ni altera el schema). Sin defecto.

### 16.3 Falta borrado/descarte de drafts

- No hay tool para eliminar un draft de objeto custom (`custom_objects_*` solo `list`/`get`/`upsert_draft`/
  `pending_changes`/`apply_change`/`discard_change`, y `discard_change` requiere un `changeId`, no un draft).
  Un draft creado para pruebas queda como residuo no eliminable vía MCP.
- **Corrección requerida:** añadir borrado de drafts (o que `discard_change` acepte el id del draft).

### 16.4 Implementación (2026-06-18)

- **16.1 — RESUELTO.** El cambio `create` ya lo genera `reconcileDefinitions` dentro de `service.syncHubspot`
  (igual que en propiedades/formularios); lo que faltaba era exponerlo. Registrada la tool
  `custom_objects_sync` en `mcp-tools.ts`. Flujo end-to-end vía MCP: `custom_objects_upsert_draft` →
  `custom_objects_sync` (genera el `create`) → `custom_objects_apply_change`. Usa el mismo
  `service.syncHubspot` que la UI → **la app funciona igual**.
- **16.3 — RESUELTO.** Registrada la tool `custom_objects_delete_draft` (delega en el ya existente
  `service.deleteDraft`, el mismo que usa la UI).
- **16.2** sin cambios (no era defecto: `apply_change` ya funcionaba e idempotente).
- **Pendiente en máquina:** `npm run typecheck` y `npm run test:unit` (clon al sandbox corrupto; originales
  verificados sanos).

---

## 17. Confirmación de archivado/borrado y feedback (IMPLEMENTADO, 2026-06-19)

Origen: Informe UX 2026-06-19, hallazgos #2 y #1. En `ObjectPanel.tsx` el archivado usa un estado booleano local (la confirmación inline persiste visualmente tras aplicar) y el borrado de borrador se ejecuta sin diálogo; la sincronización no confirma con toast.

Adopción de SPEC-0002 §11 (ConfirmDialog):

- Archivar objeto y borrar borrador → `confirm({ tone:'danger', ... })`, sustituyendo el estado `confirmArchive` local.

Adopción de SPEC-0002 §10 (Snackbar):

- Tras `custom_objects_sync` / aplicar: `notify` con resultado (éxito/error).

Claves i18n nuevas: `objects.archiveTitle/Body`, `objects.deleteDraftTitle/Body`, `objects.synced`, `objects.syncError` (cuatro locales).

Implementado 2026-06-19: `ObjectPanel` usa `useConfirm` para archivar y borrar borrador; el toast de resultado se emite en `handleApply` de `CustomObjectsScreen`.

## 18. Adopción del patrón de estados de carga (SPEC-0002 §17) (IMPLEMENTADO, 2026-06-22)

`CustomObjectsScreen` (listado), `ObjectWizard` y `ObjectPanel` adoptan el patrón de SPEC-0002 §17: la pantalla
y el panel pintan `LoadingState` (variantes `cards`/`form`) con `aria-busy` mientras resuelven objetos/propiedades;
el `ObjectWizard` se abre de inmediato con su esqueleto y carga después (catálogo de objetos, grupos), reseteando
el estado en cada apertura. Sincronizar/aplicar usan botones en estado ocupado. Pendiente de implementación.

## 18. Adopción de la identidad visual de los documentos de Drive (SPEC-0012) (IMPLEMENTADO, 2026-06-23)

El Sheets del catálogo de objetos custom hereda automáticamente el estilo de marca de SPEC-0012 vía el módulo
compartido `sheets-style.ts` (banner de portada, cabeceras `#090017` + texto blanco, congelado fila/columna,
notas por columna, wrap, anchos fijos) y el Doc de estado el estilado de portada de `cover-template.ts`. El
layout de hojas (`buildCustomObjectsTabs`) no cambia estructuralmente (la separación por objeto de SPEC-0012
§2.3 aplica solo al mapa de propiedades de SPEC-0006), por lo que `CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION` se
mantiene. Sin cambios en el round-trip (SPEC-0004 §15.5).

---

## 19. Adopción de tooltips i18n en campos rellenables (SPEC-0002 §18) (IMPLEMENTADO, 2026-06-23)

`ObjectWizard` adopta el patrón de **[SPEC-0002 §18](SPEC-0002-app-shell.md)** (norma en
**[SPEC-0000 §3](SPEC-0000-normas-del-proyecto.md)**): cada campo rellenable lleva un `FieldTooltip` con texto
i18n, asociado por `aria-describedby` (en las filas de propiedades dentro de `.map` se usa `FieldTooltip` directo).
Campos: nombre interno, etiqueta singular/plural, descripción; por propiedad inicial: nombre interno, etiqueta,
tipo, tipo de campo y único; y visualización: propiedad principal, requeridas, secundarias, búsqueda y
asociaciones. Claves `customObjects.wizard.fieldHelp.*` en `es`/`ca`/`eu`/`en`. typecheck/test en máquina.

> Nota: existen dos secciones numeradas «§18» en este SPEC (estados de carga, BORRADOR; e identidad visual,
> IMPLEMENTADO). Es una errata de numeración preexistente; se mantiene y solo se señala. Esta sección continúa
> como §19.

## 20. Adopción del gate de guía en las tools MCP (SPEC-0005 §15/§18.2) (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgo 3.1: ninguna tool de la feature declaraba
`requiresGuidance`, pese a que `custom_objects_apply_change` escribe en HubSpot. `requiresGuidance: true` añadido
a las tools que mutan estado o sincronizan: `custom_objects_upsert_draft`, `custom_objects_apply_change`,
`custom_objects_discard_change`, `custom_objects_sync` y `custom_objects_delete_draft`. Quedan libres las de solo
lectura (`custom_objects_list`, `custom_objects_get`, `custom_objects_pending_changes`). Requiere rebuild del MCP;
typecheck/test en la máquina del usuario.

## 21. Keys estables en el `ObjectWizard` (IMPLEMENTADO, 2026-07-02)

Del informe de revisión de código 2026-07-02, hallazgo 8.6 (menor). La lista de propiedades (con borrado) usaba
`key={index}`; ahora cada fila lleva `uiId` (`crypto.randomUUID()`, en `emptyProperty()` y al mapear
`definition.properties`) usado como `key`; en `handleSubmit` el `uiId` se elimina del payload por destructuring.
Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 22. Reconciliar al cambiar de entorno (PENDIENTE, prioridad BAJA)

Análogo a **SPEC-0006 §37.8**: al cambiar el selector SANDBOX/Producción, `CustomObjectsScreen` debería
**reconciliar** (`sync`) contra el nuevo entorno activo, no solo recargar el estado local. Hoy el callback de
`useHubspotEnvironmentChange` (`CustomObjectsScreen.tsx:69`) llama a `load(projectId)` + `loadObjects(projectId)`;
tendría que llamar a `sync`. **No implementado**: prioridad BAJA, se abordará junto con el resto del tema de
entornos (incluye decidir si los objetos custom deben tener estado por entorno como propiedades).

## 23. Comprobar el resultado de `applyChange` en la UI (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 1. `CustomObjectsScreen.handleApply`
(`CustomObjectsScreen.tsx:95-111`) ignora el booleano que devuelve `applyChange` (tipado `Promise<boolean>` en
`custom-objects-store.ts:20-24`). El store fija `error` y devuelve `false` ante un fallo **suave** —HubSpot rechaza
sin lanzar (400/403/409) o no se cumple una precondición, p. ej. «el objeto no existe aún en ese entorno»
(`service.ts:164`)—, pero la pantalla muestra siempre `customObjects.syncToastDone` (toast de éxito) salvo
excepción. Resultado: falso «hecho» cuando no se aplicó nada en HubSpot.

Corrección (alinear con `PropertyManagementScreen.tsx:184`, patrón SPEC-0006 §50): `const ok = await applyChange(...)`;
si `ok`, toast de éxito; si no, toast de error `customObjects.syncToastError` con el detalle
`useCustomObjectsStore.getState().error ?? t('common.loadError')`. El refresco de `setSelected` (`:99-101`) se mueve
a la rama de éxito.

Alcance: cambio local a un handler. No toca store, IPC ni servicio —el booleano ya se devuelve—; sin i18n nueva
(`customObjects.syncToastError` ya acepta `{error}`, se usa hoy en el `catch`).

Caso límite: el fallback literal `'Error desconocido'` del store (`custom-objects-store.ts:69`) es un hallazgo
aparte (bloque 1); esta corrección no depende de él porque la pantalla cae a `t('common.loadError')` si el `error`
del store viniera vacío.

Implementado 2026-07-14 (`CustomObjectsScreen.tsx:95-120`). Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 24. Eliminar el import cruzado con property-management (adopta SPEC-0006 §55) (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, hallazgo G1. `CustomObjectsScreen.tsx:12` importaba `useObjectsStore`
de `property-management/store/objects-store` —único import cruzado del árbol, prohibido por SPEC-0000 §6—. Se
sustituye por el store compartido `@shared/store/objects-store` (ver **SPEC-0006 §55**): cambia la línea de import
(12) y el sitio de consumo (`:45`) pasa a leer del store compartido; comportamiento idéntico. Implementado
2026-07-14. Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 25. Relectura del store tras los `await` de red (adopta SPEC-0006 §47) (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 1. `custom-objects/service.ts` era la única de las tres
features hermanas que persistía sobre el snapshot del store previo a la llamada de red (last-write-wins con
ediciones concurrentes UI+MCP):

- `applyChange` (`:137-194`): lee `state` (`:138`), hace `await createSchema/updateSchema/deleteSchema`, y escribe
  con `state.definitions.map(...)` (`:181`).
- `syncHubspot` (`:118-135`): lee `state` (`:119`), `await listSchemas`, y persiste `result.definitions` (`:131`).

**Corrección (patrón SPEC-0006 §47).** Localizar/reconciliar sobre el snapshot, pero releer
`const fresh = deps.store.get(input.projectId)` justo antes de persistir y mapear por id:

- `applyChange`: `fresh.definitions.map(...)` en vez de `state.definitions.map(...)`.
- `syncHubspot`: `reconciledById = new Map(result.definitions.map((d) => [d.id, d]))`; persistir
  `fresh.definitions.map((d) => reconciledById.get(d.id) ?? d)`.

`reconcileDefinitions` (`reconcile.ts`) es una transformación 1:1 sobre las definiciones locales (no importa
objetos del portal ni borra), por lo que el mapeo por id preserva las definiciones creadas durante el `await` y no
reintroduce las borradas.

**Alcance.** Solo `service.ts`; sin cambios de contrato, IPC ni i18n. En un solo flujo el comportamiento es
idéntico (`fresh` == `state`).

**Casos límite.** (1) Una edición concurrente de la MISMA definición durante su apply se pierde (se sobrescribe
con `nextDef`, construido desde el snapshot); inherente y compartido con propiedades, fuera de alcance. (2) Si la
definición fue borrada del store durante el `await`, el map no la reintroduce (correcto). (3) Una definición nueva
durante `syncHubspot` se preserva con su `status` local y se reconcilia en el siguiente sync.

**Tests.** Añadir a `custom-objects/service.spec.ts` casos de escritura concurrente (un upsert durante
applyChange/sync no se pierde), sin tocar los existentes (SPEC-0000 §8).

Implementado 2026-07-14 (`service.ts` `applyChange`/`syncHubspot` releen `fresh` y mapean por id; 2 tests de concurrencia en `service.spec.ts`). Requiere rebuild de la app; typecheck/test en la máquina del usuario.

## 26. Registrar la guía MCP de objetos custom (completa §20) (IMPLEMENTADO, 2026-07-14)

Del informe de revisión de código 2026-07-14, bloque 1. §20 marcó `requiresGuidance: true` en las tools de
escritura de objetos custom, pero `registerCustomObjectTools` no llama a `guidanceRegistry.register`
(SPEC-0005 §15.4). El gate obliga a leer `revops_guidance` antes de escribir, pero esa guía no contiene ninguna
regla de objetos custom (solo propiedades y planning): el agente queda sin reglas operativas de la feature.

**Corrección.** Al inicio de `registerCustomObjectTools` (tras el guard `registry.has('custom_objects_list')`),
registrar la sección con el patrón de propiedades:

```ts
guidanceRegistry.register({
  featureKey: 'custom-objects',
  title: 'Objetos custom: identificación por entorno y flujo',
  order: 20,
  body: CUSTOM_OBJECTS_GUIDANCE,
});
```

Texto propuesto (`CUSTOM_OBJECTS_GUIDANCE`):

```
Los objetos custom se identifican por su `name` DENTRO de cada entorno. El `objectTypeId` es distinto en
sandbox y en producción: no se reutiliza entre entornos.

Flujo: custom_objects_upsert_draft (crea/edita un borrador local; no escribe en HubSpot) ->
custom_objects_sync (reconcilia contra el entorno activo y genera los cambios pendientes: `create` si el
objeto no existe en el portal, `update_schema` si existe pero difiere) -> custom_objects_apply_change
(escribe en el entorno indicado).

custom_objects_sync NO escribe en HubSpot (solo reconcilia). Solo apply_change escribe.

apply_change de `update_schema` o `archive` exige que el objeto YA exista en ese entorno; si no, falla con
«el objeto no existe aún en ese entorno; crea primero el objeto en ese entorno». Consecuencia: el `create`
se aplica en cada entorno por separado (aplicarlo en sandbox no lo crea en producción).

Estados: draft (no existe en el portal), created (existe y coincide), divergent (existe pero difiere ->
update_schema). custom_objects_delete_draft elimina el borrador local; no afecta a HubSpot.
```

**Alcance.** Solo `custom-objects/mcp-tools.ts` (import de `guidanceRegistry` + constante + registro). Sin cambios
de tools ni de contrato. Requiere rebuild del MCP. Al implementar se verifica que `mcp-tools.spec.ts` limpie el
`guidanceRegistry` entre casos (o no re-registre) para no toparse con «Sección de guía duplicada».

Implementado 2026-07-14 (`custom-objects/mcp-tools.ts` registra la sección `CUSTOM_OBJECTS_GUIDANCE`, order 20; `guidanceRegistry.clear()` añadido al `setup` de `mcp-tools.spec.ts`). Requiere rebuild del MCP; typecheck/test en la máquina del usuario.
