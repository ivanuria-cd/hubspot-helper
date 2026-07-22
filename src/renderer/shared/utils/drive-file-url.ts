/**
 * URL de apertura directa de un archivo gestionado de Drive (SPEC-0004 §18.4). El `driveId` es
 * opaco (lo asigna Google); no hay entrada de texto libre del usuario.
 */
import type { DriveFileMimeType } from '@shared/types/gdrive';

const SPREADSHEET: DriveFileMimeType = 'application/vnd.google-apps.spreadsheet';

export function driveFileUrl(driveId: string, mimeType: DriveFileMimeType): string {
  const kind = mimeType === SPREADSHEET ? 'spreadsheets' : 'document';
  return `https://docs.google.com/${kind}/d/${driveId}/edit`;
}
