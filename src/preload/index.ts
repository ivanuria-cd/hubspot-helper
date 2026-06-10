import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannels, type RevOpsApi, type UpdaterStatus } from '@shared/types/ipc';

const api: RevOpsApi = {
  getVersion: () => ipcRenderer.invoke(IpcChannels.appGetVersion),
  checkForUpdates: () => ipcRenderer.invoke(IpcChannels.updaterCheck),
  onUpdaterStatus: (callback) => {
    const listener = (_event: IpcRendererEvent, status: UpdaterStatus) => callback(status);
    ipcRenderer.on(IpcChannels.updaterStatus, listener);
    return () => ipcRenderer.removeListener(IpcChannels.updaterStatus, listener);
  },
  getLanguage: () => ipcRenderer.invoke(IpcChannels.settingsGetLanguage),
  setLanguage: (language) => ipcRenderer.invoke(IpcChannels.settingsSetLanguage, language),
  listProjects: () => ipcRenderer.invoke(IpcChannels.projectsList),
  createProject: (input) => ipcRenderer.invoke(IpcChannels.projectsCreate, input),
  updateProject: (project) => ipcRenderer.invoke(IpcChannels.projectsUpdate, project),
  deleteProject: (id) => ipcRenderer.invoke(IpcChannels.projectsDelete, id),
  setActiveProject: (id) => ipcRenderer.invoke(IpcChannels.projectsSetActive, id),
  hubspotSaveToken: (input) => ipcRenderer.invoke(IpcChannels.hubspotSaveToken, input),
  hubspotGetStatus: (projectId) => ipcRenderer.invoke(IpcChannels.hubspotGetStatus, projectId),
  hubspotRevokeToken: (input) => ipcRenderer.invoke(IpcChannels.hubspotRevokeToken, input),
  hubspotSetEnvironment: (input) => ipcRenderer.invoke(IpcChannels.hubspotSetEnvironment, input),
  hubspotRequest: (request) => ipcRenderer.invoke(IpcChannels.hubspotRequest, request),
};

contextBridge.exposeInMainWorld('api', api);
