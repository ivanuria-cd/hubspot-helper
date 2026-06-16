import { create } from 'zustand';
import type {
  EntryUpsertInput,
  PropertiesSyncResult,
  PropertyEntry,
} from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface EntriesState {
  entries: PropertyEntry[];
  loading: boolean;
  syncing: boolean;
  lastSync: PropertiesSyncResult | null;
  error: string | null;
  load: (projectId: string, objectType?: string) => Promise<void>;
  sync: (projectId: string) => Promise<void>;
  upsert: (input: EntryUpsertInput) => Promise<void>;
  remove: (projectId: string, entryId: string) => Promise<void>;
  applyChange: (
    projectId: string,
    changeId: string,
    environment: HubSpotEnvironment,
  ) => Promise<boolean>;
  discardChange: (projectId: string, changeId: string) => Promise<void>;
}

export const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  loading: false,
  syncing: false,
  lastSync: null,
  error: null,
  load: async (projectId) => {
    set({ loading: true, error: null });
    try {
      set({ entries: (await window.api.entriesList({ projectId })) ?? [] });
    } finally {
      set({ loading: false });
    }
  },
  sync: async (projectId) => {
    set({ syncing: true, error: null });
    try {
      const lastSync = await window.api.propertiesSyncHubspot({ projectId });
      const entries = (await window.api.entriesList({ projectId })) ?? [];
      set({ entries, lastSync });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error' });
    } finally {
      set({ syncing: false });
    }
  },
  upsert: async (input) => {
    await window.api.entriesUpsert(input);
    await get().load(input.projectId);
  },
  remove: async (projectId, entryId) => {
    await window.api.entriesDelete({ projectId, entryId });
    await get().load(projectId);
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
