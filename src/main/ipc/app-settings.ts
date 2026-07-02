/** Handlers IPC de app/updater/idioma (SPEC-0002). Extraído de `index.ts` (SPEC-0002 §23). */
import { app, ipcMain } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import type { SupportedLanguage } from '@shared/i18n/languages';
import { checkForUpdates } from '../updater';
import { getLanguage, setLanguage } from '../settings';

export function registerAppSettingsIpc(): void {
  ipcMain.handle(IpcChannels.appGetVersion, () => app.getVersion());
  ipcMain.handle(IpcChannels.updaterCheck, () => checkForUpdates());
  ipcMain.handle(IpcChannels.settingsGetLanguage, () => getLanguage());
  ipcMain.handle(IpcChannels.settingsSetLanguage, (_event, language: SupportedLanguage) =>
    setLanguage(language),
  );
}
