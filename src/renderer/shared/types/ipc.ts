/**
 * Contrato IPC público entre renderer y main.
 * Cualquier cambio aquí afecta a preload, main y renderer simultáneamente.
 */
import type { SupportedLanguage } from '@shared/i18n/languages';
import type { NewProjectInput, Project } from '@shared/types/project';
import type {
  ExportProjectInput,
  ExportProjectResult,
  ImportApplyInput,
  ImportSummary,
  ImportValidateInput,
} from '@shared/types/project-file';
import type {
  HubSpotConfig,
  HubSpotEnvironmentInput,
  HubSpotOperationResult,
  HubSpotRequest,
  HubSpotResponse,
  HubSpotSaveTokenInput,
  HubSpotSaveTokenResult,
} from '@shared/types/hubspot';
import type {
  DriveDocMeta,
  DriveFolder,
  GoogleCredentialsInput,
  GoogleCredentialsStatus,
  GoogleDriveAuthStatus,
  GoogleDriveConfig,
  GoogleDriveFolderResult,
  GoogleDriveListFoldersInput,
  GoogleDriveOperationResult,
  GoogleDriveProjectInput,
  GoogleDriveReadFileInput,
  GoogleDriveReadFileResult,
  GoogleDriveSearchFoldersInput,
  GoogleDriveSetFolderInput,
  GoogleDriveSyncResult,
  GoogleDriveRefreshResult,
  GoogleDriveWriteFileInput,
  GoogleDriveWriteFileResult,
  LoadSheetsResult,
} from '@shared/types/gdrive';
import type {
  McpOperationResult,
  McpStatus,
  McpTokenResult,
  McpToolSummary,
} from '@shared/types/mcp';
import type {
  ApplyChangeInput,
  ApplyChangeResult,
  DataOrigin,
  DiscardChangeInput,
  EntriesListInput,
  EntryDeleteInput,
  EntryUpsertInput,
  ExportJsonInput,
  GroupApplyChangeInput,
  GroupChangesListInput,
  GroupCreateInput,
  GroupDeleteChange,
  GroupDeleteRequestInput,
  GroupDiscardChangeInput,
  GroupsListInput,
  ConvertEntryInput,
  ConvertEntryResult,
  ConvertMissingInput,
  ConvertMissingResult,
  HubSpotGroup,
  HubSpotObject,
  HubSpotPropertiesInput,
  HubSpotPropertyDef,
  OperationResult,
  OriginCreateInput,
  OriginDeleteInput,
  OriginExport,
  OriginSetObjectFieldsInput,
  OriginUpdateInput,
  ProjectScopedInput,
  PropertiesSyncResult,
  PropertyEntry,
  WriteSheetsResult,
} from '@shared/types/properties';
import type {
  CustomObjectDefinition,
  CustomObjectsSyncResult,
  ObjectApplyChangeInput,
  ObjectChangeResult,
  ObjectDeleteDraftInput,
  ObjectDiscardChangeInput,
  ObjectGetSchemaInput,
  ObjectsListSchemasInput,
  ObjectUpsertDraftInput,
} from '@shared/types/custom-objects';
import type {
  FormAddMissingFieldsInput,
  FormApplyChangeInput,
  FormApplyChangeResult,
  FormChange,
  FormCoverageInput,
  FormCoverageReport,
  FormCreateDefinitionInput,
  FormDiscardChangeInput,
  FormEditPendingChangeInput,
  FormGetInput,
  FormLinkDeleteInput,
  FormLinksListInput,
  FormLinkUpsertInput,
  FormOriginLink,
  FormsListInput,
  FormsOperationResult,
  FormsSyncInput,
  FormsSyncResult,
  FormsWriteSheetsResult,
  FormUpdateDefinitionInput,
  HubSpotForm,
  SubscriptionType,
} from '@shared/types/forms';

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
  projectsExport: 'projects:export',
  projectsExportDialog: 'projects:export-dialog',
  projectsImportValidate: 'projects:import-validate',
  projectsImportApply: 'projects:import-apply',
  projectsImportDialog: 'projects:import-dialog',
  hubspotSaveToken: 'hubspot:save-token',
  hubspotGetStatus: 'hubspot:get-status',
  hubspotRevokeToken: 'hubspot:revoke-token',
  hubspotSetEnvironment: 'hubspot:set-environment',
  hubspotRequest: 'hubspot:request',
  gdriveStartAuth: 'gdrive:start-auth',
  gdriveAuthStatus: 'gdrive:auth-status',
  gdriveListFolders: 'gdrive:list-folders',
  gdriveSearchFolders: 'gdrive:search-folders',
  gdriveSetFolder: 'gdrive:set-folder',
  gdriveGetStatus: 'gdrive:get-status',
  gdriveSync: 'gdrive:sync',
  gdriveRevoke: 'gdrive:revoke',
  gdriveWriteFile: 'gdrive:write-file',
  gdriveReadFile: 'gdrive:read-file',
  gdriveGetCredentials: 'gdrive:get-credentials-status',
  gdriveSetCredentials: 'gdrive:set-credentials',
  gdriveClearCredentials: 'gdrive:clear-credentials',
  gdriveRefreshProject: 'gdrive:refresh-project',
  mcpGetStatus: 'mcp:get-status',
  mcpToggle: 'mcp:toggle',
  mcpRegenerateToken: 'mcp:regenerate-token',
  mcpListTools: 'mcp:list-tools',
  mcpGetToken: 'mcp:get-token',
  objectsList: 'objects:list',
  hubspotPropertiesList: 'properties:hubspot-list',
  groupsList: 'groups:list',
  groupsCreate: 'groups:create',
  groupRequestDelete: 'groups:request-delete',
  groupChanges: 'groups:changes',
  groupApplyChange: 'groups:apply-change',
  groupDiscardChange: 'groups:discard-change',
  entriesList: 'entries:list',
  entriesUpsert: 'entries:upsert',
  entriesDelete: 'entries:delete',
  propertiesSyncHubspot: 'properties:sync-hubspot',
  propertiesConvertToNew: 'properties:convert-to-new',
  propertiesConvertMissingToNew: 'properties:convert-missing-to-new',
  propertiesApplyChange: 'properties:apply-change',
  propertiesDiscardChange: 'properties:discard-change',
  propertiesExportJson: 'properties:export-json',
  propertiesWriteSheets: 'properties:write-sheets',
  propertiesWritePlanningMap: 'properties:write-planning-map',
  propertiesLoadSheets: 'properties:load-sheets',
  propertiesDriveMeta: 'properties:drive-meta',
  originsList: 'origins:list',
  originsCreate: 'origins:create',
  originsUpdate: 'origins:update',
  originsDelete: 'origins:delete',
  originsSetObjectFields: 'origins:set-object-fields',
  objectsListSchemas: 'objects:list-schemas',
  objectsGetSchema: 'objects:get-schema',
  objectsUpsertDraft: 'objects:upsert-draft',
  objectsRequestArchive: 'objects:request-archive',
  objectsDeleteDraft: 'objects:delete-draft',
  objectsSyncHubspot: 'objects:sync-hubspot',
  objectsApplyChange: 'objects:apply-change',
  objectsDiscardChange: 'objects:discard-change',
  customObjectsWriteSheets: 'custom-objects:write-sheets',
  customObjectsLoadSheets: 'custom-objects:load-sheets',
  customObjectsDriveMeta: 'custom-objects:drive-meta',
  formsList: 'forms:list',
  formsPendingChanges: 'forms:pending-changes',
  formsSyncHubspot: 'forms:sync-hubspot',
  formsGet: 'forms:get',
  formsCreateDefinition: 'forms:create-definition',
  formsUpdateDefinition: 'forms:update-definition',
  formsEditPendingChange: 'forms:edit-pending-change',
  formsSubscriptionTypes: 'forms:subscription-types',
  formsCoverage: 'forms:coverage',
  formsAddMissingFields: 'forms:add-missing-fields',
  formsApplyChange: 'forms:apply-change',
  formsDiscardChange: 'forms:discard-change',
  formLinksList: 'form-links:list',
  formLinksUpsert: 'form-links:upsert',
  formLinksDelete: 'form-links:delete',
  formsWriteSheets: 'forms:write-sheets',
  formsLoadSheets: 'forms:load-sheets',
  formsDriveMeta: 'forms:drive-meta',
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
  exportProject(input: ExportProjectInput): Promise<ExportProjectResult>;
  exportProjectDialog(defaultName: string): Promise<string | null>;
  importProjectValidate(input: ImportValidateInput): Promise<ImportSummary>;
  importProjectApply(input: ImportApplyInput): Promise<Project>;
  importProjectDialog(): Promise<string | null>;
  hubspotSaveToken(input: HubSpotSaveTokenInput): Promise<HubSpotSaveTokenResult>;
  hubspotGetStatus(projectId: string): Promise<HubSpotConfig | null>;
  hubspotRevokeToken(input: HubSpotEnvironmentInput): Promise<HubSpotOperationResult>;
  hubspotSetEnvironment(input: HubSpotEnvironmentInput): Promise<HubSpotOperationResult>;
  hubspotRequest(request: HubSpotRequest): Promise<HubSpotResponse>;
  gdriveStartAuth(input: GoogleDriveProjectInput): Promise<GoogleDriveOperationResult>;
  onGdriveAuthStatus(callback: (status: GoogleDriveAuthStatus) => void): () => void;
  gdriveListFolders(input: GoogleDriveListFoldersInput): Promise<DriveFolder[]>;
  gdriveSearchFolders(input: GoogleDriveSearchFoldersInput): Promise<DriveFolder[]>;
  gdriveSetFolder(input: GoogleDriveSetFolderInput): Promise<GoogleDriveFolderResult>;
  gdriveGetStatus(input: GoogleDriveProjectInput): Promise<GoogleDriveConfig | null>;
  gdriveSync(input: GoogleDriveProjectInput): Promise<GoogleDriveSyncResult>;
  gdriveRefreshProject(input: GoogleDriveProjectInput): Promise<GoogleDriveRefreshResult>;
  gdriveRevoke(input: GoogleDriveProjectInput): Promise<GoogleDriveOperationResult>;
  gdriveWriteFile(input: GoogleDriveWriteFileInput): Promise<GoogleDriveWriteFileResult>;
  gdriveReadFile(input: GoogleDriveReadFileInput): Promise<GoogleDriveReadFileResult>;
  gdriveGetCredentialsStatus(): Promise<GoogleCredentialsStatus | null>;
  gdriveSetCredentials(input: GoogleCredentialsInput): Promise<GoogleDriveOperationResult>;
  gdriveClearCredentials(): Promise<GoogleDriveOperationResult>;
  mcpGetStatus(): Promise<McpStatus>;
  mcpToggle(enabled: boolean): Promise<McpOperationResult>;
  mcpRegenerateToken(): Promise<McpTokenResult>;
  mcpListTools(): Promise<McpToolSummary[]>;
  mcpGetToken(): Promise<McpTokenResult>;
  objectsList(input: ProjectScopedInput): Promise<HubSpotObject[]>;
  hubspotPropertiesList(input: HubSpotPropertiesInput): Promise<HubSpotPropertyDef[]>;
  groupsList(input: GroupsListInput): Promise<HubSpotGroup[]>;
  groupsCreate(input: GroupCreateInput): Promise<HubSpotGroup>;
  groupRequestDelete(input: GroupDeleteRequestInput): Promise<OperationResult>;
  groupChanges(input: GroupChangesListInput): Promise<GroupDeleteChange[]>;
  groupApplyChange(input: GroupApplyChangeInput): Promise<ApplyChangeResult>;
  groupDiscardChange(input: GroupDiscardChangeInput): Promise<OperationResult>;
  entriesList(input: EntriesListInput): Promise<PropertyEntry[]>;
  entriesUpsert(input: EntryUpsertInput): Promise<PropertyEntry>;
  entriesDelete(input: EntryDeleteInput): Promise<OperationResult>;
  propertiesSyncHubspot(input: ProjectScopedInput): Promise<PropertiesSyncResult>;
  propertiesConvertToNew(input: ConvertEntryInput): Promise<ConvertEntryResult>;
  propertiesConvertMissingToNew(input: ConvertMissingInput): Promise<ConvertMissingResult>;
  propertiesApplyChange(input: ApplyChangeInput): Promise<ApplyChangeResult>;
  propertiesDiscardChange(input: DiscardChangeInput): Promise<OperationResult>;
  propertiesExportJson(input: ExportJsonInput): Promise<OriginExport>;
  propertiesWriteSheets(input: ProjectScopedInput): Promise<WriteSheetsResult>;
  propertiesWritePlanningMap(input: ProjectScopedInput): Promise<WriteSheetsResult>;
  propertiesLoadSheets(input: ProjectScopedInput): Promise<LoadSheetsResult>;
  propertiesDriveMeta(input: ProjectScopedInput): Promise<DriveDocMeta>;
  originsList(input: ProjectScopedInput): Promise<DataOrigin[]>;
  originsCreate(input: OriginCreateInput): Promise<DataOrigin>;
  originsUpdate(input: OriginUpdateInput): Promise<DataOrigin>;
  originsDelete(input: OriginDeleteInput): Promise<OperationResult>;
  originsSetObjectFields(input: OriginSetObjectFieldsInput): Promise<DataOrigin>;
  objectsListSchemas(input: ObjectsListSchemasInput): Promise<CustomObjectDefinition[]>;
  objectsGetSchema(input: ObjectGetSchemaInput): Promise<CustomObjectDefinition | null>;
  objectsUpsertDraft(input: ObjectUpsertDraftInput): Promise<CustomObjectDefinition>;
  objectsRequestArchive(input: ObjectGetSchemaInput): Promise<ObjectChangeResult>;
  objectsDeleteDraft(input: ObjectDeleteDraftInput): Promise<ObjectChangeResult>;
  objectsSyncHubspot(input: ObjectsListSchemasInput): Promise<CustomObjectsSyncResult>;
  objectsApplyChange(input: ObjectApplyChangeInput): Promise<ObjectChangeResult>;
  objectsDiscardChange(input: ObjectDiscardChangeInput): Promise<ObjectChangeResult>;
  customObjectsWriteSheets(input: ObjectsListSchemasInput): Promise<WriteSheetsResult>;
  customObjectsLoadSheets(input: ObjectsListSchemasInput): Promise<LoadSheetsResult>;
  customObjectsDriveMeta(input: ObjectsListSchemasInput): Promise<DriveDocMeta>;
  formsList(input: FormsListInput): Promise<HubSpotForm[]>;
  formsPendingChanges(input: FormsListInput): Promise<FormChange[]>;
  formsSyncHubspot(input: FormsSyncInput): Promise<FormsSyncResult>;
  formsGet(input: FormGetInput): Promise<HubSpotForm>;
  formsCreateDefinition(input: FormCreateDefinitionInput): Promise<FormChange>;
  formsUpdateDefinition(input: FormUpdateDefinitionInput): Promise<FormChange>;
  formsEditPendingChange(input: FormEditPendingChangeInput): Promise<FormChange>;
  formsListSubscriptionTypes(input: FormsListInput): Promise<SubscriptionType[]>;
  formsCoverage(input: FormCoverageInput): Promise<FormCoverageReport[]>;
  formsAddMissingFields(input: FormAddMissingFieldsInput): Promise<FormChange>;
  formsApplyChange(input: FormApplyChangeInput): Promise<FormApplyChangeResult>;
  formsDiscardChange(input: FormDiscardChangeInput): Promise<FormsOperationResult>;
  formLinksList(input: FormLinksListInput): Promise<FormOriginLink[]>;
  formLinksUpsert(input: FormLinkUpsertInput): Promise<FormOriginLink>;
  formLinksDelete(input: FormLinkDeleteInput): Promise<FormsOperationResult>;
  formsWriteSheets(input: FormsListInput): Promise<FormsWriteSheetsResult>;
  formsLoadSheets(input: FormsListInput): Promise<LoadSheetsResult>;
  formsDriveMeta(input: FormsListInput): Promise<DriveDocMeta>;
}
