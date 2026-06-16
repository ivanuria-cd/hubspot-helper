import { create } from 'zustand';
import type { DataOrigin, HubSpotObject, PropertyEntry } from '@shared/types/properties';

/**
 * Datos de referencia que la feature de formularios consume de la capa de propiedades
 * (SPEC-0006) vía IPC, sin importar la otra feature directamente (SPEC-0000 §6).
 */
interface FormsRefsState {
  objects: HubSpotObject[];
  origins: DataOrigin[];
  entries: PropertyEntry[];
  load: (projectId: string) => Promise<void>;
}

export const useFormsRefsStore = create<FormsRefsState>((set) => ({
  objects: [],
  origins: [],
  entries: [],
  load: async (projectId) => {
    const [objects, origins, entries] = await Promise.all([
      window.api.objectsList({ projectId }),
      window.api.originsList({ projectId }),
      window.api.entriesList({ projectId }),
    ]);
    set({ objects: objects ?? [], origins: origins ?? [], entries: entries ?? [] });
  },
}));
