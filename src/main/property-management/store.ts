/**
 * Persistencia local del mapa de propiedades por proyecto (estado de trabajo, modelo §16).
 * Guarda orígenes y entradas. Además persiste los timestamps del documento Drive companion
 * (lastWrittenAt / lastChangedAt, SPEC-0004 §15) para detectar cambios sin actualizar.
 */
import Store from 'electron-store';
import type { DataOrigin, GroupDeleteChange, PropertyEntry } from '@shared/types/properties';

export interface PropertyState {
  origins: DataOrigin[];
  entries: PropertyEntry[];
  /** Cambios pendientes de borrado de grupos (SPEC-0006 §33). A nivel de proyecto, no por entrada. */
  groupChanges: GroupDeleteChange[];
}

export interface PropertyDriveTimestamps {
  lastWrittenAt: string | null;
  lastChangedAt: string | null;
}

export interface PropertyStore {
  get(projectId: string): PropertyState;
  set(projectId: string, state: PropertyState): void;
  getTimestamps(projectId: string): PropertyDriveTimestamps;
  setTimestamps(projectId: string, timestamps: PropertyDriveTimestamps): void;
}

interface PropertySchema {
  states: Record<string, PropertyState>;
  timestamps: Record<string, PropertyDriveTimestamps>;
}

const EMPTY_TIMESTAMPS: PropertyDriveTimestamps = { lastWrittenAt: null, lastChangedAt: null };

export class ElectronPropertyStore implements PropertyStore {
  private readonly store = new Store<PropertySchema>({
    name: 'properties',
    defaults: { states: {}, timestamps: {} },
  });

  get(projectId: string): PropertyState {
    // Coalesce por campo: descarta estado v1 (properties/mappings) y garantiza arrays.
    const stored = this.store.get('states', {})[projectId] as Partial<PropertyState> | undefined;
    return {
      origins: stored?.origins ?? [],
      entries: stored?.entries ?? [],
      groupChanges: stored?.groupChanges ?? [],
    };
  }

  set(projectId: string, state: PropertyState): void {
    const all = this.store.get('states', {});
    all[projectId] = state;
    this.store.set('states', all);
  }

  getTimestamps(projectId: string): PropertyDriveTimestamps {
    const stored = this.store.get('timestamps', {})[projectId] as
      | Partial<PropertyDriveTimestamps>
      | undefined;
    return {
      lastWrittenAt: stored?.lastWrittenAt ?? null,
      lastChangedAt: stored?.lastChangedAt ?? null,
    };
  }

  setTimestamps(projectId: string, timestamps: PropertyDriveTimestamps): void {
    const all = this.store.get('timestamps', {});
    all[projectId] = timestamps;
    this.store.set('timestamps', all);
  }
}

export function createMemoryPropertyStore(): PropertyStore {
  const data = new Map<string, PropertyState>();
  const stamps = new Map<string, PropertyDriveTimestamps>();
  return {
    get: (projectId) => data.get(projectId) ?? { origins: [], entries: [], groupChanges: [] },
    set: (projectId, state) => void data.set(projectId, state),
    getTimestamps: (projectId) => stamps.get(projectId) ?? { ...EMPTY_TIMESTAMPS },
    setTimestamps: (projectId, timestamps) => void stamps.set(projectId, timestamps),
  };
}
