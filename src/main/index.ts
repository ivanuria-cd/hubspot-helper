import { app, BrowserWindow, ipcMain, session } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import { createMainWindow } from './window';
import { loadEnv } from './env';
import { checkForUpdates, registerUpdaterEvents } from './updater';
import { getLanguage, setLanguage } from './settings';
import { createElectronProjectsService } from './projects';
import { createElectronHubSpotConnector } from './connectors/hubspot';
import { createElectronGoogleDriveConnector } from './connectors/google-drive';
import { createElectronMcpService, mcpRegistry } from './mcp';
import { createElectronPropertyService } from './property-management';
import { registerPropertyTools } from './property-management/mcp-tools';
import { createElectronCustomObjectService } from './custom-objects';
import { registerCustomObjectTools } from './custom-objects/mcp-tools';
import { createElectronFormService } from './forms-management';
import { registerFormTools } from './forms-management/mcp-tools';
import {
  buildFormsTabs,
  FORMS_FEATURE_KEY,
  FORMS_SHEETS_SCHEMA_VERSION,
} from './forms-management/sheets-model';
import {
  buildPropertyMapTabs,
  PROPERTY_MAP_FEATURE_KEY,
  SHEETS_SCHEMA_VERSION,
} from './property-management/sheets-model';
import {
  PROPERTY_STATE_FEATURE_KEY,
  parsePropertyState,
  serializePropertyState,
} from './property-management/drive-state';
import {
  FORMS_STATE_FEATURE_KEY,
  parseFormsState,
  serializeFormsState,
} from './forms-management/drive-state';
import {
  buildCustomObjectsTabs,
  CUSTOM_OBJECTS_FEATURE_KEY,
  CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION,
} from './custom-objects/sheets-model';
import {
  CUSTOM_OBJECTS_STATE_FEATURE_KEY,
  parseCustomObjectsState,
  serializeCustomObjectsState,
} from './custom-objects/drive-state';
import type { LoadSheetsResult } from '@shared/types/gdrive';
import type { SupportedLanguage } from '@shared/i18n/languages';
import type { NewProjectInput, Project } from '@shared/types/project';
import type {
  HubSpotEnvironmentInput,
  HubSpotRequest,
  HubSpotSaveTokenInput,
} from '@shared/types/hubspot';
import type {
  GoogleCredentialsInput,
  GoogleDriveListFoldersInput,
  GoogleDriveProjectInput,
  GoogleDriveReadFileInput,
  GoogleDriveSearchFoldersInput,
  GoogleDriveSetFolderInput,
  GoogleDriveWriteFileInput,
} from '@shared/types/gdrive';
import type {
  ApplyChangeInput,
  DiscardChangeInput,
  EntriesListInput,
  EntryDeleteInput,
  EntryUpsertInput,
  ExportJsonInput,
  GroupCreateInput,
  GroupsListInput,
  HubSpotPropertiesInput,
  OriginCreateInput,
  OriginDeleteInput,
  OriginUpdateInput,
  ProjectScopedInput,
} from '@shared/types/properties';
import type {
  ObjectApplyChangeInput,
  ObjectDeleteDraftInput,
  ObjectDiscardChangeInput,
  ObjectGetSchemaInput,
  ObjectsListSchemasInput,
  ObjectUpsertDraftInput,
} from '@shared/types/custom-objects';
import type {
  FormAddMissingFieldsInput,
  FormApplyChangeInput,
  FormCoverageInput,
  FormCreateDefinitionInput,
  FormDiscardChangeInput,
  FormGetInput,
  FormLinkDeleteInput,
  FormLinksListInput,
  FormLinkUpsertInput,
  FormsListInput,
  FormsSyncInput,
  FormUpdateDefinitionInput,
} from '@shared/types/forms';

let mainWindow: BrowserWindow | null = null;
let mcpService: ReturnType<typeof createElectronMcpService> | null = null;

