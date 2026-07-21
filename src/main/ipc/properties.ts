/** Handlers IPC de la gestión de propiedades (SPEC-0006). Extraído de `index.ts` (SPEC-0002 §23). */
import { ipcMain } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import type {
  ApplyChangeInput,
  ConvertEntryInput,
  ConvertMissingInput,
  DiscardChangeInput,
  EntriesListInput,
  EntryDeleteInput,
  EntryUpsertInput,
  ExportJsonInput,
  GroupApplyChangeInput,
  GroupChangesListInput,
  GroupCreateInput,
  GroupDeleteRequestInput,
  GroupDiscardChangeInput,
  GroupsListInput,
  HubSpotPropertiesInput,
  OriginCreateInput,
  OriginDeleteInput,
  OriginSetObjectFieldsInput,
  OriginUpdateInput,
  ProjectScopedInput,
} from '@shared/types/properties';
import type { PlanningApplyInput } from '@shared/types/planning';
import type { PropertyService } from '../property-management/service';
import type { GoogleDriveConnector } from '../connectors/google-drive';
import type { DriveDocs } from '../drive-docs';
import { PLANNING_MAP_FEATURE_KEY } from '../property-management/planning-model';
import { PROPERTY_STATE_FEATURE_KEY, parsePropertyState } from '../property-management/drive-state';
import { registerDriveStateIpc } from './drive-state-ipc';

export interface PropertiesIpcDeps {
  properties: PropertyService;
  gdrive: GoogleDriveConnector;
  driveDocs: DriveDocs;
}

export function registerPropertiesIpc(deps: PropertiesIpcDeps): void {
  const { properties, gdrive, driveDocs } = deps;

  ipcMain.handle(IpcChannels.objectsList, (_event, input: ProjectScopedInput) =>
    properties.listObjects(input),
  );
  ipcMain.handle(IpcChannels.hubspotPropertiesList, (_event, input: HubSpotPropertiesInput) =>
    properties.listHubSpotProperties(input),
  );
  ipcMain.handle(IpcChannels.groupsList, (_event, input: GroupsListInput) =>
    properties.listGroups(input),
  );
  ipcMain.handle(IpcChannels.groupsCreate, (_event, input: GroupCreateInput) =>
    properties.createGroup(input),
  );
  ipcMain.handle(IpcChannels.groupRequestDelete, (_event, input: GroupDeleteRequestInput) =>
    properties.requestGroupDelete(input),
  );
  ipcMain.handle(IpcChannels.groupChanges, (_event, input: GroupChangesListInput) =>
    properties.listGroupChanges(input),
  );
  ipcMain.handle(IpcChannels.groupApplyChange, (_event, input: GroupApplyChangeInput) =>
    properties.applyGroupChange(input),
  );
  ipcMain.handle(IpcChannels.groupDiscardChange, (_event, input: GroupDiscardChangeInput) =>
    properties.discardGroupChange(input),
  );
  ipcMain.handle(IpcChannels.entriesList, (_event, input: EntriesListInput) =>
    properties.listEntries(input),
  );
  ipcMain.handle(IpcChannels.entriesUpsert, (_event, input: EntryUpsertInput) =>
    properties.upsertEntry(input),
  );
  ipcMain.handle(IpcChannels.entriesDelete, (_event, input: EntryDeleteInput) =>
    properties.deleteEntry(input),
  );
  ipcMain.handle(IpcChannels.propertiesSyncHubspot, (_event, input: ProjectScopedInput) =>
    properties.syncHubspot(input),
  );
  ipcMain.handle(IpcChannels.propertiesConvertToNew, (_event, input: ConvertEntryInput) =>
    properties.convertEntryToNew(input),
  );
  ipcMain.handle(IpcChannels.propertiesConvertMissingToNew, (_event, input: ConvertMissingInput) =>
    properties.convertMissingToNew(input),
  );
  ipcMain.handle(IpcChannels.propertiesApplyChange, (_event, input: ApplyChangeInput) =>
    properties.applyChange(input),
  );
  ipcMain.handle(IpcChannels.propertiesDiscardChange, (_event, input: DiscardChangeInput) =>
    properties.discardChange(input),
  );
  ipcMain.handle(IpcChannels.propertiesExportJson, (_event, input: ExportJsonInput) =>
    properties.exportJson(input),
  );
  ipcMain.handle(IpcChannels.propertiesWriteSheets, (_event, input: ProjectScopedInput) =>
    driveDocs.writePropertiesSheets(input.projectId),
  );
  ipcMain.handle(IpcChannels.propertiesWritePlanningMap, (_event, input: ProjectScopedInput) =>
    driveDocs.writePlanningMap(input.projectId),
  );
  ipcMain.handle(IpcChannels.propertiesImportPlanningMap, (_event, input: ProjectScopedInput) =>
    driveDocs.importPlanningMap(input.projectId),
  );
  ipcMain.handle(IpcChannels.propertiesApplyPlanningImport, (_event, input: PlanningApplyInput) =>
    driveDocs.applyPlanningImport(input.projectId, input.resolutions),
  );
  registerDriveStateIpc(
    { gdrive, driveDocs },
    {
      loadChannel: IpcChannels.propertiesLoadSheets,
      metaChannel: IpcChannels.propertiesDriveMeta,
      stateFeatureKey: PROPERTY_STATE_FEATURE_KEY,
      fileFeatureKey: PLANNING_MAP_FEATURE_KEY,
      applyContent: (input, content) => {
        const state = parsePropertyState(content);
        properties.applyDriveState(input, { entries: state.entries, origins: state.origins });
        return state.schemaVersion;
      },
      getDriveMeta: (input) => properties.getDriveMeta(input),
    },
  );
  ipcMain.handle(IpcChannels.originsList, (_event, input: ProjectScopedInput) =>
    properties.listOrigins(input),
  );
  ipcMain.handle(IpcChannels.originsCreate, (_event, input: OriginCreateInput) =>
    properties.createOrigin(input),
  );
  ipcMain.handle(IpcChannels.originsUpdate, (_event, input: OriginUpdateInput) =>
    properties.updateOrigin(input),
  );
  ipcMain.handle(IpcChannels.originsDelete, (_event, input: OriginDeleteInput) =>
    properties.deleteOrigin(input),
  );
  ipcMain.handle(IpcChannels.originsSetObjectFields, (_event, input: OriginSetObjectFieldsInput) =>
    properties.setObjectFields(input),
  );
}
