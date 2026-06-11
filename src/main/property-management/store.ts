/**
 * Persistencia local del mapa de propiedades por proyecto (estado de trabajo).
 * La fuente de verdad última es el Google Sheets en Drive; este store es la copia
 * editable de la app, que se vuelca a Drive ante cada cambio.
 */
import Store from 'electron-store';
import type {
  DataOrigin,
  HubSpotProperty,
  PropertyOriginMapping,
} from '@shared/types/properties';

export interface PropertyState {
  origins: DataOrigin[];
  properties: HubSpotProperty[];
  mappings: PropertyOriginMapping[];
}

export interface PropertyStore {
  get(projectId: string): PropertyState;
  set(projectId: string, state: PropertyState): void;
}

const EMPTY: PropertyState = { origins: [], properties: [], mappings: [] };

interface PropertySchema {
  states: Record<string, PropertyState>;
}

export class ElectronPropertyStore implements PropertyStore {
  private readonly store = new Store<PropertySchema>({
    name: 'properties',
    defaults: { states: {} },
  });

  get(projectId: string): PropertyState {
    return this.store.get('states', {})[projectId] ?? { ...EMPTY };
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
    get: (projectId) => data.get(projectId) ?? { origins: [], properties: [], mappings: [] },
    set: (projectId, state) => void data.set(projectId, state),
  };
}
