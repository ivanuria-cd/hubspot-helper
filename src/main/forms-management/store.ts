/**
 * Persistencia local del inventario de formularios, las asociaciones formulario↔origen y los
 * cambios pendientes por proyecto (SPEC-0008 §2). El estado de verdad de los formularios es
 * HubSpot; aquí se guarda el espejo importado más los metadatos locales (links y cambios).
 * Además persiste los timestamps del documento Drive companion (lastWrittenAt / lastChangedAt,
 * SPEC-0004 §15) para detectar cambios sin actualizar.
 */
import Store from 'electron-store';
import type { FormChange, FormOriginLink, HubSpotForm } from '@shared/types/forms';

export interface FormsState {
  forms: HubSpotForm[];
  links: FormOriginLink[];
  changes: FormChange[];
}

export interface FormsDriveTimestamps {
  lastWrittenAt: string | null;
  lastChangedAt: string | null;
}

export interface FormsStore {
  get(projectId: string): FormsState;
  set(projectId: string, state: FormsState): void;
  getTimestamps(projectId: string): FormsDriveTimestamps;
  setTimestamps(projectId: string, timestamps: FormsDriveTimestamps): void;
}

interface FormsSchema {
  states: Record<string, FormsState>;
  timestamps: Record<string, FormsDriveTimestamps>;
}

const EMPTY: FormsState = { forms: [], links: [], changes: [] };
const EMPTY_TIMESTAMPS: FormsDriveTimestamps = { lastWrittenAt: null, lastChangedAt: null };

export class ElectronFormsStore implements FormsStore {
  private readonly store = new Store<FormsSchema>({
    name: 'forms',
    defaults: { states: {}, timestamps: {} },
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

  getTimestamps(projectId: string): FormsDriveTimestamps {
    const stored = this.store.get('timestamps', {})[projectId] as
      | Partial<FormsDriveTimestamps>
      | undefined;
    return {
      lastWrittenAt: stored?.lastWrittenAt ?? null,
      lastChangedAt: stored?.lastChangedAt ?? null,
    };
  }

  setTimestamps(projectId: string, timestamps: FormsDriveTimestamps): void {
    const all = this.store.get('timestamps', {});
    all[projectId] = timestamps;
    this.store.set('timestamps', all);
  }
}

export function createMemoryFormsStore(): FormsStore {
  const data = new Map<string, FormsState>();
  const timestamps = new Map<string, FormsDriveTimestamps>();
  return {
    get: (projectId) => data.get(projectId) ?? { ...EMPTY },
    set: (projectId, state) => void data.set(projectId, state),
    getTimestamps: (projectId) => timestamps.get(projectId) ?? { ...EMPTY_TIMESTAMPS },
    setTimestamps: (projectId, value) => void timestamps.set(projectId, value),
  };
}
