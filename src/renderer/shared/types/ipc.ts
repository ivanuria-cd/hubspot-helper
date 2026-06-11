/**
 * Contrato IPC público entre renderer y main.
 * Cualquier cambio aquí afecta a preload, main y renderer simultáneamente.
 */
import type { SupportedLanguage } from '@shared/i18n/languages';
import type { NewProjectInput, Project } from '@shared/types/project';
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
  GoogleDriveAuthStatus,
  GoogleDriveConfig,
  GoogleDriveFolderResult,
  GoogleDriveOperationResult,
  GoogleDriveProjectInput,
  GoogleDriveReadFileInput,
  GoogleDriveReadFileResult,
  GoogleDriveSyncResult,
  GoogleDriveWriteFileInput,
  GoogleDriveWriteFileResult,
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
  ExportJsonInput,
  HubSpotProperty,
  MappingDeleteInput,
  MappingUpsertInput,
  MappingsListInput,
  OperationResult,
  OriginCreateInput,
  OriginDeleteInput,
  OriginExport,
  OriginUpdateInput,
  ProjectScopedInput,
  PropertiesSyncResult,
  PropertyOriginMapping,
  PropertyUpsertInput,
} from '@shared/types/properties';

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
  hubspotSaveToken: 'hubspot:save-token',
  hubspotGetStatus: 'hubspot:get-status',
  hubspotRevokeToken: 'hubspot:revoke-token',
  hubspotSetEnvironment: 'hubspot:set-environment',
  hubspotRequest: 'hubspot:request',
  gdriveStartAuth: 'gdrive:start-auth',
  gdriveAuthStatus: 'gdrive:auth-status',
  gdriveSelectFolder: 'gdrive:select-folder',
  gdriveGetStatus: 'gdrive:get-status',
  gdriveSync: 'gdrive:sync',
  gdriveRevoke: 'gdrive:revoke',
  gdriveWriteFile: 'gdrive:write-file',
  gdriveReadFile: 'gdrive:read-file',
  mcpGetStatus: 'mcp:get-status',
  mcpToggle: 'mcp:toggle',
  mcpRegenerateToken: 'mcp:regenerate-token',
  mcpListTools: 'mcp:list-tools',
  mcpGetToken: 'mcp:get-token',
  propertiesList: 'properties:list',
  propertiesUpsert: 'properties:upsert',
  propertiesSyncHubspot: 'properties:sync-hubspot',
  propertiesApplyChange: 'properties:apply-change',
  propertiesDiscardChange: 'properties:discard-change',
  propertiesExportJson: 'properties:export-json',
  originsList: 'origins:list',
  originsCreate: 'origins:create',
  originsUpdate: 'origins:update',
  originsDelete: 'origins:delete',
  mappingsList: 'mappings:list',
  mappingsUpsert: 'mappings:upsert',
  mappingsDelete: 'mappings:delete',
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
  hubspotSaveToken(input: HubSpotSaveTokenInput): Promise<HubSpotSaveTokenResult>;
  hubspotGetStatus(projectId: string): Promise<HubSpotConfig | null>;
  hubspotRevokeToken(input: HubSpotEnvironmentInput): Promise<HubSpotOperationResult>;
  hubspotSetEnvironment(input: HubSpotEnvironmentInput): Promise<HubSpotOperationResult>;
  hubspotRequest(request: HubSpotRequest): Promise<HubSpotResponse>;
  gdriveStartAuth(input: GoogleDriveProjectInput): Promise<GoogleDriveOperationResult>;
  onGdriveAuthStatus(callback: (status: GoogleDriveAuthStatus) => void): () => void;
  gdriveSelectFolder(input: GoogleDriveProjectInput): Promise<GoogleDriveFolderResult | null>;
  gdriveGetStatus(input: GoogleDriveProjectInput): Promise<GoogleDriveConfig | null>;
  gdriveSync(input: GoogleDriveProjectInput): Promise<GoogleDriveSyncResult>;
  gdriveRevoke(input: GoogleDriveProjectInput): Promise<GoogleDriveOperationResult>;
  gdriveWriteFile(input: GoogleDriveWriteFileInput): Promise<GoogleDriveWriteFileResult>;
  gdriveReadFile(input: GoogleDriveReadFileInput): Promise<GoogleDriveReadFileResult>;
  mcpGetStatus(): Promise<McpStatus>;
  mcpToggle(enabled: boolean): Promise<McpOperationResult>;
  mcpRegenerateToken(): Promise<McpTokenResult>;
  mcpListTools(): Promise<McpToolSummary[]>;
  mcpGetToken(): Promise<McpTokenResult>;
  propertiesList(input: ProjectScopedInput): Promise<HubSpotProperty[]>;
  propertiesUpsert(input: PropertyUpsertInput): Promise<HubSpotProperty>;
  propertiesSyncHubspot(input: ProjectScopedInput): Promise<PropertiesSyncResult>;
  propertiesApplyChange(input: ApplyChangeInput): Promise<ApplyChangeResult>;
  propertiesDiscardChange(input: DiscardChangeInput): Promise<OperationResult>;
  propertiesExportJson(input: ExportJsonInput): Promise<OriginExport>;
  originsList(input: ProjectScopedInput): Promise<DataOrigin[]>;
  originsCreate(input: OriginCreateInput): Promise<DataOrigin>;
  originsUpdate(input: OriginUpdateInput): Promise<DataOrigin>;
  originsDelete(input: OriginDeleteInput): Promise<OperationResult>;
  mappingsList(input: MappingsListInput): Promise<PropertyOriginMapping[]>;
  mappingsUpsert(input: MappingUpsertInput): Promise<PropertyOriginMapping>;
  mappingsDelete(input: MappingDeleteInput): Promise<OperationResult>;
}
