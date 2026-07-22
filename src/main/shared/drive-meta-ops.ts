/**
 * Helpers compartidos de metadatos de Drive por proyecto (SPEC-0002 §33). Elimina la duplicación
 * de `markChanged`/`getDriveMeta`/`markDriveWritten` y la cola de timestamps de `applyDriveState`
 * entre los servicios de propiedades, objetos custom y formularios. Continúa la línea de
 * `createProjectRecord` (§23).
 */
import type { DriveDocMeta } from '@shared/types/gdrive';

interface DriveTimestamps {
  lastWrittenAt: string | null;
  lastChangedAt: string | null;
}

export interface DriveTimestampStore {
  getTimestamps(projectId: string): DriveTimestamps;
  setTimestamps(projectId: string, timestamps: DriveTimestamps): void;
}

export function createDriveMetaOps(store: DriveTimestampStore, isoNow: () => string) {
  return {
    markChanged(projectId: string): void {
      store.setTimestamps(projectId, {
        ...store.getTimestamps(projectId),
        lastChangedAt: isoNow(),
      });
    },
    getDriveMeta(input: { projectId: string }): DriveDocMeta {
      return store.getTimestamps(input.projectId);
    },
    markDriveWritten(input: { projectId: string }): void {
      store.setTimestamps(input.projectId, {
        ...store.getTimestamps(input.projectId),
        lastWrittenAt: isoNow(),
      });
    },
    /** Marca escrito y al día a la vez: `lastWrittenAt = lastChangedAt = isoNow()` (cola de applyDriveState). */
    touchWritten(projectId: string): void {
      const now = isoNow();
      store.setTimestamps(projectId, { lastWrittenAt: now, lastChangedAt: now });
    },
  };
}
