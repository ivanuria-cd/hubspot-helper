import type { DriveFile, DriveFileMimeType, DriveSyncStatus } from '@shared/types/gdrive';

/** Archivo tal y como lo devuelve la Drive API (campos usados). */
export interface RemoteFile {
  driveId: string;
  name: string;
  mimeType: DriveFileMimeType;
  modifiedTime: string;
  featureKey: string;
}

export interface SyncReconciliation {
  files: DriveFile[];
  synced: DriveFile[];
  conflicts: DriveFile[];
}

function isNewer(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return ta > tb;
}

/**
 * Política de sincronización (SPEC-0004 §2): Drive manda.
 * — Solo cambió Drive (o nada): `synced`, se adopta la versión remota.
 * — Cambió en local respecto a la última sincronización: `conflict`, el usuario decide.
 */
export function detectSyncStatus(params: {
  remoteModified: string;
  lastModifiedDrive: string;
  lastModifiedLocal: string;
}): DriveSyncStatus {
  const remoteChanged = isNewer(params.remoteModified, params.lastModifiedDrive);
  const localChanged = isNewer(params.lastModifiedLocal, params.lastModifiedDrive);
  if (localChanged && remoteChanged) return 'conflict';
  if (localChanged) return 'conflict';
  return 'synced';
}

/** Combina el estado local conocido con la foto remota de Drive. Drive es la fuente de verdad. */
export function reconcile(known: DriveFile[], remote: RemoteFile[]): SyncReconciliation {
  const knownById = new Map(known.map((file) => [file.driveId, file]));
  const files: DriveFile[] = remote.map((remoteFile) => {
    const previous = knownById.get(remoteFile.driveId);
    if (!previous) {
      return {
        driveId: remoteFile.driveId,
        name: remoteFile.name,
        mimeType: remoteFile.mimeType,
        featureKey: remoteFile.featureKey,
        lastModifiedDrive: remoteFile.modifiedTime,
        lastModifiedLocal: remoteFile.modifiedTime,
        syncStatus: 'synced',
      };
    }
    const status = detectSyncStatus({
      remoteModified: remoteFile.modifiedTime,
      lastModifiedDrive: previous.lastModifiedDrive,
      lastModifiedLocal: previous.lastModifiedLocal,
    });
    return {
      ...previous,
      name: remoteFile.name,
      mimeType: remoteFile.mimeType,
      featureKey: remoteFile.featureKey,
      lastModifiedDrive: status === 'synced' ? remoteFile.modifiedTime : previous.lastModifiedDrive,
      lastModifiedLocal: status === 'synced' ? remoteFile.modifiedTime : previous.lastModifiedLocal,
      syncStatus: status,
    };
  });
  return {
    files,
    synced: files.filter((file) => file.syncStatus === 'synced'),
    conflicts: files.filter((file) => file.syncStatus === 'conflict'),
  };
}
