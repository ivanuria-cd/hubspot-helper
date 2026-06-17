/**
 * Persistencia local de las definiciones de objetos custom por proyecto (SPEC-0007).
 * Guarda los borradores y el estado reconciliado; los ids de HubSpot se conservan por entorno.
 * Además persiste los timestamps del documento Drive companion (lastWrittenAt / lastChangedAt,
 * SPEC-0004 §15) para detectar cambios sin actualizar.
 */
import Store from 'electron-store';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';

export interface CustomObjectState {
  definitions: CustomObjectDefinition[];
}

export interface CustomObjectsDriveTimestamps {
  lastWrittenAt: string | null;
  lastChangedAt: string | null;
}

export interface CustomObjectStore {
  get(projectId: string): CustomObjectState;
  set(projectId: string, state: CustomObjectState): void;
  getTimestamps(projectId: string): CustomObjectsDriveTimestamps;
  setTimestamps(projectId: string, timestamps: CustomObjectsDriveTimestamps): void;
}

interface CustomObjectSchema {
  states: Record<string, CustomObjectState>;
  timestamps: Record<string, CustomObjectsDriveTimestamps>;
}

const EMPTY_TIMESTAMPS: CustomObjectsDriveTimestamps = { lastWrittenAt: null, lastChangedAt: null };

export class ElectronCustomObjectStore implements CustomObjectStore {
  private readonly store = new Store<CustomObjectSchema>({
    name: 'custom-objects',
    defaults: { states: {}, timestamps: {} },
  });

  get(projectId: string): CustomObjectState {
    const stored = this.store.get('states', {})[projectId] as Partial<CustomObjectState> | undefined;
    return { definitions: stored?.definitions ?? [] };
  }

  set(projectId: string, state: CustomObjectState): void {
    const all = this.store.get('states', {});
    all[projectId] = state;
    this.store.set('states', all);
  }

  getTimestamps(projectId: string): CustomObjectsDriveTimestamps {
    const stored = this.store.get('timestamps', {})[projectId] as
      | Partial<CustomObjectsDriveTimestamps>
      | undefined;
    return {
      lastWrittenAt: stored?.lastWrittenAt ?? null,
      lastChangedAt: stored?.lastChangedAt ?? null,
    };
  }

  setTimestamps(projectId: string, timestamps: CustomObjectsDriveTimestamps): void {
    const all = this.store.get('timestamps', {});
    all[projectId] = timestamps;
    this.store.set('timestamps', all);
  }
}

export function createMemoryCustomObjectStore(): CustomObjectStore {
  const data = new Map<string, CustomObjectState>();
  const timestamps = new Map<string, CustomObjectsDriveTimestamps>();
  return {
    get: (projectId) => data.get(projectId) ?? { definitions: [] },
    set: (projectId, state) => void data.set(projectId, state),
    getTimestamps: (projectId) => timestamps.get(projectId) ?? { ...EMPTY_TIMESTAMPS },
    setTimestamps: (projectId, value) => void timestamps.set(projectId, value),
  };
}
