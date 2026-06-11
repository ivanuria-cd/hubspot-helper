import { randomUUID } from 'node:crypto';
import { createPropertyService, type PropertyService, type SheetSink } from './service';
import { ElectronPropertyStore } from './store';
import { createPropertiesApi } from '../connectors/hubspot/properties';
import type { HubSpotConnector } from '../connectors/hubspot';
import type { GoogleDriveConnector } from '../connectors/google-drive';
import { PROPERTY_MAP_FEATURE_KEY } from './sheets-writer';

export interface ElectronPropertyDeps {
  hubspot: HubSpotConnector;
  gdrive: GoogleDriveConnector;
  projectName: (projectId: string) => string;
}

export function createElectronPropertyService(deps: ElectronPropertyDeps): PropertyService {
  const sheetSink: SheetSink = {
    async write(projectId, name, schemaVersion, tabs) {
      const result = await deps.gdrive.writeSpreadsheet({
        projectId,
        name,
        featureKey: PROPERTY_MAP_FEATURE_KEY,
        schemaVersion,
        tabs,
      });
      if (!result.success) throw new Error(result.error ?? 'Error al escribir el Sheets');
    },
  };

  return createPropertyService({
    store: new ElectronPropertyStore(),
    propertiesApiFor: (projectId) =>
      createPropertiesApi({ request: (req) => deps.hubspot.request(req), projectId }),
    projectName: deps.projectName,
    sheetSink,
    newId: () => randomUUID(),
    now: () => new Date().toISOString(),
  });
}

export { createPropertyService } from './service';
export type { PropertyService } from './service';
