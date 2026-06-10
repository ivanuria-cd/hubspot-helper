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
