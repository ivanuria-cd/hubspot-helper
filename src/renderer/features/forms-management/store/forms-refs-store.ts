import { create } from 'zustand';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

/**
 * Datos de referencia que la feature de formularios consume de la capa de propiedades
 * (SPEC-0006) vía IPC, sin importar la otra feature directamente (SPEC-0000 §6).
 * La lista de objetos vive en el store compartido `@shared/store/objects-store` (SPEC-0006 §55).
 */
interface FormsRefsState {
  origins: DataOrigin[];
  entries: PropertyEntry[];
  load: (projectId: string) => Promise<void>;
}

export const useFormsRefsStore = create<FormsRefsState>((set) => ({
  origins: [],
  entries: [],
  load: async (projectId) => {
    const [origins, entries] = await Promise.all([
      window.api.originsList({ projectId }),
      window.api.entriesList({ projectId }),
    ]);
    set({ origins: origins ?? [], entries: entries ?? [] });
  },
}));
