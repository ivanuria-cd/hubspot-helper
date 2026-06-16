/**
 * Persistencia local del inventario de formularios, las asociaciones formulario↔origen y los
 * cambios pendientes por proyecto (SPEC-0008 §2). El estado de verdad de los formularios es
 * HubSpot; aquí se guarda el espejo importado más los metadatos locales (links y cambios).
 */
import Store from 'electron-store';
import type { FormChange, FormOriginLink, HubSpotForm } from '@shared/types/forms';

export interface FormsState {
  forms: HubSpotForm[];
  links: FormOriginLink[];
  changes: FormChange[];
}

export interface FormsStore {
  get(projectId: string): FormsState;
  set(projectId: string, state: FormsState): void;
}

interface FormsSchema {
  states: Record<string, FormsState>;
}

const EMPTY: FormsState = { forms: [], links: [], changes: [] };

export class ElectronFormsStore implements FormsStore {
  private readonly store = new Store<FormsSchema>({
    name: 'forms',
    defaults: { states: {} },
  });

  get(projectId: string): FormsState {
    const stored = this.store.get('states', {})[projectId] as Partial<FormsState> | undefined;
    return {
      forms: stored?.forms ?? [],
      links: stored?.links ?? [],
      changes: stored?.changes ?? [],
    };
  }

  set(projectId: string, state: FormsState): void {
    const all = this.store.get('states', {});
    all[projectId] = state;
    this.store.set('states', all);
  }
}

export function createMemoryFormsStore(): FormsStore {
  const data = new Map<string, FormsState>();
  return {
    get: (projectId) => data.get(projectId) ?? { ...EMPTY },
    set: (projectId, state) => void data.set(projectId, state),
  };
}
