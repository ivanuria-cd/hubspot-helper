import { create } from 'zustand';
import type { MappingUpsertInput, PropertyOriginMapping } from '@shared/types/properties';

interface MappingsState {
  mappings: PropertyOriginMapping[];
  loading: boolean;
  load: (projectId: string, propertyId?: string) => Promise<void>;
  upsert: (input: MappingUpsertInput) => Promise<void>;
  remove: (projectId: string, mappingId: string) => Promise<void>;
}

export const useMappingsStore = create<MappingsState>((set, get) => ({
  mappings: [],
  loading: false,
  load: async (projectId, propertyId) => {
    set({ loading: true });
    try {
      set({ mappings: await window.api.mappingsList({ projectId, propertyId }) });
    } finally {
      set({ loading: false });
    }
  },
  upsert: async (input) => {
    await window.api.mappingsUpsert(input);
    await get().load(input.projectId);
  },
  remove: async (projectId, mappingId) => {
    await window.api.mappingsDelete({ projectId, mappingId });
    await get().load(projectId);
  },
}));
