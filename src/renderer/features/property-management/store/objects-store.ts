import { create } from 'zustand';
import type { HubSpotObject } from '@shared/types/properties';

interface ObjectsState {
  objects: HubSpotObject[];
  loading: boolean;
  load: (projectId: string) => Promise<void>;
}

export const useObjectsStore = create<ObjectsState>((set) => ({
  objects: [],
  loading: false,
  load: async (projectId) => {
    set({ loading: true });
    try {
      set({ objects: await window.api.objectsList({ projectId }) });
    } finally {
      set({ loading: false });
    }
  },
}));
