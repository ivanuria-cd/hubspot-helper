import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { IpcChannels } from '@shared/types/ipc';
import {
  applyImport,
  buildArchiveEntries,
  buildImportSummary,
  createSectionRegistry,
  packZip,
  readManifest,
  unpackZip,
} from './project-file';
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
  PROPERTY_STATE_SCHEMA_VERSION,
  parsePropertyState,
  serializePropertyState,
  type PropertyDriveState,
} from './property-management/drive-state';
import {
  FORMS_STATE_FEATURE_KEY,
  FORMS_STATE_SCHEMA_VERSION,
  parseFormsState,
  serializeFormsState,
  type FormsDriveState,
} from './forms-management/drive-state';
import {
  buildCustomObjectsTabs,
  CUSTOM_OBJECTS_FEATURE_KEY,
  CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION,
} from './custom-objects/sheets-model';
import {
  CUSTOM_OBJECTS_STATE_FEATURE_KEY,
  CUSTOM_OBJECTS_STATE_SCHEMA_VERSION,
  parseCustomObjectsState,
  serializeCustomObjectsState,
  type CustomObjectsDriveState,
} from './custom-objects/drive-state';
import type { DriveDocMeta, LoadSheetsResult } from '@shared/types/gdrive';
import { refreshDrive, type RefreshFeature } from './drive-refresh';
import type { SupportedLanguage } from '@shared/i18n/languages';
import type { NewProjectInput, Project } from '@shared/types/project';
import type {
  ExportProjectInput,
  ImportApplyInput,
  ImportValidateInput,
} from '@shared/types/project-file';
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
  ConvertEntryInput,
  ConvertMissingInput,
  DiscardChangeInput,
  EntriesListInput,
  EntryDeleteInput,
  EntryUpsertInput,
  ExportJsonInput,
  GroupApplyChangeInput,
  GroupChangesListInput,
  GroupCreateInput,
  GroupDeleteRequestInput,
  GroupDiscardChangeInput,
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
  FormEditPendingChangeInput,
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

  ipcMain.handle(IpcChannels.projectsExportDialog, async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'Proyecto RevOps', extensions: ['rvproj'] }],
    });
    return result.canceled || !result.filePath ? null : result.filePath;
  });
  ipcMain.handle(IpcChannels.projectsExport, async (_event, input: ExportProjectInput) => {
    const project = projects.list().find((p) => p.id === input.projectId);
    if (!project) return { success: false, error: 'Proyecto no encontrado.' };
    try {
      const entries = buildArchiveEntries(
        project,
        projectFileRegistry,
        app.getVersion(),
        new Date().toISOString(),
      );
      await writeFile(input.filePath, packZip(entries));
      return { success: true, filePath: input.filePath };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error al exportar' };
    }
  });
  ipcMain.handle(IpcChannels.projectsImportDialog, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Proyecto RevOps', extensions: ['rvproj'] }],
    });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });
  ipcMain.handle(IpcChannels.projectsImportValidate, async (_event, input: ImportValidateInput) => {
    const buffer = await readFile(input.filePath);
    const entries = unpackZip(buffer);
    const manifest = readManifest(entries);
    return buildImportSummary(
      manifest,
      entries,
      projectFileRegistry,
      projects.list().map((p) => p.id),
    );
  });
  ipcMain.handle(IpcChannels.projectsImportApply, async (_event, input: ImportApplyInput) => {
    const buffer = await readFile(input.filePath);
    const entries = unpackZip(buffer);
    const manifest = readManifest(entries);
    const built = applyImport(manifest, entries, projectFileRegistry, {
      strategy: input.strategy,
      newId: () => randomUUID(),
      now: new Date().toISOString(),
    });
    const saved = projects.upsert(built);
    activeProjectId = saved.id;
    return saved;
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
  ipcMain.handle(IpcChannels.groupRequestDelete, (_event, input: GroupDeleteRequestInput) =>
    properties.requestGroupDelete(input),
  );
  ipcMain.handle(IpcChannels.groupChanges, (_event, input: GroupChangesListInput) =>
    properties.listGroupChanges(input),
  );
  ipcMain.handle(IpcChannels.groupApplyChange, (_event, input: GroupApplyChangeInput) =>
    properties.applyGroupChange(input),
  );
  ipcMain.handle(IpcChannels.groupDiscardChange, (_event, input: GroupDiscardChangeInput) =>
    properties.discardGroupChange(input),
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
  ipcMain.handle(IpcChannels.propertiesConvertToNew, (_event, input: ConvertEntryInput) =>
    properties.convertEntryToNew(input),
  );
  ipcMain.handle(IpcChannels.propertiesConvertMissingToNew, (_event, input: ConvertMissingInput) =>
    properties.convertMissingToNew(input),
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
  async function writePropertiesSheets(projectId: string) {
    const entries = properties.listEntries({ projectId });
    const origins = properties.listOrigins({ projectId });
    const tabs = buildPropertyMapTabs(entries, origins, new Date().toISOString());
    const result = await gdrive.writeSpreadsheet({
      projectId,
      name: 'Mapa de propiedades CRM',
      featureKey: PROPERTY_MAP_FEATURE_KEY,
      schemaVersion: SHEETS_SCHEMA_VERSION,
      tabs,
    });
    if (result.success) {
      // SPEC-0004 §21: la escritura del par Sheets+estado es atómica para el usuario. Si el documento
      // de estado no se escribe, no se marca como «al día» y se propaga el error.
      const stateWrite = await gdrive.writeFile({
        projectId,
        featureKey: PROPERTY_STATE_FEATURE_KEY,
        content: serializePropertyState({ entries, origins }),
      });
      if (!stateWrite.success) {
        return { success: false, error: stateWrite.error ?? 'No se pudo escribir el documento de estado en Drive.' };
      }
      properties.markDriveWritten({ projectId });
    }
    return result;
  }
  ipcMain.handle(IpcChannels.propertiesWriteSheets, (_event, input: ProjectScopedInput) =>
    writePropertiesSheets(input.projectId),
  );
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
  const managedSpreadsheetId = (projectId: string, featureKey: string): string | null => {
    const config = gdrive.getStatus(projectId);
    const file = (config?.files ?? []).find((f) => f.featureKey === featureKey);
    return file?.driveId ?? null;
  };
  const isDriveDocStale = (meta: DriveDocMeta, fileId: string | null): boolean =>
    fileId === null ||
    meta.lastWrittenAt === null ||
    (meta.lastChangedAt !== null && meta.lastChangedAt > meta.lastWrittenAt);
  const buildRefreshFeatures = (projectId: string): RefreshFeature[] => [
    {
      featureKey: PROPERTY_MAP_FEATURE_KEY,
      name: 'Mapa de propiedades CRM',
      hasData: () => properties.listEntries({ projectId }).length > 0,
      isStale: () =>
        isDriveDocStale(properties.getDriveMeta({ projectId }), managedSpreadsheetId(projectId, PROPERTY_MAP_FEATURE_KEY)),
      write: () => writePropertiesSheets(projectId),
    },
    {
      featureKey: CUSTOM_OBJECTS_FEATURE_KEY,
      name: 'Objetos custom',
      hasData: () => customObjects.listDefinitions({ projectId }).length > 0,
      isStale: () =>
        isDriveDocStale(customObjects.getDriveMeta({ projectId }), managedSpreadsheetId(projectId, CUSTOM_OBJECTS_FEATURE_KEY)),
      write: () => writeCustomObjectsSheets(projectId),
    },
    {
      featureKey: FORMS_FEATURE_KEY,
      name: 'Formularios HubSpot',
      hasData: () => forms.listForms({ projectId }).length > 0,
      isStale: () =>
        isDriveDocStale(forms.getDriveMeta({ projectId }), managedSpreadsheetId(projectId, FORMS_FEATURE_KEY)),
      write: () => writeFormsSheets(projectId),
    },
  ];
  ipcMain.handle(IpcChannels.gdriveRefreshProject, (_event, input: GoogleDriveProjectInput) => {
    const config = gdrive.getStatus(input.projectId);
    const connected = Boolean(config?.folderId && config?.accountEmail);
    return refreshDrive(connected, buildRefreshFeatures(input.projectId));
  });
  ipcMain.handle(IpcChannels.propertiesDriveMeta, (_event, input: ProjectScopedInput) => ({
    ...properties.getDriveMeta(input),
    fileId: managedSpreadsheetId(input.projectId, PROPERTY_MAP_FEATURE_KEY),
  }));
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
  async function writeCustomObjectsSheets(projectId: string) {
    const objects = customObjects.listDefinitions({ projectId });
    const tabs = buildCustomObjectsTabs(objects, new Date().toISOString());
    const result = await gdrive.writeSpreadsheet({
      projectId,
      name: 'Objetos custom',
      featureKey: CUSTOM_OBJECTS_FEATURE_KEY,
      schemaVersion: CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION,
      tabs,
    });
    if (result.success) {
      // SPEC-0004 §21: escritura atómica del par Sheets+estado (ver writePropertiesSheets).
      const stateWrite = await gdrive.writeFile({
        projectId,
        featureKey: CUSTOM_OBJECTS_STATE_FEATURE_KEY,
        content: serializeCustomObjectsState({ objects }),
      });
      if (!stateWrite.success) {
        return { success: false, error: stateWrite.error ?? 'No se pudo escribir el documento de estado en Drive.' };
      }
      customObjects.markDriveWritten({ projectId });
    }
    return result;
  }
  ipcMain.handle(IpcChannels.customObjectsWriteSheets, (_event, input: ObjectsListSchemasInput) =>
    writeCustomObjectsSheets(input.projectId),
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
  ipcMain.handle(IpcChannels.customObjectsDriveMeta, (_event, input: ObjectsListSchemasInput) => ({
    ...customObjects.getDriveMeta(input),
    fileId: managedSpreadsheetId(input.projectId, CUSTOM_OBJECTS_FEATURE_KEY),
  }));
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
  ipcMain.handle(IpcChannels.formsEditPendingChange, (_event, input: FormEditPendingChangeInput) =>
    forms.updatePendingChange(input),
  );
  ipcMain.handle(IpcChannels.formsSubscriptionTypes, (_event, input: FormsListInput) =>
    forms.listSubscriptionTypes(input),
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
  async function writeFormsSheets(projectId: string) {
    const formsList = forms.listForms({ projectId });
    const links = forms.listLinks({ projectId });
    const reports = formsList.flatMap((form) => forms.coverage({ projectId, formId: form.id }));
    const tabs = buildFormsTabs(
      formsList,
      links,
      reports,
      properties.listOrigins({ projectId }),
      new Date().toISOString(),
    );
    const result = await gdrive.writeSpreadsheet({
      projectId,
      name: 'Formularios HubSpot',
      featureKey: FORMS_FEATURE_KEY,
      schemaVersion: FORMS_SHEETS_SCHEMA_VERSION,
      tabs,
    });
    if (result.success) {
      // SPEC-0004 §21: escritura atómica del par Sheets+estado (ver writePropertiesSheets).
      const stateWrite = await gdrive.writeFile({
        projectId,
        featureKey: FORMS_STATE_FEATURE_KEY,
        content: serializeFormsState({ forms: formsList, links }),
      });
      if (!stateWrite.success) {
        return { success: false, error: stateWrite.error ?? 'No se pudo escribir el documento de estado en Drive.' };
      }
      forms.markDriveWritten({ projectId });
    }
    return result;
  }
  ipcMain.handle(IpcChannels.formsWriteSheets, (_event, input: FormsListInput) =>
    writeFormsSheets(input.projectId),
  );
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
  ipcMain.handle(IpcChannels.formsDriveMeta, (_event, input: FormsListInput) => ({
    ...forms.getDriveMeta(input),
    fileId: managedSpreadsheetId(input.projectId, FORMS_FEATURE_KEY),
  }));

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
