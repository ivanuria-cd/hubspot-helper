import { randomUUID } from 'node:crypto';
import { createFormService, type FormService } from './service';
import { ElectronFormsStore } from './store';
import { createFormsApi } from '../connectors/hubspot/forms';
import { createSubscriptionsApi } from '../connectors/hubspot/subscriptions';
import { ElectronPropertyStore } from '../property-management/store';
import type { HubSpotConnector } from '../connectors/hubspot';

export interface ElectronFormServiceDeps {
  hubspot: HubSpotConnector;
}

export function createElectronFormService(deps: ElectronFormServiceDeps): FormService {
  const request = (req: Parameters<HubSpotConnector['request']>[0]) => deps.hubspot.request(req);
  const propertyStore = new ElectronPropertyStore();
  return createFormService({
    store: new ElectronFormsStore(),
    formsApiFor: (projectId) => createFormsApi({ request, projectId }),
    subscriptionsApiFor: (projectId) => createSubscriptionsApi({ request, projectId }),
    entriesFor: (projectId) => propertyStore.get(projectId).entries,
    originsFor: (projectId) => propertyStore.get(projectId).origins,
    newId: () => randomUUID(),
    now: () => new Date().toISOString(),
  });
}

export { createFormService } from './service';
export type { FormService } from './service';
