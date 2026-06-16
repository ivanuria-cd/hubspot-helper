import { create } from 'zustand';
import type {
  CustomObjectDefinition,
  CustomObjectsSyncResult,
  ObjectUpsertDraftInput,
} from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface CustomObjectsState {
  definitions: CustomObjectDefinition[];
  loading: boolean;
  syncing: boolean;
  lastSync: CustomObjectsSyncResult | null;
  error: string | null;
  load: (projectId: string) => Promise<void>;
  sync: (projectId: string) => Promise<void>;
  upsert: (input: ObjectUpsertDraftInput) => Promise<void>;
  requestArchive: (projectId: string, objectId: string) => Promise<void>;
  remove: (projectId: string, objectId: string) => Promise<void>;
  applyChange: (
    projectId: string,
    changeId: string,
    environment: HubSpotEnvironment,
  ) => Promise<boolean>;
  discardChange: (projectId: string, changeId: string) => Promise<void>;
}

export const useCustomObjectsStore = create<CustomObjectsState>((set, get) => ({
  definitions: [],
  loading: false,
  syncing: false,
  lastSync: null,
  error: null,
  load: async (projectId) => {
    set({ loading: true, error: null });
    try {
      set({ definitions: (await window.api.objectsListSchemas({ projectId })) ?? [] });
    } finally {
      set({ loading: false });
    }
  },
  sync: async (projectId) => {
    set({ syncing: true, error: null });
    try {
      const lastSync = await window.api.objectsSyncHubspot({ projectId });
      const definitions = (await window.api.objectsListSchemas({ projectId })) ?? [];
      set({ definitions, lastSync });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error' });
    } finally {
      set({ syncing: false });
    }
  },
  upsert: async (input) => {
    await window.api.objectsUpsertDraft(input);
    await get().load(input.projectId);
  },
  requestArchive: async (projectId, objectId) => {
    await window.api.objectsRequestArchive({ projectId, objectId });
    await get().load(projectId);
  },
  remove: async (projectId, objectId) => {
    await window.api.objectsDeleteDraft({ projectId, objectId });
    await get().load(projectId);
  },
  applyChange: async (projectId, changeId, environment) => {
    const result = await window.api.objectsApplyChange({ projectId, changeId, environment });
    if (!result.success) {
      set({ error: result.error ?? 'Error' });
      return false;
    }
    await get().load(projectId);
    return true;
  },
  discardChange: async (projectId, changeId) => {
    await window.api.objectsDiscardChange({ projectId, changeId });
    await get().load(projectId);
  },
}));
