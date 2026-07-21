/**
 * Factoría compartida de los handlers IPC de documento de estado de Drive (SPEC-0002 §32.1).
 * Deduplica `*LoadSheets`/`*DriveMeta`, idénticos entre propiedades, objetos custom y formularios
 * salvo el parseo/aplicación del estado y los feature keys.
 */
import { ipcMain } from 'electron';
import type { DriveDocMeta, LoadSheetsResult } from '@shared/types/gdrive';
import type { GoogleDriveConnector } from '../connectors/google-drive';
import type { DriveDocs } from '../drive-docs';

export interface DriveStateIpcConfig {
  loadChannel: string;
  metaChannel: string;
  stateFeatureKey: string;
  /** Feature key del `fileId` que devuelve el DriveMeta (en propiedades, el del mapa de planificación). */
  fileFeatureKey: string;
  /** Parsea el contenido, lo aplica al estado local y devuelve la versión de esquema leída. */
  applyContent: (input: { projectId: string }, content: string) => number;
  getDriveMeta: (input: { projectId: string }) => DriveDocMeta;
}

export function registerDriveStateIpc(
  deps: { gdrive: GoogleDriveConnector; driveDocs: DriveDocs },
  config: DriveStateIpcConfig,
): void {
  const { gdrive, driveDocs } = deps;

  ipcMain.handle(
    config.loadChannel,
    async (_event, input: { projectId: string }): Promise<LoadSheetsResult> => {
      const read = await gdrive.readFile({
        projectId: input.projectId,
        featureKey: config.stateFeatureKey,
      });
      if (!read.success || !read.content) {
        return { success: false, error: read.error ?? 'No hay documento de estado en Drive.' };
      }
      try {
        const schemaVersion = config.applyContent(input, read.content);
        return { success: true, schemaVersion };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al cargar',
        };
      }
    },
  );

  ipcMain.handle(config.metaChannel, (_event, input: { projectId: string }) => ({
    ...config.getDriveMeta(input),
    fileId: driveDocs.managedSpreadsheetId(input.projectId, config.fileFeatureKey),
    configured: Boolean(gdrive.getStatus(input.projectId)?.folderId),
  }));
}
