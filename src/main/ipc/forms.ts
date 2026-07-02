/** Handlers IPC de la gestión de formularios (SPEC-0008). Extraído de `index.ts` (SPEC-0002 §23). */
import { ipcMain } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import type { LoadSheetsResult } from '@shared/types/gdrive';
import type {
  FormAddMissingFieldsInput,
  FormApplyChangeInput,
  FormCoverageInput,
  FormCreateDefinitionInput,
  FormDiscardChangeInput,
  FormEditPendingChangeInput,
  FormGetInput,
  FormLinkDeleteInput,
  FormLinksListInput,
  FormLinkUpsertInput,
  FormsListInput,
  FormsSyncInput,
  FormUpdateDefinitionInput,
} from '@shared/types/forms';
import type { FormService } from '../forms-management/service';
import type { GoogleDriveConnector } from '../connectors/google-drive';
import type { DriveDocs } from '../drive-docs';
import { FORMS_FEATURE_KEY } from '../forms-management/sheets-model';
import { FORMS_STATE_FEATURE_KEY, parseFormsState } from '../forms-management/drive-state';

export interface FormsIpcDeps {
  forms: FormService;
  gdrive: GoogleDriveConnector;
  driveDocs: DriveDocs;
}

export function registerFormsIpc(deps: FormsIpcDeps): void {
  const { forms, gdrive, driveDocs } = deps;

  ipcMain.handle(IpcChannels.formsList, (_event, input: FormsListInput) => forms.listForms(input));
  ipcMain.handle(IpcChannels.formsPendingChanges, (_event, input: FormsListInput) =>
    forms.listPendingChanges(input.projectId),
  );
  ipcMain.handle(IpcChannels.formsSyncHubspot, (_event, input: FormsSyncInput) =>
    forms.syncHubspot(input),
  );
  ipcMain.handle(IpcChannels.formsGet, (_event, input: FormGetInput) => forms.getForm(input));
  ipcMain.handle(IpcChannels.formsCreateDefinition, (_event, input: FormCreateDefinitionInput) =>
    forms.createDefinition(input),
  );
  ipcMain.handle(IpcChannels.formsUpdateDefinition, (_event, input: FormUpdateDefinitionInput) =>
    forms.updateDefinition(input),
  );
  ipcMain.handle(IpcChannels.formsEditPendingChange, (_event, input: FormEditPendingChangeInput) =>
    forms.updatePendingChange(input),
  );
  ipcMain.handle(IpcChannels.formsSubscriptionTypes, (_event, input: FormsListInput) =>
    forms.listSubscriptionTypes(input),
  );
  ipcMain.handle(IpcChannels.formsCoverage, (_event, input: FormCoverageInput) =>
    forms.coverage(input),
  );
  ipcMain.handle(IpcChannels.formsAddMissingFields, (_event, input: FormAddMissingFieldsInput) =>
    forms.addMissingFields(input),
  );
  ipcMain.handle(IpcChannels.formsApplyChange, (_event, input: FormApplyChangeInput) =>
    forms.applyChange(input),
  );
  ipcMain.handle(IpcChannels.formsDiscardChange, (_event, input: FormDiscardChangeInput) =>
    forms.discardChange(input),
  );
  ipcMain.handle(IpcChannels.formLinksList, (_event, input: FormLinksListInput) =>
    forms.listLinks(input),
  );
  ipcMain.handle(IpcChannels.formLinksUpsert, (_event, input: FormLinkUpsertInput) =>
    forms.upsertLink(input),
  );
  ipcMain.handle(IpcChannels.formLinksDelete, (_event, input: FormLinkDeleteInput) =>
    forms.deleteLink(input),
  );
  ipcMain.handle(IpcChannels.formsWriteSheets, (_event, input: FormsListInput) =>
    driveDocs.writeFormsSheets(input.projectId),
  );
  ipcMain.handle(
    IpcChannels.formsLoadSheets,
    async (_event, input: FormsListInput): Promise<LoadSheetsResult> => {
      const read = await gdrive.readFile({
        projectId: input.projectId,
        featureKey: FORMS_STATE_FEATURE_KEY,
      });
      if (!read.success || !read.content) {
        return { success: false, error: read.error ?? 'No hay documento de estado en Drive.' };
      }
      try {
        const state = parseFormsState(read.content);
        forms.applyDriveState(input, { forms: state.forms, links: state.links });
        return { success: true, schemaVersion: state.schemaVersion };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error al cargar' };
      }
    },
  );
  ipcMain.handle(IpcChannels.formsDriveMeta, (_event, input: FormsListInput) => ({
    ...forms.getDriveMeta(input),
    fileId: driveDocs.managedSpreadsheetId(input.projectId, FORMS_FEATURE_KEY),
    configured: Boolean(gdrive.getStatus(input.projectId)?.folderId),
  }));
}
