/**
 * Acceso a la CRM Object Schemas API v3 de HubSpot (SPEC-0007).
 * Ref: https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/schemas/guide
 * Path base: `/crm-object-schemas/v3/schemas`. Se apoya en el `request()` del conector (SPEC-0003).
 */
import type { HubSpotEnvironment, HubSpotResponse } from '@shared/types/hubspot';
import type { HubSpotRequester } from './properties';

const BASE = '/crm-object-schemas/v3/schemas';

/** Schema tal como lo devuelve HubSpot (subconjunto usado). */
export interface RemoteSchema {
  objectTypeId: string;
  fullyQualifiedName: string;
  name: string;
  labels?: { singular?: string; plural?: string };
  description?: string;
  primaryDisplayProperty?: string;
  secondaryDisplayProperties?: string[];
  searchableProperties?: string[];
  requiredProperties?: string[];
  archived?: boolean;
}

interface RawSchema {
  objectTypeId?: string;
  fullyQualifiedName?: string;
  name?: string;
  labels?: { singular?: string; plural?: string };
  description?: string;
  primaryDisplayProperty?: string;
  secondaryDisplayProperties?: string[];
  searchableProperties?: string[];
  requiredProperties?: string[];
  archived?: boolean;
}

export function toRemoteSchema(raw: RawSchema): RemoteSchema {
  return {
    objectTypeId: raw.objectTypeId ?? '',
    fullyQualifiedName: raw.fullyQualifiedName ?? '',
    name: raw.name ?? '',
    labels: raw.labels,
    description: raw.description,
    primaryDisplayProperty: raw.primaryDisplayProperty,
    secondaryDisplayProperties: raw.secondaryDisplayProperties ?? [],
    searchableProperties: raw.searchableProperties ?? [],
    requiredProperties: raw.requiredProperties ?? [],
    archived: raw.archived ?? false,
  };
}

export interface SchemasApiDeps {
  request: HubSpotRequester;
  projectId: string;
}

export function createSchemasApi(deps: SchemasApiDeps) {
  async function listSchemas(environment?: HubSpotEnvironment): Promise<RemoteSchema[]> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'GET',
      path: BASE,
    });
    const data = response.data as { results?: RawSchema[] };
    return (data.results ?? []).map(toRemoteSchema);
  }

  async function getSchema(
    objectType: string,
    environment?: HubSpotEnvironment,
  ): Promise<RemoteSchema> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'GET',
      path: `${BASE}/${objectType}`,
    });
    return toRemoteSchema(response.data as RawSchema);
  }

  function createSchema(payload: unknown, environment: HubSpotEnvironment): Promise<HubSpotResponse> {
    return deps.request({
      projectId: deps.projectId,
      environment,
      method: 'POST',
      path: BASE,
      body: payload,
    });
  }

  function updateSchema(
    objectType: string,
    payload: unknown,
    environment: HubSpotEnvironment,
  ): Promise<HubSpotResponse> {
    return deps.request({
      projectId: deps.projectId,
      environment,
      method: 'PATCH',
      path: `${BASE}/${objectType}`,
      body: payload,
    });
  }

  function deleteSchema(
    objectType: string,
    environment: HubSpotEnvironment,
  ): Promise<HubSpotResponse> {
    return deps.request({
      projectId: deps.projectId,
      environment,
      method: 'DELETE',
      path: `${BASE}/${objectType}`,
    });
  }

  return { listSchemas, getSchema, createSchema, updateSchema, deleteSchema };
}

export type SchemasApi = ReturnType<typeof createSchemasApi>;
