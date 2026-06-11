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
import type { SupportedLanguage } from '@shared/i18n/languages';
import type { NewProjectInput, Project } from '@shared/types/project';
import type {
  HubSpotEnvironmentInput,
  HubSpotRequest,
  HubSpotSaveTokenInput,
} from '@shared/types/hubspot';
import type {
  GoogleDriveProjectInput,
  GoogleDriveReadFileInput,
  GoogleDriveWriteFileInput,
} from '@shared/types/gdrive';
import type {
  ApplyChangeInput,
  DiscardChangeInput,
  ExportJsonInput,
  MappingDeleteInput,
  MappingUpsertInput,
  MappingsListInput,
  OriginCreateInput,
  OriginDeleteInput,
  OriginUpdateInput,
  ProjectScopedInput,
  PropertyUpsertInput,
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

  const properties = createElectronPropertyService({
    hubspot,
    gdrive,
    projectName: (projectId) => projects.list().find((p) => p.id === projectId)?.name ?? '',
  });
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
  ipcMain.handle(IpcChannels.gdriveSelectFolder, (_event, input: GoogleDriveProjectInput) =>
    gdrive.selectFolder(input.projectId),
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
  ipcMain.handle(IpcChannels.mcpGetStatus, () => mcp.status());
  ipcMain.handle(IpcChannels.mcpToggle, (_event, enabled: boolean) => mcp.toggle(enabled));
  ipcMain.handle(IpcChannels.mcpRegenerateToken, () => mcp.regenerateToken());
  ipcMain.handle(IpcChannels.mcpListTools, () => mcp.listTools());
  ipcMain.handle(IpcChannels.mcpGetToken, () => ({ token: mcp.getToken() }));
  ipcMain.handle(IpcChannels.propertiesList, (_event, input: ProjectScopedInput) =>
    properties.listProperties(input),
  );
  ipcMain.handle(IpcChannels.propertiesUpsert, (_event, input: PropertyUpsertInput) =>
    properties.upsertProperty(input),
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
  ipcMain.handle(IpcChannels.mappingsList, (_event, input: MappingsListInput) =>
    properties.listMappings(input),
  );
  ipcMain.handle(IpcChannels.mappingsUpsert, (_event, input: MappingUpsertInput) =>
    properties.upsertMapping(input),
  );
  ipcMain.handle(IpcChannels.mappingsDelete, (_event, input: MappingDeleteInput) =>
    properties.deleteMapping(input),
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
