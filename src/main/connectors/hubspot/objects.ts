/**
 * Catálogo de objetos de HubSpot: estándar (conocidos) + custom existentes en el portal.
 * Los custom se obtienen de la CRM Schemas API v3 (`GET /crm/v3/schemas`).
 * La creación de objetos custom es competencia de SPEC-0007, no de este módulo.
 */
import type { HubSpotObject } from '@shared/types/properties';
import type { HubSpotRequester } from './properties';

/** Objetos estándar relevantes para el mapa de propiedades. */
export const STANDARD_OBJECTS: HubSpotObject[] = [
  { objectType: 'contacts', label: 'Contactos', custom: false },
  { objectType: 'companies', label: 'Empresas', custom: false },
  { objectType: 'deals', label: 'Negocios', custom: false },
  { objectType: 'tickets', label: 'Tickets', custom: false },
  { objectType: 'products', label: 'Productos', custom: false },
  { objectType: 'line_items', label: 'Líneas de pedido', custom: false },
];

interface RawSchema {
  objectTypeId?: string;
  name?: string;
  fullyQualifiedName?: string;
  labels?: { singular?: string; plural?: string };
}

export function customObjectFromSchema(schema: RawSchema): HubSpotObject {
  const objectType = schema.objectTypeId ?? schema.fullyQualifiedName ?? schema.name ?? '';
  const label = schema.labels?.plural ?? schema.labels?.singular ?? schema.name ?? objectType;
  return { objectType, label, custom: true };
}

export interface ObjectsApiDeps {
  request: HubSpotRequester;
  projectId: string;
}

export function createObjectsApi(deps: ObjectsApiDeps) {
  async function listObjects(): Promise<HubSpotObject[]> {
    let custom: HubSpotObject[] = [];
    try {
      const response = await deps.request({
        projectId: deps.projectId,
        method: 'GET',
        path: '/crm/v3/schemas',
      });
      const data = response.data as { results?: RawSchema[] };
      custom = (data.results ?? []).map(customObjectFromSchema).filter((o) => o.objectType);
    } catch {
      // Sin permisos de schemas o portal sin custom objects: devolvemos solo los estándar.
      custom = [];
    }
    return [...STANDARD_OBJECTS, ...custom];
  }

  return { listObjects };
}

export type ObjectsApi = ReturnType<typeof createObjectsApi>;
