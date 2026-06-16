import { randomUUID } from 'node:crypto';
import { createPropertyService, type PropertyService } from './service';
import { ElectronPropertyStore } from './store';
import { createPropertiesApi } from '../connectors/hubspot/properties';
import { createObjectsApi } from '../connectors/hubspot/objects';
import type { HubSpotConnector } from '../connectors/hubspot';

export interface ElectronPropertyDeps {
  hubspot: HubSpotConnector;
}

export function createElectronPropertyService(deps: ElectronPropertyDeps): PropertyService {
  const request = (req: Parameters<HubSpotConnector['request']>[0]) => deps.hubspot.request(req);
  return createPropertyService({
    store: new ElectronPropertyStore(),
    propertiesApiFor: (projectId) => createPropertiesApi({ request, projectId }),
    objectsApiFor: (projectId) => createObjectsApi({ request, projectId }),
    newId: () => randomUUID(),
    now: () => new Date().toISOString(),
  });
}

export { createPropertyService } from './service';
export type { PropertyService } from './service';
