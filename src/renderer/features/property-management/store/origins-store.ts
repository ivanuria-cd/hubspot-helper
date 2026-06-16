import { create } from 'zustand';
import type { DataOrigin, OriginType } from '@shared/types/properties';

interface OriginsState {
  origins: DataOrigin[];
  loading: boolean;
  load: (projectId: string) => Promise<void>;
  create: (
    projectId: string,
    origin: { name: string; type: OriginType; description?: string },
  ) => Promise<void>;
  update: (projectId: string, origin: DataOrigin) => Promise<void>;
  remove: (projectId: string, originId: string) => Promise<void>;
}

export const useOriginsStore = create<OriginsState>((set, get) => ({
  origins: [],
  loading: false,
  load: async (projectId) => {
    set({ loading: true });
    try {
      set({ origins: await window.api.originsList({ projectId }) });
    } finally {
      set({ loading: false });
    }
  },
  create: async (projectId, origin) => {
    await window.api.originsCreate({ projectId, origin });
    await get().load(projectId);
  },
  update: async (projectId, origin) => {
    await window.api.originsUpdate({ projectId, origin });
    await get().load(projectId);
  },
  remove: async (projectId, originId) => {
    await window.api.originsDelete({ projectId, originId });
    await get().load(projectId);
  },
}));
