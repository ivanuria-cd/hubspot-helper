/**
 * Acceso a la CRM Properties API v3 de HubSpot.
 * Ref: https://developers.hubspot.com/docs/api/crm/properties
 * Se apoya en el `request()` genérico del conector (SPEC-0003).
 */
import type {
  DataSensitivity,
  HsPropertyOption,
  HsPropertyType,
  NumberDisplayHint,
  TextDisplayHint,
} from '@shared/types/properties';
import type { HubSpotEnvironment, HubSpotRequest, HubSpotResponse } from '@shared/types/hubspot';

export type HubSpotRequester = (req: HubSpotRequest) => Promise<HubSpotResponse>;

/** Definición de una propiedad tal como la devuelve HubSpot. */
export interface RemoteProperty {
  name: string;
  objectType: string;
  label: string;
  type: HsPropertyType;
  fieldType: string;
  groupName: string;
  description?: string;
  hubspotDefined?: boolean;
  options?: HsPropertyOption[];
  numberDisplayHint?: NumberDisplayHint;
  showCurrencySymbol?: boolean;
  currencyPropertyName?: string;
  textDisplayHint?: TextDisplayHint;
  calculationFormula?: string;
  hasUniqueValue?: boolean;
  dataSensitivity?: DataSensitivity;
  externalOptions?: boolean;
  referencedObjectType?: string;
}

/** Grupo de propiedades de un objeto. */
export interface RemoteGroup {
  name: string;
  label: string;
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
  numberDisplayHint?: NumberDisplayHint;
  showCurrencySymbol?: boolean;
  currencyPropertyName?: string;
  textDisplayHint?: TextDisplayHint;
  calculationFormula?: string;
  hasUniqueValue?: boolean;
  dataSensitivity?: DataSensitivity;
  externalOptions?: boolean;
  referencedObjectType?: string;
}

interface RawGroup {
  name: string;
  label: string;
}

function normalizeType(type: string): HsPropertyType {
  return type as HsPropertyType;
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

export function toRemoteProperty(raw: RawProperty, objectType = ''): RemoteProperty {
  return {
    name: raw.name,
    objectType,
    label: raw.label,
    type: normalizeType(raw.type),
    fieldType: raw.fieldType,
    groupName: raw.groupName,
    description: raw.description,
    hubspotDefined: raw.hubspotDefined ?? false,
    options: normalizeOptions(raw.options),
    numberDisplayHint: raw.numberDisplayHint,
    showCurrencySymbol: raw.showCurrencySymbol,
    currencyPropertyName: raw.currencyPropertyName,
    textDisplayHint: raw.textDisplayHint,
    calculationFormula: raw.calculationFormula,
    hasUniqueValue: raw.hasUniqueValue,
    dataSensitivity: raw.dataSensitivity,
    externalOptions: raw.externalOptions,
    referencedObjectType: raw.referencedObjectType,
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
    return (data.results ?? []).map((raw) => toRemoteProperty(raw, objectType));
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

  async function listGroups(
    objectType: string,
    environment?: HubSpotEnvironment,
  ): Promise<RemoteGroup[]> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'GET',
      path: `/crm/v3/properties/${objectType}/groups`,
    });
    const data = response.data as { results?: RawGroup[] };
    return (data.results ?? []).map((g) => ({ name: g.name, label: g.label }));
  }

  async function createGroup(
    objectType: string,
    group: { name: string; label: string },
    environment?: HubSpotEnvironment,
  ): Promise<RemoteGroup> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'POST',
      path: `/crm/v3/properties/${objectType}/groups`,
      body: group,
    });
    const data = response.data as RawGroup;
    return { name: data.name ?? group.name, label: data.label ?? group.label };
  }

  return { listProperties, createProperty, patchProperty, listGroups, createGroup };
}

export type PropertiesApi = ReturnType<typeof createPropertiesApi>;
