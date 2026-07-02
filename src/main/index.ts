import { app, BrowserWindow, session } from 'electron';
import { createSectionRegistry } from './project-file';
import { createMainWindow } from './window';
import { loadEnv } from './env';
import { checkForUpdates, registerUpdaterEvents } from './updater';
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
import { PROPERTY_STATE_SCHEMA_VERSION, type PropertyDriveState } from './property-management/drive-state';
import {
  CUSTOM_OBJECTS_STATE_SCHEMA_VERSION,
  type CustomObjectsDriveState,
} from './custom-objects/drive-state';
import { FORMS_STATE_SCHEMA_VERSION, type FormsDriveState } from './forms-management/drive-state';
import { createDriveDocs } from './drive-docs';
import { registerAppSettingsIpc } from './ipc/app-settings';
import { registerProjectsIpc } from './ipc/projects';
import { registerHubspotIpc } from './ipc/hubspot';
import { registerGdriveIpc } from './ipc/gdrive';
import { registerMcpIpc } from './ipc/mcp';
import { registerPropertiesIpc } from './ipc/properties';
import { registerCustomObjectsIpc } from './ipc/custom-objects';
import { registerFormsIpc } from './ipc/forms';

let mainWindow: BrowserWindow | null = null;
let mcpService: ReturnType<typeof createElectronMcpService> | null = null;

/**
 * Cablea servicios, tools MCP y handlers IPC (SPEC-0002 §23: los handlers viven por feature en
 * `./ipc/*`; la escritura de documentos Drive companion, en `./drive-docs`).
 */
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

  // Registro de secciones del archivo de proyecto portable (SPEC-0013).
  const projectFileRegistry = createSectionRegistry();
  projectFileRegistry.register({
    featureKey: 'property-management',
    currentSchemaVersion: PROPERTY_STATE_SCHEMA_VERSION,
    collect: (projectId) => ({
      entries: properties.listEntries({ projectId }),
      origins: properties.listOrigins({ projectId }),
    }),
    apply: (projectId, data) =>
      properties.applyDriveState({ projectId }, data as PropertyDriveState),
  });
  projectFileRegistry.register({
    featureKey: 'custom-objects',
    currentSchemaVersion: CUSTOM_OBJECTS_STATE_SCHEMA_VERSION,
    collect: (projectId) => ({ objects: customObjects.listDefinitions({ projectId }) }),
    apply: (projectId, data) =>
      customObjects.applyDriveState({ projectId }, data as CustomObjectsDriveState),
  });
  projectFileRegistry.register({
    featureKey: 'forms-management',
    currentSchemaVersion: FORMS_STATE_SCHEMA_VERSION,
    collect: (projectId) => ({
      forms: forms.listForms({ projectId }),
      links: forms.listLinks({ projectId }),
    }),
    apply: (projectId, data) => forms.applyDriveState({ projectId }, data as FormsDriveState),
  });

  const driveDocs = createDriveDocs({ gdrive, properties, customObjects, forms });

  registerAppSettingsIpc();
  registerProjectsIpc({
    projects,
    projectFileRegistry,
    onActiveProjectChanged: (id) => {
      activeProjectId = id;
    },
  });
  registerHubspotIpc(hubspot);
  registerGdriveIpc({ gdrive, driveDocs });
  registerMcpIpc(mcp);
  registerPropertiesIpc({ properties, gdrive, driveDocs });
  registerCustomObjectsIpc({ customObjects, gdrive, driveDocs });
  registerFormsIpc({ forms, gdrive, driveDocs });

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

// SPEC-0005 §17: se espera el cierre del servidor MCP antes de salir (antes era fire-and-forget).
let mcpStopped = false;
app.on('before-quit', (event) => {
  if (mcpStopped || !mcpService) return;
  event.preventDefault();
  const finish = (): void => {
    mcpStopped = true;
    app.quit();
  };
  Promise.race([
    mcpService.stop(),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]).then(finish, finish);
});
