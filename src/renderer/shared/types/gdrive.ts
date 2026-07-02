/**
 * Contrato del conector Google Drive (SPEC-0004), compartido entre main, preload y renderer.
 * Los tokens OAuth (access/refresh) nunca forman parte de la config persistida ni se exponen al
 * renderer: viven solo en el keychain del sistema (keytar).
 */

export type DriveFileMimeType =
  | 'application/vnd.google-apps.document'
  | 'application/vnd.google-apps.spreadsheet';

export type DriveSyncStatus = 'synced' | 'conflict' | 'pending';

/** Config del conector por proyecto. Persistida en electron-store (sin tokens). */
export interface GoogleDriveConfig {
  accountEmail: string;
  folderId: string;
  folderName: string;
  folderPath: string;
  connectedAt: string;
  lastSyncAt: string;
  files: DriveFile[];
}

/** Archivo gestionado por la app dentro de la carpeta de trabajo. */
export interface DriveFile {
  driveId: string;
  name: string;
  mimeType: DriveFileMimeType;
  featureKey: string;
  lastModifiedDrive: string;
  lastModifiedLocal: string;
  syncStatus: DriveSyncStatus;
}

/** Estado de autenticación emitido por el evento `gdrive:auth-status`. */
export type GoogleDriveAuthStatus =
  | { state: 'idle' }
  | { state: 'authorizing' }
  | { state: 'connected'; email: string }
  | { state: 'error'; message: string };

export interface GoogleDriveProjectInput {
  projectId: string;
}

export interface GoogleDriveFolderResult {
  folderId: string;
  folderName: string;
  folderPath: string;
}

/** Carpeta de Drive devuelta por el selector propio (§14). */
export interface DriveFolder {
  id: string;
  name: string;
}

export interface GoogleDriveListFoldersInput {
  projectId: string;
  /** Padre cuyas subcarpetas listar. Vacío o 'root' = «Mi unidad». */
  parentId: string;
}

export interface GoogleDriveSetFolderInput {
  projectId: string;
  folderId: string;
  folderName: string;
  folderPath: string;
}

export interface GoogleDriveSearchFoldersInput {
  projectId: string;
  query: string;
}

/** Origen de cada credencial expuesto a la UI (§13). */
export type GoogleCredentialSource = 'app' | 'env' | 'none';

export interface GoogleCredentialsStatus {
  clientId: { set: boolean; source: GoogleCredentialSource; preview: string };
  clientSecret: { set: boolean; source: GoogleCredentialSource };
}

export interface GoogleCredentialsInput {
  clientId?: string;
  clientSecret?: string;
}

export interface GoogleDriveSyncResult {
  synced: DriveFile[];
  conflicts: DriveFile[];
}

export interface GoogleDriveWriteFileInput {
  projectId: string;
  featureKey: string;
  /** Contenido serializado por la feature propietaria del archivo. */
  content: string;
}

export interface GoogleDriveWriteFileResult {
  success: boolean;
  driveId?: string;
  error?: string;
}

export interface GoogleDriveReadFileInput {
  projectId: string;
  featureKey: string;
}

export interface GoogleDriveReadFileResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface GoogleDriveOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Metadatos del documento Drive de una característica para detectar cambios sin actualizar (§15).
 * `dirty` = hay datos y `lastChangedAt` es posterior a `lastWrittenAt` (o nunca se escribió).
 */
export interface DriveDocMeta {
  lastWrittenAt: string | null;
  lastChangedAt: string | null;
  /** Id del Sheets legible del feature en Drive (SPEC-0004 §18); null si aún no se ha escrito. */
  fileId?: string | null;
  /** El proyecto tiene carpeta de Drive asociada (SPEC-0004 §23); si es `false`, no hay documento que actualizar. */
  configured?: boolean;
}

/** Resultado de cargar el estado local desde el documento Drive de una característica (§15). */
export interface LoadSheetsResult {
  success: boolean;
  schemaVersion?: number;
  error?: string;
}

/** Resultado por característica de la revisión al abrir el proyecto (§19). */
export interface GoogleDriveRefreshItem {
  featureKey: string;
  name: string;
  status: 'updated' | 'error';
  error?: string;
}

/** Resultado de `gdrive:refresh-project` (§19). `connected:false` ⇒ la UI no avisa. */
export interface GoogleDriveRefreshResult {
  connected: boolean;
  upToDate: boolean;
  items: GoogleDriveRefreshItem[];
}
