import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannels, type RevOpsApi, type UpdaterStatus } from '@shared/types/ipc';
import type { GoogleDriveAuthStatus } from '@shared/types/gdrive';

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
  gdriveStartAuth: (input) => ipcRenderer.invoke(IpcChannels.gdriveStartAuth, input),
  onGdriveAuthStatus: (callback) => {
    const listener = (_event: IpcRendererEvent, status: GoogleDriveAuthStatus) => callback(status);
    ipcRenderer.on(IpcChannels.gdriveAuthStatus, listener);
    return () => ipcRenderer.removeListener(IpcChannels.gdriveAuthStatus, listener);
  },
  gdriveListFolders: (input) => ipcRenderer.invoke(IpcChannels.gdriveListFolders, input),
  gdriveSearchFolders: (input) => ipcRenderer.invoke(IpcChannels.gdriveSearchFolders, input),
  gdriveSetFolder: (input) => ipcRenderer.invoke(IpcChannels.gdriveSetFolder, input),
  gdriveGetStatus: (input) => ipcRenderer.invoke(IpcChannels.gdriveGetStatus, input),
  gdriveSync: (input) => ipcRenderer.invoke(IpcChannels.gdriveSync, input),
  gdriveRevoke: (input) => ipcRenderer.invoke(IpcChannels.gdriveRevoke, input),
  gdriveWriteFile: (input) => ipcRenderer.invoke(IpcChannels.gdriveWriteFile, input),
  gdriveReadFile: (input) => ipcRenderer.invoke(IpcChannels.gdriveReadFile, input),
  gdriveGetCredentialsStatus: () => ipcRenderer.invoke(IpcChannels.gdriveGetCredentials),
  gdriveSetCredentials: (input) => ipcRenderer.invoke(IpcChannels.gdriveSetCredentials, input),
  gdriveClearCredentials: () => ipcRenderer.invoke(IpcChannels.gdriveClearCredentials),
  mcpGetStatus: () => ipcRenderer.invoke(IpcChannels.mcpGetStatus),
  mcpToggle: (enabled) => ipcRenderer.invoke(IpcChannels.mcpToggle, enabled),
  mcpRegenerateToken: () => ipcRenderer.invoke(IpcChannels.mcpRegenerateToken),
  mcpListTools: () => ipcRenderer.invoke(IpcChannels.mcpListTools),
  mcpGetToken: () => ipcRenderer.invoke(IpcChannels.mcpGetToken),
  objectsList: (input) => ipcRenderer.invoke(IpcChannels.objectsList, input),
  hubspotPropertiesList: (input) => ipcRenderer.invoke(IpcChannels.hubspotPropertiesList, input),
  groupsList: (input) => ipcRenderer.invoke(IpcChannels.groupsList, input),
  groupsCreate: (input) => ipcRenderer.invoke(IpcChannels.groupsCreate, input),
  entriesList: (input) => ipcRenderer.invoke(IpcChannels.entriesList, input),
  entriesUpsert: (input) => ipcRenderer.invoke(IpcChannels.entriesUpsert, input),
  entriesDelete: (input) => ipcRenderer.invoke(IpcChannels.entriesDelete, input),
  propertiesSyncHubspot: (input) => ipcRenderer.invoke(IpcChannels.propertiesSyncHubspot, input),
  propertiesApplyChange: (input) => ipcRenderer.invoke(IpcChannels.propertiesApplyChange, input),
  propertiesDiscardChange: (input) =>
    ipcRenderer.invoke(IpcChannels.propertiesDiscardChange, input),
  propertiesExportJson: (input) => ipcRenderer.invoke(IpcChannels.propertiesExportJson, input),
  propertiesWriteSheets: (input) => ipcRenderer.invoke(IpcChannels.propertiesWriteSheets, input),
  propertiesLoadSheets: (input) => ipcRenderer.invoke(IpcChannels.propertiesLoadSheets, input),
  propertiesDriveMeta: (input) => ipcRenderer.invoke(IpcChannels.propertiesDriveMeta, input),
  originsList: (input) => ipcRenderer.invoke(IpcChannels.originsList, input),
  originsCreate: (input) => ipcRenderer.invoke(IpcChannels.originsCreate, input),
  originsUpdate: (input) => ipcRenderer.invoke(IpcChannels.originsUpdate, input),
  originsDelete: (input) => ipcRenderer.invoke(IpcChannels.originsDelete, input),
  objectsListSchemas: (input) => ipcRenderer.invoke(IpcChannels.objectsListSchemas, input),
  objectsGetSchema: (input) => ipcRenderer.invoke(IpcChannels.objectsGetSchema, input),
  objectsUpsertDraft: (input) => ipcRenderer.invoke(IpcChannels.objectsUpsertDraft, input),
  objectsRequestArchive: (input) => ipcRenderer.invoke(IpcChannels.objectsRequestArchive, input),
  objectsDeleteDraft: (input) => ipcRenderer.invoke(IpcChannels.objectsDeleteDraft, input),
  objectsSyncHubspot: (input) => ipcRenderer.invoke(IpcChannels.objectsSyncHubspot, input),
  objectsApplyChange: (input) => ipcRenderer.invoke(IpcChannels.objectsApplyChange, input),
  objectsDiscardChange: (input) => ipcRenderer.invoke(IpcChannels.objectsDiscardChange, input),
  customObjectsWriteSheets: (input) =>
    ipcRenderer.invoke(IpcChannels.customObjectsWriteSheets, input),
  customObjectsLoadSheets: (input) =>
    ipcRenderer.invoke(IpcChannels.customObjectsLoadSheets, input),
  customObjectsDriveMeta: (input) =>
    ipcRenderer.invoke(IpcChannels.customObjectsDriveMeta, input),
  formsList: (input) => ipcRenderer.invoke(IpcChannels.formsList, input),
  formsPendingChanges: (input) => ipcRenderer.invoke(IpcChannels.formsPendingChanges, input),
  formsSyncHubspot: (input) => ipcRenderer.invoke(IpcChannels.formsSyncHubspot, input),
  formsGet: (input) => ipcRenderer.invoke(IpcChannels.formsGet, input),
  formsCreateDefinition: (input) => ipcRenderer.invoke(IpcChannels.formsCreateDefinition, input),
  formsCoverage: (input) => ipcRenderer.invoke(IpcChannels.formsCoverage, input),
  formsAddMissingFields: (input) => ipcRenderer.invoke(IpcChannels.formsAddMissingFields, input),
  formsApplyChange: (input) => ipcRenderer.invoke(IpcChannels.formsApplyChange, input),
  formsDiscardChange: (input) => ipcRenderer.invoke(IpcChannels.formsDiscardChange, input),
  formLinksList: (input) => ipcRenderer.invoke(IpcChannels.formLinksList, input),
  formLinksUpsert: (input) => ipcRenderer.invoke(IpcChannels.formLinksUpsert, input),
  formLinksDelete: (input) => ipcRenderer.invoke(IpcChannels.formLinksDelete, input),
  formsWriteSheets: (input) => ipcRenderer.invoke(IpcChannels.formsWriteSheets, input),
  formsLoadSheets: (input) => ipcRenderer.invoke(IpcChannels.formsLoadSheets, input),
  formsDriveMeta: (input) => ipcRenderer.invoke(IpcChannels.formsDriveMeta, input),
};

contextBridge.exposeInMainWorld('api', api);
