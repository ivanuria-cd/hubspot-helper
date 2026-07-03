import { create } from 'zustand';
import type { HubSpotObject } from '@shared/types/properties';

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
      // SPEC-0006 §50: evita el unhandled rejection y deja el error consultable.
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ loading: false });
    }
  },
}));
