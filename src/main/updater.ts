import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';
import { IpcChannels, type UpdaterStatus } from '@shared/types/ipc';

type WindowGetter = () => BrowserWindow | null;

export function emitStatus(getWindow: WindowGetter, status: UpdaterStatus): void {
  getWindow()?.webContents.send(IpcChannels.updaterStatus, status);
}

export function registerUpdaterEvents(getWindow: WindowGetter): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => emitStatus(getWindow, { state: 'checking' }));
  autoUpdater.on('update-available', (info) =>
    emitStatus(getWindow, { state: 'available', version: info.version }),
  );
  autoUpdater.on('update-not-available', () => emitStatus(getWindow, { state: 'not-available' }));
  autoUpdater.on('download-progress', (progress) =>
    emitStatus(getWindow, { state: 'downloading', percent: Math.round(progress.percent) }),
  );
  autoUpdater.on('update-downloaded', (info) =>
    emitStatus(getWindow, { state: 'downloaded', version: info.version }),
  );
  autoUpdater.on('error', (error) =>
    emitStatus(getWindow, { state: 'error', message: error?.message ?? 'unknown error' }),
  );
}

export function checkForUpdates(): void {
  // El handler 'error' propaga cualquier fallo al renderer; aquí solo evitamos rechazos no capturados.
  void autoUpdater.checkForUpdates().catch(() => undefined);
}
