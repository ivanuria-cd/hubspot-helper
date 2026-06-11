import { create } from 'zustand';
import type {
  HubSpotProperty,
  PropertiesSyncResult,
  PropertyUpsertInput,
} from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface PropertiesState {
  properties: HubSpotProperty[];
  loading: boolean;
  syncing: boolean;
  lastSync: PropertiesSyncResult | null;
  error: string | null;
  load: (projectId: string) => Promise<void>;
  sync: (projectId: string) => Promise<void>;
  upsert: (input: PropertyUpsertInput) => Promise<void>;
  applyChange: (
    projectId: string,
    changeId: string,
    environment: HubSpotEnvironment,
  ) => Promise<boolean>;
  discardChange: (projectId: string, changeId: string) => Promise<void>;
}

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
  properties: [],
  loading: false,
  syncing: false,
  lastSync: null,
  error: null,
  load: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const properties = await window.api.propertiesList({ projectId });
      set({ properties });
    } finally {
      set({ loading: false });
    }
  },
  sync: async (projectId) => {
    set({ syncing: true, error: null });
    try {
      const lastSync = await window.api.propertiesSyncHubspot({ projectId });
      const properties = await window.api.propertiesList({ projectId });
      set({ properties, lastSync });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error' });
    } finally {
      set({ syncing: false });
    }
  },
  upsert: async (input) => {
    await window.api.propertiesUpsert(input);
    await get().load(input.projectId);
  },
  applyChange: async (projectId, changeId, environment) => {
    const result = await window.api.propertiesApplyChange({ projectId, changeId, environment });
    if (!result.success) {
      set({ error: result.error ?? 'Error' });
      return false;
    }
    await get().load(projectId);
    return true;
  },
  discardChange: async (projectId, changeId) => {
    await window.api.propertiesDiscardChange({ projectId, changeId });
    await get().load(projectId);
  },
}));