function registerIpcHandlers(): ReturnType<typeof createElectronMcpService> {
  const projects = createElectronProjectsService();
  const hubspot = createElectronHubSpotConnector();
  const gdrive = createElectronGoogleDriveConnector();

  // Proyecto activo en la sesión MCP: el último abierto, o el más reciente al arrancar.
  let activeProjectId = projects.list().sort((a, b) =>
    b.lastOpenedAt.localeCompare(a.lastOpenedAt),
  )[0]?.id ?? '';

  const mcp = createElectronMcpService({
    version: app.getVersion(),
    getActiveProjectId: () => activeProjectId,
  });

  const properties = createElectronPropertyService({ hubspot });
  registerPropertyTools(mcpRegistry, properties);

  const customObjects = createElectronCustomObjectService({ hubspot });
  registerCustomObjectTools(mcpRegistry, customObjects);

  const forms = createElectronFormService({ hubspot });
  registerFormTools(mcpRegistry, forms);

  ipcMain.handle(IpcChannels.appGetVersion, () => app.getVersion());
  ipcMain.handle(IpcChannels.updaterCheck, () => checkForUpdates());
  ipcMain.handle(IpcChannels.settingsGetLanguage, () => getLanguage());
  ipcMain.handle(IpcChannels.settingsSetLanguage, (_event, language: SupportedLanguage) =>
    setLanguage(language),
  );
  ipcMain.handle(IpcChannels.projectsList, () => projects.list());
  ipcMain.handle(IpcChannels.projectsCreate, (_event, input: NewProjectInput) =>
    projects.create(input),
  );
  ipcMain.handle(IpcChannels.projectsUpdate, (_event, project: Project) => projects.update(project));
  ipcMain.handle(IpcChannels.projectsDelete, (_event, id: string) => projects.remove(id));
  ipcMain.handle(IpcChannels.projectsSetActive, (_event, id: string) => {
    activeProjectId = id;
    return projects.setActive(id);
  });
  ipcMain.handle(IpcChannels.hubspotSaveToken, (_event, input: HubSpotSaveTokenInput) =>
    hubspot.saveToken(input),
  );
  ipcMain.handle(IpcChannels.hubspotGetStatus, (_event, projectId: string) =>
    hubspot.getStatus(projectId),
  );
  ipcMain.handle(IpcChannels.hubspotRevokeToken, (_event, input: HubSpotEnvironmentInput) =>
    hubspot.revokeToken(input),
  );
  ipcMain.handle(IpcChannels.hubspotSetEnvironment, (_event, input: HubSpotEnvironmentInput) =>
    hubspot.setEnvironment(input),
  );
  ipcMain.handle(IpcChannels.hubspotRequest, (_event, request: HubSpotRequest) =>
    hubspot.request(request),
  );
  ipcMain.handle(IpcChannels.gdriveStartAuth, (event, input: GoogleDriveProjectInput) =>
    gdrive.startAuth(input.projectId, (status) =>
      event.sender.send(IpcChannels.gdriveAuthStatus, status),
    ),
  );
  ipcMain.handle(IpcChannels.gdriveListFolders, (_event, input: GoogleDriveListFoldersInput) =>
    gdrive.listFolders(input.projectId, input.parentId),
  );
  ipcMain.handle(IpcChannels.gdriveSearchFolders, (_event, input: GoogleDriveSearchFoldersInput) =>
    gdrive.searchFolders(input.projectId, input.query),
  );
  ipcMain.handle(IpcChannels.gdriveSetFolder, (_event, input: GoogleDriveSetFolderInput) =>
    gdrive.setFolder(input.projectId, {
      folderId: input.folderId,
      folderName: input.folderName,
      folderPath: input.folderPath,
    }),
  );
  ipcMain.handle(IpcChannels.gdriveGetStatus, (_event, input: GoogleDriveProjectInput) =>
    gdrive.getStatus(input.projectId),
  );
  ipcMain.handle(IpcChannels.gdriveSync, (_event, input: GoogleDriveProjectInput) =>
    gdrive.sync(input.projectId),
  );
  ipcMain.handle(IpcChannels.gdriveRevoke, (_event, input: GoogleDriveProjectInput) =>
    gdrive.revoke(input.projectId),
  );
  ipcMain.handle(IpcChannels.gdriveWriteFile, (_event, input: GoogleDriveWriteFileInput) =>
    gdrive.writeFile(input),
  );
  ipcMain.handle(IpcChannels.gdriveReadFile, (_event, input: GoogleDriveReadFileInput) =>
    gdrive.readFile(input),
  );
  ipcMain.handle(IpcChannels.gdriveGetCredentials, () => gdrive.getCredentialsStatus());
  ipcMain.handle(IpcChannels.gdriveSetCredentials, (_event, input: GoogleCredentialsInput) =>
    gdrive.setCredentials(input),
  );
  ipcMain.handle(IpcChannels.gdriveClearCredentials, () => gdrive.clearCredentials());
  ipcMain.handle(IpcChannels.mcpGetStatus, () => mcp.status());
  ipcMain.handle(IpcChannels.mcpToggle, (_event, enabled: boolean) => mcp.toggle(enabled));
  ipcMain.handle(IpcChannels.mcpRegenerateToken, () => mcp.regenerateToken());
  ipcMain.handle(IpcChannels.mcpListTools, () => mcp.listTools());
  ipcMain.handle(IpcChannels.mcpGetToken, () => ({ token: mcp.getToken() }));
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
  ipcMain.handle(IpcChannels.propertiesApplyChange, (_event, input: ApplyChangeInput) =>
    properties.applyChange(input),
  );
  ipcMain.handle(IpcChannels.propertiesDiscardChange, (_event, input: DiscardChangeInput) =>
    properties.discardChange(input),
  );
  ipcMain.handle(IpcChannels.propertiesExportJson, (_event, input: ExportJsonInput) =>
    properties.exportJson(input),
  );
  ipcMain.handle(IpcChannels.propertiesWriteSheets, async (_event, input: ProjectScopedInput) => {
    const entries = properties.listEntries({ projectId: input.projectId });
    const origins = properties.listOrigins(input);
    const tabs = buildPropertyMapTabs(entries, origins, new Date().toISOString());
    const result = await gdrive.writeSpreadsheet({
      projectId: input.projectId,
      name: 'Mapa de propiedades CRM',
      featureKey: PROPERTY_MAP_FEATURE_KEY,
      schemaVersion: SHEETS_SCHEMA_VERSION,
      tabs,
    });
    if (result.success) {
      await gdrive.writeFile({
        projectId: input.projectId,
        featureKey: PROPERTY_STATE_FEATURE_KEY,
        content: serializePropertyState({ entries, origins }),
      });
      properties.markDriveWritten(input);
    }
    return result;
  });
  ipcMain.handle(
    IpcChannels.propertiesLoadSheets,
    async (_event, input: ProjectScopedInput): Promise<LoadSheetsResult> => {
      const read = await gdrive.readFile({
        projectId: input.projectId,
        featureKey: PROPERTY_STATE_FEATURE_KEY,
      });
      if (!read.success || !read.content) {
        return { success: false, error: read.error ?? 'No hay documento de estado en Drive.' };
      }
      try {
        const state = parsePropertyState(read.content);
        properties.applyDriveState(input, { entries: state.entries, origins: state.origins });
        return { success: true, schemaVersion: state.schemaVersion };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error al cargar' };
      }
    },
  );
  ipcMain.handle(IpcChannels.propertiesDriveMeta, (_event, input: ProjectScopedInput) =>
    properties.getDriveMeta(input),
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
  ipcMain.handle(
    IpcChannels.customObjectsWriteSheets,
    async (_event, input: ObjectsListSchemasInput) => {
      const objects = customObjects.listDefinitions(input);
      const tabs = buildCustomObjectsTabs(objects, new Date().toISOString());
      const result = await gdrive.writeSpreadsheet({
        projectId: input.projectId,
        name: 'Objetos custom',
        featureKey: CUSTOM_OBJECTS_FEATURE_KEY,
        schemaVersion: CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION,
        tabs,
      });
      if (result.success) {
        await gdrive.writeFile({
          projectId: input.projectId,
          featureKey: CUSTOM_OBJECTS_STATE_FEATURE_KEY,
          content: serializeCustomObjectsState({ objects }),
        });
        customObjects.markDriveWritten(input);
      }
      return result;
    },
  );
  ipcMain.handle(
    IpcChannels.customObjectsLoadSheets,
    async (_event, input: ObjectsListSchemasInput): Promise<LoadSheetsResult> => {
      const read = await gdrive.readFile({
        projectId: input.projectId,
        featureKey: CUSTOM_OBJECTS_STATE_FEATURE_KEY,
      });
      if (!read.success || !read.content) {
        return { success: false, error: read.error ?? 'No hay documento de estado en Drive.' };
      }
      try {
        const state = parseCustomObjectsState(read.content);
        customObjects.applyDriveState(input, { objects: state.objects });
        return { success: true, schemaVersion: state.schemaVersion };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error al cargar' };
      }
    },
  );
  ipcMain.handle(IpcChannels.customObjectsDriveMeta, (_event, input: ObjectsListSchemasInput) =>
    customObjects.getDriveMeta(input),
  );
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
  ipcMain.handle(IpcChannels.formsWriteSheets, async (_event, input: FormsListInput) => {
    const formsList = forms.listForms(input);
    const links = forms.listLinks(input);
    const reports = formsList.flatMap((form) =>
      forms.coverage({ projectId: input.projectId, formId: form.id }),
    );
    const tabs = buildFormsTabs(
      formsList,
      links,
      reports,
      properties.listOrigins(input),
      new Date().toISOString(),
    );
    const result = await gdrive.writeSpreadsheet({
      projectId: input.projectId,
      name: 'Formularios HubSpot',
      featureKey: FORMS_FEATURE_KEY,
      schemaVersion: FORMS_SHEETS_SCHEMA_VERSION,
      tabs,
    });
    if (result.success) {
      await gdrive.writeFile({
        projectId: input.projectId,
        featureKey: FORMS_STATE_FEATURE_KEY,
        content: serializeFormsState({ forms: formsList, links }),
      });
      forms.markDriveWritten(input);
    }
    return result;
  });
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
  ipcMain.handle(IpcChannels.formsDriveMeta, (_event, input: FormsListInput) =>
    forms.getDriveMeta(input),
  );

  return mcp;
}

function applyContentSecurityPolicy(): void {
  if (!app.isPackaged) return;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
        ],
      },
    });
  });
}

void app.whenReady().then(() => {
  loadEnv();
  applyContentSecurityPolicy();
  mcpService = registerIpcHandlers();
  registerUpdaterEvents(() => mainWindow);

  mainWindow = createMainWindow();
  checkForUpdates();
  void mcpService.autostart();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  void mcpService?.stop();
});
