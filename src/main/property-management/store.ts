/**
 * Persistencia local del mapa de propiedades por proyecto (estado de trabajo, modelo §16).
 * Guarda orígenes y entradas. El volcado al Google Sheets queda diferido hasta resolver
 * la conexión de Drive (no se escribe desde aquí por ahora).
 */
import Store from 'electron-store';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

export interface PropertyState {
  origins: DataOrigin[];
  entries: PropertyEntry[];
}

export interface PropertyStore {
  get(projectId: string): PropertyState;
  set(projectId: string, state: PropertyState): void;
}

interface PropertySchema {
  states: Record<string, PropertyState>;
}

export class ElectronPropertyStore implements PropertyStore {
  private readonly store = new Store<PropertySchema>({
    name: 'properties',
    defaults: { states: {} },
  });

  get(projectId: string): PropertyState {
    // Coalesce por campo: descarta estado v1 (properties/mappings) y garantiza arrays.
    const stored = this.store.get('states', {})[projectId] as Partial<PropertyState> | undefined;
    return { origins: stored?.origins ?? [], entries: stored?.entries ?? [] };
  }

  set(projectId: string, state: PropertyState): void {
    const all = this.store.get('states', {});
    all[projectId] = state;
    this.store.set('states', all);
  }
}

export function createMemoryPropertyStore(): PropertyStore {
  const data = new Map<string, PropertyState>();
  return {
    get: (projectId) => data.get(projectId) ?? { origins: [], entries: [] },
    set: (projectId, state) => void data.set(projectId, state),
  };
}
