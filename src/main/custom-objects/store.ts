/**
 * Persistencia local de las definiciones de objetos custom por proyecto (SPEC-0007).
 * Guarda los borradores y el estado reconciliado; los ids de HubSpot se conservan por entorno.
 */
import Store from 'electron-store';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';

export interface CustomObjectState {
  definitions: CustomObjectDefinition[];
}

export interface CustomObjectStore {
  get(projectId: string): CustomObjectState;
  set(projectId: string, state: CustomObjectState): void;
}

interface CustomObjectSchema {
  states: Record<string, CustomObjectState>;
}

export class ElectronCustomObjectStore implements CustomObjectStore {
  private readonly store = new Store<CustomObjectSchema>({
    name: 'custom-objects',
    defaults: { states: {} },
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
}

export function createMemoryCustomObjectStore(): CustomObjectStore {
  const data = new Map<string, CustomObjectState>();
  return {
    get: (projectId) => data.get(projectId) ?? { definitions: [] },
    set: (projectId, state) => void data.set(projectId, state),
  };
}
