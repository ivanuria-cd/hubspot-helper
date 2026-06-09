/**
 * Contrato IPC público entre renderer y main.
 * Cualquier cambio aquí afecta a preload, main y renderer simultáneamente.
 */
import type { SupportedLanguage } from '@shared/i18n/languages';
import type { NewProjectInput, Project } from '@shared/types/project';

export const IpcChannels = {
  appGetVersion: 'app:get-version',
  updaterCheck: 'updater:check',
  updaterStatus: 'updater:status',
  settingsGetLanguage: 'settings:get-language',
  settingsSetLanguage: 'settings:set-language',
  projectsList: 'projects:list',
  projectsCreate: 'projects:create',
  projectsUpdate: 'projects:update',
  projectsDelete: 'projects:delete',
  projectsSetActive: 'projects:set-active',
} as const;

export type UpdaterStatus =
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string };

/** API expuesta en `window.api` vía contextBridge. */
export interface RevOpsApi {
  getVersion(): Promise<string>;
  checkForUpdates(): Promise<void>;
  onUpdaterStatus(callback: (status: UpdaterStatus) => void): () => void;
  getLanguage(): Promise<SupportedLanguage>;
  setLanguage(language: SupportedLanguage): Promise<void>;
  listProjects(): Promise<Project[]>;
  createProject(input: NewProjectInput): Promise<Project>;
  updateProject(project: Project): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  setActiveProject(id: string): Promise<Project>;
}
