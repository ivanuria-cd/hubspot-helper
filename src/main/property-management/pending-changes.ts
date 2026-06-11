/**
 * Construcción de las operaciones de cambio pendientes en HubSpot (SPEC-0006).
 * Cada cambio guarda el `payload` exacto de la llamada a la CRM Properties API v3,
 * pero la app nunca lo aplica sin confirmación explícita del usuario.
 */
import type {
  HsPropertyChange,
  HsPropertyOption,
  HubSpotProperty,
} from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';

export interface ChangeFactoryDeps {
  newId: () => string;
  now: () => string;
}

function createBody(property: HubSpotProperty): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: property.hubspotName,
    label: property.label,
    type: property.type,
    fieldType: property.fieldType,
    groupName: property.groupName,
  };
  if (property.description) body.description = property.description;
  if (property.options) body.options = property.options;
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

/** Cambio de creación para una propiedad que no existe en HubSpot. */
export function buildCreateChange(
  property: HubSpotProperty,
  deps: ChangeFactoryDeps,
): HsPropertyChange {
  return {
    id: deps.newId(),
    propertyId: property.id,
    operation: 'create',
    summary: `Crear propiedad «${property.label}» (${property.hubspotName}) en ${property.objectType}`,
    payload: createBody(property),
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

/**
 * Compara la definición local con la remota y devuelve los cambios necesarios
 * para que HubSpot coincida con la definición del proyecto.
 */
export function diffProperty(
  property: HubSpotProperty,
  remote: RemoteProperty,
  deps: ChangeFactoryDeps,
): HsPropertyChange[] {
  const changes: HsPropertyChange[] = [];

  if (property.label !== remote.label) {
    changes.push({
      id: deps.newId(),
      propertyId: property.id,
      operation: 'update_label',
      summary: `Cambiar etiqueta de «${remote.label}» a «${property.label}»`,
      payload: { label: property.label },
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    });
  }

  if (property.fieldType !== remote.fieldType || property.type !== remote.type) {
    changes.push({
      id: deps.newId(),
      propertyId: property.id,
      operation: 'update_field_type',
      summary: `Cambiar tipo de campo a «${property.fieldType}» (${property.type})`,
      payload: { type: property.type, fieldType: property.fieldType },
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    });
  }

  if (property.type === 'enumeration' && !optionsEqual(property.options, remote.options)) {
    changes.push({
      id: deps.newId(),
      propertyId: property.id,
      operation: 'update_options',
      summary: `Actualizar opciones de «${property.label}»`,
      payload: { options: property.options ?? [] },
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
