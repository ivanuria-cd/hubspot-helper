/**
 * Persistencia local de las definiciones de objetos custom por proyecto (SPEC-0007).
 * Guarda los borradores y el estado reconciliado; los ids de HubSpot se conservan por entorno.
 * Además persiste los timestamps del documento Drive companion (lastWrittenAt / lastChangedAt,
 * SPEC-0004 §15) para detectar cambios sin actualizar.
 */
import Store from 'electron-store';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';
import { createProjectRecord } from '../shared/project-record';

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
  private readonly states = createProjectRecord<Partial<CustomObjectState>>(this.store, 'states');
  private readonly timestamps = createProjectRecord<Partial<CustomObjectsDriveTimestamps>>(
    this.store,
    'timestamps',
  );

  get(projectId: string): CustomObjectState {
    return { definitions: this.states.get(projectId)?.definitions ?? [] };
  }

  set(projectId: string, state: CustomObjectState): void {
    this.states.set(projectId, state);
  }

  getTimestamps(projectId: string): CustomObjectsDriveTimestamps {
    const stored = this.timestamps.get(projectId);
    return {
      lastWrittenAt: stored?.lastWrittenAt ?? null,
      lastChangedAt: stored?.lastChangedAt ?? null,
    };
  }

  setTimestamps(projectId: string, timestamps: CustomObjectsDriveTimestamps): void {
    this.timestamps.set(projectId, timestamps);
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
