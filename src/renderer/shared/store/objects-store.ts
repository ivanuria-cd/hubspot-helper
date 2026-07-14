import { create } from 'zustand';
import type { HubSpotObject } from '@shared/types/properties';

/**
 * Store compartido de la lista de objetos del portal (SPEC-0006 §55). Única fuente para
 * propiedades, objetos custom y formularios; evita el import cruzado entre features (SPEC-0000 §6).
 */
interface ObjectsState {
  objects: HubSpotObject[];
  loading: boolean;
  error: string | null;
  load: (projectId: string) => Promise<void>;
}

export const useObjectsStore = create<ObjectsState>((set) => ({
  objects: [],
  loading: false,
  error: null,
  load: async (projectId) => {
    set({ loading: true, error: null });
    try {
      set({ objects: await window.api.objectsList({ projectId }) });
    } catch (error) {
      // Deja el error consultable y evita el unhandled rejection (las pantallas cargan con `void`).
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ loading: false });
    }
  },
}));
