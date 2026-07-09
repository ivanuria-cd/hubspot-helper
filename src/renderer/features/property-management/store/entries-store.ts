import { create } from 'zustand';
import type {
  ConvertEntryResult,
  ConvertMissingResult,
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
  load: (projectId: string) => Promise<void>;
  sync: (projectId: string) => Promise<void>;
  convertToNew: (projectId: string, entryId: string) => Promise<ConvertEntryResult>;
  convertMissing: (projectId: string, objectType?: string) => Promise<ConvertMissingResult>;
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
    } catch (error) {
      // SPEC-0006 §50: sin este catch la promesa escapaba (unhandled rejection con `void load(...)`).
      // §52: mensaje real siempre (String(error)), nunca el literal 'Error'.
      set({ error: error instanceof Error ? error.message : String(error) });
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
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ syncing: false });
    }
  },
  convertToNew: async (projectId, entryId) => {
    const result = await window.api.propertiesConvertToNew({ projectId, entryId });
    await get().load(projectId);
    return result;
  },
  convertMissing: async (projectId, objectType) => {
    const result = await window.api.propertiesConvertMissingToNew({ projectId, objectType });
    await get().load(projectId);
    return result;
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
      // SPEC-0006 §53.18: sin literal; la pantalla traduce el fallback (common.loadError).
      set({ error: result.error ?? null });
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
