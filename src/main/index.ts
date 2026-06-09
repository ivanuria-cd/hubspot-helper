import { app, BrowserWindow, ipcMain, session } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import { createMainWindow } from './window';
import { checkForUpdates, registerUpdaterEvents } from './updater';
import { getLanguage, setLanguage } from './settings';
import { createElectronProjectsService } from './projects';
import type { SupportedLanguage } from '@shared/i18n/languages';
import type { NewProjectInput, Project } from '@shared/types/project';

let mainWindow: BrowserWindow | null = null;

function registerIpcHandlers(): void {
  const projects = createElectronProjectsService();

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
  ipcMain.handle(IpcChannels.projectsSetActive, (_event, id: string) => projects.setActive(id));
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
  applyContentSecurityPolicy();
  registerIpcHandlers();
  registerUpdaterEvents(() => mainWindow);

  mainWindow = createMainWindow();
  checkForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
