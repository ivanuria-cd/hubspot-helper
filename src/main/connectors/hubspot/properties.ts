/**
 * Acceso a la CRM Properties API v3 de HubSpot.
 * Ref: https://developers.hubspot.com/docs/api/crm/properties
 * Se apoya en el `request()` genérico del conector (SPEC-0003) para reutilizar
 * autenticación, entorno activo y rate limiting.
 */
import type { HsPropertyOption, HsPropertyType } from '@shared/types/properties';
import type { HubSpotEnvironment, HubSpotRequest, HubSpotResponse } from '@shared/types/hubspot';

/** Realiza una petición HTTP a HubSpot a través del conector. */
export type HubSpotRequester = (req: HubSpotRequest) => Promise<HubSpotResponse>;

/** Definición de una propiedad tal como la devuelve HubSpot. */
export interface RemoteProperty {
  name: string;
  label: string;
  type: HsPropertyType;
  fieldType: string;
  groupName: string;
  description?: string;
  hubspotDefined?: boolean;
  options?: HsPropertyOption[];
}

interface RawPropertyOption {
  label: string;
  value: string;
  displayOrder?: number;
  hidden?: boolean;
}

interface RawProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  groupName: string;
  description?: string;
  hubspotDefined?: boolean;
  options?: RawPropertyOption[];
}

const KNOWN_TYPES: HsPropertyType[] = [
  'string',
  'number',
  'date',
  'datetime',
  'enumeration',
  'bool',
  'phone_number',
];

function normalizeType(type: string): HsPropertyType {
  return KNOWN_TYPES.includes(type as HsPropertyType) ? (type as HsPropertyType) : 'string';
}

function normalizeOptions(options?: RawPropertyOption[]): HsPropertyOption[] | undefined {
  if (!options) return undefined;
  return options.map((option, index) => ({
    label: option.label,
    value: option.value,
    displayOrder: option.displayOrder ?? index,
    hidden: option.hidden ?? false,
  }));
}

export function toRemoteProperty(raw: RawProperty): RemoteProperty {
  return {
    name: raw.name,
    label: raw.label,
    type: normalizeType(raw.type),
    fieldType: raw.fieldType,
    groupName: raw.groupName,
    description: raw.description,
    hubspotDefined: raw.hubspotDefined ?? false,
    options: normalizeOptions(raw.options),
  };
}

export interface PropertiesApiDeps {
  request: HubSpotRequester;
  projectId: string;
}

export function createPropertiesApi(deps: PropertiesApiDeps) {
  async function listProperties(
    objectType: string,
    environment?: HubSpotEnvironment,
  ): Promise<RemoteProperty[]> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'GET',
      path: `/crm/v3/properties/${objectType}`,
    });
    const data = response.data as { results?: RawProperty[] };
    return (data.results ?? []).map(toRemoteProperty);
  }

  async function createProperty(
    objectType: string,
    payload: unknown,
    environment: HubSpotEnvironment,
  ): Promise<HubSpotResponse> {
    return deps.request({
      projectId: deps.projectId,
      environment,
      method: 'POST',
      path: `/crm/v3/properties/${objectType}`,
      body: payload,
    });
  }

  async function patchProperty(
    objectType: string,
    propertyName: string,
    payload: unknown,
    environment: HubSpotEnvironment,
  ): Promise<HubSpotResponse> {
    return deps.request({
      projectId: deps.projectId,
      environment,
      method: 'PATCH',
      path: `/crm/v3/properties/${objectType}/${propertyName}`,
      body: payload,
    });
  }

  return { listProperties, createProperty, patchProperty };
}

export type PropertiesApi = ReturnType<typeof createPropertiesApi>;
