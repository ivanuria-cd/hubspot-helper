/**
 * Construcción de las operaciones de cambio de schema pendientes en HubSpot (SPEC-0007).
 * Cada cambio guarda el `payload` exacto de la CRM Object Schemas API v3; la app nunca lo
 * aplica sin confirmación explícita del usuario y entorno.
 */
import type { HsPropertyOption } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import type {
  CustomObjectDefinition,
  CustomObjectPropertyDef,
  SchemaChange,
} from '@shared/types/custom-objects';
import type { RemoteSchema } from '../connectors/hubspot/schemas';

export interface ChangeFactoryDeps {
  newId: () => string;
  now: () => string;
}

/** Descarta opciones vacías y reindexa el orden (HubSpot rechaza label/value vacíos). */
export function cleanOptions(options?: HsPropertyOption[]): HsPropertyOption[] {
  return (options ?? [])
    .filter((o) => o.label.trim() && o.value.trim())
    .map((o, i) => ({ ...o, displayOrder: i }));
}

function propertyBody(prop: CustomObjectPropertyDef): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: prop.name,
    label: prop.label,
    type: prop.type,
    fieldType: prop.fieldType,
  };
  if (prop.groupName) body.groupName = prop.groupName;
  if (prop.hasUniqueValue) body.hasUniqueValue = true;
  const opts = cleanOptions(prop.options);
  if (opts.length) body.options = opts;
  return body;
}

/**
 * Filtra una lista de nombres de propiedad para quedarnos solo con las que existen
 * realmente entre las propiedades del objeto. Evita referencias obsoletas (p. ej. una
 * propiedad renombrada que seguía listada como searchable) que HubSpot rechaza con 400.
 */
function keepExisting(names: string[] | undefined, valid: Set<string>): string[] {
  return (names ?? []).filter((n) => valid.has(n));
}

/** Body del POST de creación del schema, derivado de la definición local. */
export function createSchemaBody(def: CustomObjectDefinition): Record<string, unknown> {
  const validNames = new Set(def.properties.map((p) => p.name).filter(Boolean));
  const body: Record<string, unknown> = {
    name: def.name,
    labels: def.labels,
    primaryDisplayProperty: def.primaryDisplayProperty,
    requiredProperties: keepExisting(def.requiredProperties, validNames),
    properties: def.properties.map(propertyBody),
  };
  if (def.description) body.description = def.description;
  const secondary = keepExisting(def.secondaryDisplayProperties, validNames);
  if (secondary.length) body.secondaryDisplayProperties = secondary;
  const searchable = keepExisting(def.searchableProperties, validNames);
  if (searchable.length) body.searchableProperties = searchable;
  if (def.associatedObjects?.length) body.associatedObjects = def.associatedObjects;
  if (def.allowSensitiveProperties) body.allowSensitiveProperties = true;
  return body;
}

/**
 * Body del PATCH de edición. NUNCA incluye `name` (inmutable) ni los tipos de propiedad
 * (las propiedades nuevas se crean vía Properties API antes de referenciarlas).
 */
export function updateSchemaBody(def: CustomObjectDefinition): Record<string, unknown> {
  const body: Record<string, unknown> = {
    labels: def.labels,
    primaryDisplayProperty: def.primaryDisplayProperty,
    requiredProperties: def.requiredProperties ?? [],
    secondaryDisplayProperties: def.secondaryDisplayProperties ?? [],
    searchableProperties: def.searchableProperties ?? [],
  };
  if (def.description !== undefined) body.description = def.description;
  if (def.associatedObjects?.length) body.associatedObjects = def.associatedObjects;
  return body;
}

export function buildCreateChange(def: CustomObjectDefinition, deps: ChangeFactoryDeps): SchemaChange {
  return {
    id: deps.newId(),
    objectId: def.id,
    operation: 'create',
    summary: `Crear objeto «${def.labels.singular}» (${def.name})`,
    payload: createSchemaBody(def),
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

export function buildArchiveChange(def: CustomObjectDefinition, deps: ChangeFactoryDeps): SchemaChange {
  return {
    id: deps.newId(),
    objectId: def.id,
    operation: 'archive',
    summary: `Archivar objeto «${def.labels.singular}» (${def.name})`,
    payload: {},
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

function arraysEqual(a?: string[], b?: string[]): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();
  return left.length === right.length && left.every((v, i) => v === right[i]);
}

/** Compara la definición local con el schema remoto y devuelve un `update_schema` si difieren. */
export function diffSchema(
  def: CustomObjectDefinition,
  remote: RemoteSchema,
  deps: ChangeFactoryDeps,
): SchemaChange[] {
  const diverges =
    def.labels.singular !== (remote.labels?.singular ?? '') ||
    def.labels.plural !== (remote.labels?.plural ?? '') ||
    def.primaryDisplayProperty !== (remote.primaryDisplayProperty ?? '') ||
    !arraysEqual(def.requiredProperties, remote.requiredProperties) ||
    !arraysEqual(def.secondaryDisplayProperties, remote.secondaryDisplayProperties) ||
    !arraysEqual(def.searchableProperties, remote.searchableProperties);

  if (!diverges) return [];
  return [
    {
      id: deps.newId(),
      objectId: def.id,
      operation: 'update_schema',
      summary: `Actualizar schema de «${def.labels.singular}» (${def.name})`,
      payload: updateSchemaBody(def),
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    },
  ];
}

/** Marca un cambio como aplicado a un entorno tras una respuesta OK de HubSpot. */
export function markApplied(change: SchemaChange, environment: HubSpotEnvironment): SchemaChange {
  return {
    ...change,
    appliedToSandbox: environment === 'sandbox' ? true : change.appliedToSandbox,
    appliedToProduction: environment === 'production' ? true : change.appliedToProduction,
  };
}
