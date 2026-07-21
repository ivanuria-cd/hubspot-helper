import { create } from 'zustand';
import type {
  FormChange,
  FormCoverageReport,
  FormEditsInput,
  FormOriginLink,
  FormsSyncResult,
  HubSpotForm,
  NewFormDefinition,
  SubscriptionType,
} from '@shared/types/forms';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface FormsState {
  forms: HubSpotForm[];
  links: FormOriginLink[];
  changes: FormChange[];
  coverage: Record<string, FormCoverageReport[]>;
  subscriptionTypes: SubscriptionType[];
  loading: boolean;
  syncing: boolean;
  lastSync: FormsSyncResult | null;
  error: string | null;
  /** Proyecto del último load; permite resetear datos derivados al cambiar de proyecto. */
  loadedProjectId: string | null;
  load: (projectId: string) => Promise<void>;
  sync: (projectId: string, includeLegacyV2?: boolean) => Promise<void>;
  loadCoverage: (projectId: string, formId: string) => Promise<void>;
  createDefinition: (projectId: string, definition: NewFormDefinition) => Promise<void>;
  updateDefinition: (projectId: string, formId: string, edits: FormEditsInput) => Promise<void>;
  editPendingChange: (
    projectId: string,
    changeId: string,
    edits: FormEditsInput,
    originIds?: string[],
  ) => Promise<void>;
  addMissingFields: (projectId: string, formId: string, originId: string) => Promise<void>;
  applyChange: (
    projectId: string,
    changeId: string,
    environment: HubSpotEnvironment,
  ) => Promise<boolean>;
  discardChange: (projectId: string, changeId: string) => Promise<void>;
  upsertLink: (
    projectId: string,
    link: { id?: string; formId: string; originIds: string[]; objectType: string },
  ) => Promise<void>;
  deleteLink: (projectId: string, linkId: string) => Promise<void>;
  loadSubscriptionTypes: (projectId: string) => Promise<void>;
}

export const useFormsStore = create<FormsState>((set, get) => ({
  forms: [],
  links: [],
  changes: [],
  coverage: {},
  subscriptionTypes: [],
  loading: false,
  syncing: false,
  lastSync: null,
  error: null,
  loadedProjectId: null,
  load: async (projectId) => {
    // Al cambiar de proyecto, descarta datos derivados del proyecto anterior.
    const projectChanged = get().loadedProjectId !== projectId;
    set({
      loading: true,
      error: null,
      ...(projectChanged ? { coverage: {}, lastSync: null } : {}),
    });
    try {
      const [forms, links, changes] = await Promise.all([
        window.api.formsList({ projectId }),
        window.api.formLinksList({ projectId }),
        window.api.formsPendingChanges({ projectId }),
      ]);
      set({
        forms: forms ?? [],
        links: links ?? [],
        changes: changes ?? [],
        loadedProjectId: projectId,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ loading: false });
    }
  },
  sync: async (projectId, includeLegacyV2) => {
    set({ syncing: true, error: null });
    try {
      const lastSync = await window.api.formsSyncHubspot({ projectId, includeLegacyV2 });
      set({ lastSync });
      await get().load(projectId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ syncing: false });
    }
  },
  loadCoverage: async (projectId, formId) => {
    const reports = await window.api.formsCoverage({ projectId, formId });
    set((state) => ({ coverage: { ...state.coverage, [formId]: reports ?? [] } }));
  },
  createDefinition: async (projectId, definition) => {
    await window.api.formsCreateDefinition({ projectId, definition });
    await get().load(projectId);
  },
  updateDefinition: async (projectId, formId, edits) => {
    await window.api.formsUpdateDefinition({ projectId, formId, edits });
    await get().load(projectId);
  },
  editPendingChange: async (projectId, changeId, edits, originIds) => {
    await window.api.formsEditPendingChange({ projectId, changeId, edits, originIds });
    await get().load(projectId);
  },
  addMissingFields: async (projectId, formId, originId) => {
    await window.api.formsAddMissingFields({ projectId, formId, originId });
    await get().load(projectId);
  },
  applyChange: async (projectId, changeId, environment) => {
    const result = await window.api.formsApplyChange({ projectId, changeId, environment });
    if (!result.success) {
      set({ error: result.error ?? null });
      return false;
    }
    await get().load(projectId);
    return true;
  },
  discardChange: async (projectId, changeId) => {
    await window.api.formsDiscardChange({ projectId, changeId });
    await get().load(projectId);
  },
  upsertLink: async (projectId, link) => {
    await window.api.formLinksUpsert({ projectId, link });
    await get().load(projectId);
  },
  deleteLink: async (projectId, linkId) => {
    await window.api.formLinksDelete({ projectId, linkId });
    await get().load(projectId);
  },
  loadSubscriptionTypes: async (projectId) => {
    try {
      const subscriptionTypes = await window.api.formsListSubscriptionTypes({ projectId });
      set({ subscriptionTypes: subscriptionTypes ?? [] });
    } catch {
      set({ subscriptionTypes: [] });
    }
  },
}));
