/** Handlers IPC de objetos custom (SPEC-0007). Extraído de `index.ts` (SPEC-0002 §23). */
import { ipcMain } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import type {
  ObjectApplyChangeInput,
  ObjectDeleteDraftInput,
  ObjectDiscardChangeInput,
  ObjectGetSchemaInput,
  ObjectsListSchemasInput,
  ObjectUpsertDraftInput,
} from '@shared/types/custom-objects';
import type { CustomObjectService } from '../custom-objects/service';
import type { GoogleDriveConnector } from '../connectors/google-drive';
import type { DriveDocs } from '../drive-docs';
import { CUSTOM_OBJECTS_FEATURE_KEY } from '../custom-objects/sheets-model';
import {
  CUSTOM_OBJECTS_STATE_FEATURE_KEY,
  parseCustomObjectsState,
} from '../custom-objects/drive-state';
import { registerDriveStateIpc } from './drive-state-ipc';

export interface CustomObjectsIpcDeps {
  customObjects: CustomObjectService;
  gdrive: GoogleDriveConnector;
  driveDocs: DriveDocs;
}

export function registerCustomObjectsIpc(deps: CustomObjectsIpcDeps): void {
  const { customObjects, gdrive, driveDocs } = deps;

  ipcMain.handle(IpcChannels.objectsListSchemas, (_event, input: ObjectsListSchemasInput) =>
    customObjects.listDefinitions(input),
  );
  ipcMain.handle(IpcChannels.objectsGetSchema, (_event, input: ObjectGetSchemaInput) =>
    customObjects.getDefinition(input),
  );
  ipcMain.handle(IpcChannels.objectsUpsertDraft, (_event, input: ObjectUpsertDraftInput) =>
    customObjects.upsertDraft(input),
  );
  ipcMain.handle(IpcChannels.objectsRequestArchive, (_event, input: ObjectGetSchemaInput) =>
    customObjects.requestArchive(input),
  );
  ipcMain.handle(IpcChannels.objectsDeleteDraft, (_event, input: ObjectDeleteDraftInput) =>
    customObjects.deleteDraft(input),
  );
  ipcMain.handle(IpcChannels.objectsSyncHubspot, (_event, input: ObjectsListSchemasInput) =>
    customObjects.syncHubspot(input),
  );
  ipcMain.handle(IpcChannels.objectsApplyChange, (_event, input: ObjectApplyChangeInput) =>
    customObjects.applyChange(input),
  );
  ipcMain.handle(IpcChannels.objectsDiscardChange, (_event, input: ObjectDiscardChangeInput) =>
    customObjects.discardChange(input),
  );
  ipcMain.handle(IpcChannels.customObjectsWriteSheets, (_event, input: ObjectsListSchemasInput) =>
    driveDocs.writeCustomObjectsSheets(input.projectId),
  );
  registerDriveStateIpc(
    { gdrive, driveDocs },
    {
      loadChannel: IpcChannels.customObjectsLoadSheets,
      metaChannel: IpcChannels.customObjectsDriveMeta,
      stateFeatureKey: CUSTOM_OBJECTS_STATE_FEATURE_KEY,
      fileFeatureKey: CUSTOM_OBJECTS_FEATURE_KEY,
      applyContent: (input, content) => {
        const state = parseCustomObjectsState(content);
        customObjects.applyDriveState(input, { objects: state.objects });
        return state.schemaVersion;
      },
      getDriveMeta: (input) => customObjects.getDriveMeta(input),
    },
  );
}
