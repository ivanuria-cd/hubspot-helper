/**
 * Construcción de las operaciones de cambio pendientes en HubSpot (SPEC-0006 §16).
 * Cada cambio guarda el `payload` exacto de la CRM Properties API v3; la app nunca lo
 * aplica sin confirmación explícita del usuario.
 */
import type {
  HsPropertyChange,
  HsPropertyOption,
  HubSpotPropertyDef,
} from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';

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

/** Atributos escalares opcionales que HubSpot acepta en create/patch además del núcleo. */
const ATTRIBUTE_KEYS = [
  'description',
  'numberDisplayHint',
  'showCurrencySymbol',
  'currencyPropertyName',
  'textDisplayHint',
  'calculationFormula',
  'dataSensitivity',
  'externalOptions',
  'referencedObjectType',
  'displayOrder',
  'hidden',
  'formField',
] as const satisfies ReadonlyArray<keyof HubSpotPropertyDef>;

/** Atributos que HubSpot normaliza y no deben compararse en el diff (evita divergencia falsa). */
const DIFF_EXCLUDED_ATTRS = new Set<string>(['calculationFormula']);

function attributeEntries(def: HubSpotPropertyDef): Array<[string, unknown]> {
  return ATTRIBUTE_KEYS.filter((key) => def[key] !== undefined).map((key) => [key, def[key]]);
}

/** Opciones por defecto de una propiedad `bool` (HubSpot exige dos: true/false). */
const BOOL_DEFAULT_OPTIONS: HsPropertyOption[] = [
  { label: 'Sí', value: 'true', displayOrder: 0, hidden: false },
  { label: 'No', value: 'false', displayOrder: 1, hidden: false },
];

function createBody(def: HubSpotPropertyDef): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: def.hubspotName,
    label: def.label,
    type: def.type,
    fieldType: def.fieldType,
    groupName: def.groupName,
  };
  const opts = cleanOptions(def.options);
  if (opts.length) body.options = opts;
  // Las propiedades bool exigen exactamente dos opciones true/false; se inyectan si faltan.
  else if (def.type === 'bool') body.options = BOOL_DEFAULT_OPTIONS;
  // hasUniqueValue solo se puede fijar al crear (es inmutable después).
  if (def.hasUniqueValue !== undefined) body.hasUniqueValue = def.hasUniqueValue;
  for (const [key, value] of attributeEntries(def)) body[key] = value;
  return body;
}

function optionsEqual(a?: HsPropertyOption[], b?: HsPropertyOption[]): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  const byValue = new Map(right.map((option) => [option.value, option]));
  return left.every((option) => {
    const match = byValue.get(option.value);
    return Boolean(match) && match?.label === option.label && match?.hidden === option.hidden;
  });
}

/** Cambio de creación para una propiedad destino que no existe en HubSpot. */
export function buildCreateChange(
  entryId: string,
  objectType: string,
  def: HubSpotPropertyDef,
  deps: ChangeFactoryDeps,
): HsPropertyChange {
  return {
    id: deps.newId(),
    entryId,
    operation: 'create',
    summary: `Crear propiedad «${def.label}» (${def.hubspotName}) en ${objectType}`,
    payload: createBody(def),
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

/** Cambio de archivado (borrado lógico) de la propiedad destino en HubSpot. */
export function buildDeleteChange(
  entryId: string,
  objectType: string,
  hubspotName: string,
  deps: ChangeFactoryDeps,
): HsPropertyChange {
  return {
    id: deps.newId(),
    entryId,
    operation: 'delete',
    summary: `Archivar propiedad «${hubspotName}» en ${objectType}`,
    payload: { name: hubspotName },
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

/**
 * Compara la definición destino (de una entrada con propiedad nueva/personalizada)
 * con la remota y devuelve los cambios necesarios.
 */
export function diffDefinition(
  entryId: string,
  def: HubSpotPropertyDef,
  remote: RemoteProperty,
  deps: ChangeFactoryDeps,
): HsPropertyChange[] {
  const changes: HsPropertyChange[] = [];

  if (def.label !== remote.label) {
    changes.push({
      id: deps.newId(),
      entryId,
      operation: 'update_label',
      summary: `Cambiar etiqueta de «${remote.label}» a «${def.label}»`,
      payload: { label: def.label },
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    });
  }

  if (def.fieldType !== remote.fieldType || def.type !== remote.type) {
    changes.push({
      id: deps.newId(),
      entryId,
      operation: 'update_field_type',
      summary: `Cambiar tipo de campo a «${def.fieldType}» (${def.type})`,
      payload: { type: def.type, fieldType: def.fieldType },
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    });
  }

  if (def.type === 'enumeration' && !optionsEqual(cleanOptions(def.options), remote.options)) {
    changes.push({
      id: deps.newId(),
      entryId,
      operation: 'update_options',
      summary: `Actualizar opciones de «${def.label}»`,
      payload: { options: cleanOptions(def.options) },
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    });
  }

  // Atributos escalares (formato, sensibilidad, fórmula…): solo se comparan los que el
  // usuario fijó explícitamente, para no generar divergencia falsa frente a los valores
  // por defecto que devuelve HubSpot.
  const attrPayload: Record<string, unknown> = {};
  const remoteRecord = remote as unknown as Record<string, unknown>;
  for (const [key, value] of attributeEntries(def)) {
    if (DIFF_EXCLUDED_ATTRS.has(key)) continue;
    if (remoteRecord[key] !== value) attrPayload[key] = value;
  }
  if (Object.keys(attrPayload).length > 0) {
    changes.push({
      id: deps.newId(),
      entryId,
      operation: 'update_attributes',
      summary: `Actualizar atributos de «${def.label}»: ${Object.keys(attrPayload).join(', ')}`,
      payload: attrPayload,
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    });
  }

  return changes;
}

/** Marca un cambio como aplicado a un entorno tras una respuesta OK de HubSpot. */
export function markApplied(
  change: HsPropertyChange,
  environment: 'production' | 'sandbox',
): HsPropertyChange {
  return {
    ...change,
    appliedToSandbox: environment === 'sandbox' ? true : change.appliedToSandbox,
    appliedToProduction: environment === 'production' ? true : change.appliedToProduction,
  };
}

/** Un cambio se considera completado solo cuando se ha aplicado en producción. */
export function isCompleted(change: HsPropertyChange): boolean {
  return change.appliedToProduction;
}
