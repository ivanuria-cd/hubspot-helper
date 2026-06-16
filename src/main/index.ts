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
import {
  buildPropertyMapTabs,
  PROPERTY_MAP_FEATURE_KEY,
  SHEETS_SCHEMA_VERSION,
} from './property-management/sheets-model';
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
  ipcMain.handle(IpcChannels.propertiesWriteSheets, (_event, input: ProjectScopedInput) => {
    const tabs = buildPropertyMapTabs(
      properties.listEntries({ projectId: input.projectId }),
      properties.listOrigins(input),
      new Date().toISOString(),
    );
    return gdrive.writeSpreadsheet({
      projectId: input.projectId,
      name: 'Mapa de propiedades CRM',
      featureKey: PROPERTY_MAP_FEATURE_KEY,
      schemaVersion: SHEETS_SCHEMA_VERSION,
      tabs,
    });
  });
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
