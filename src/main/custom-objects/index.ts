import { randomUUID } from 'node:crypto';
import { createCustomObjectService, type CustomObjectService } from './service';
import { ElectronCustomObjectStore } from './store';
import { createSchemasApi } from '../connectors/hubspot/schemas';
import type { HubSpotConnector } from '../connectors/hubspot';

export interface ElectronCustomObjectDeps {
  hubspot: HubSpotConnector;
}

export function createElectronCustomObjectService(
  deps: ElectronCustomObjectDeps,
): CustomObjectService {
  const request = (req: Parameters<HubSpotConnector['request']>[0]) => deps.hubspot.request(req);
  return createCustomObjectService({
    store: new ElectronCustomObjectStore(),
    schemasApiFor: (projectId) => createSchemasApi({ request, projectId }),
    activeEnvironment: (projectId) =>
      deps.hubspot.getStatus(projectId)?.activeEnvironment ?? 'production',
    newId: () => randomUUID(),
    now: () => new Date().toISOString(),
  });
}

export { createCustomObjectService } from './service';
export type { CustomObjectService } from './service';
