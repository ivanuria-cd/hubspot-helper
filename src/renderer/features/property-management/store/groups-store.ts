import { create } from 'zustand';
import type { GroupDeleteChange, HubSpotGroup, OperationResult } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

/**
 * Estado de los grupos de propiedades del objeto activo (SPEC-0006 §33/§53.12). Centraliza la carga
 * (grupos + propiedades en uso + cambios pendientes) y las escrituras, en línea con el resto de stores
 * de la feature. El feedback (Snackbar/confirm) y el estado `busy` viven en el componente.
 */
interface GroupsState {
  groups: HubSpotGroup[];
  usedGroups: Set<string>;
  changes: GroupDeleteChange[];
  loading: boolean;
  error: string | null;
  load: (projectId: string, objectType: string) => Promise<void>;
  requestDelete: (input: {
    projectId: string;
    objectType: string;
    groupName: string;
    label?: string;
  }) => Promise<OperationResult>;
  applyChange: (
    projectId: string,
    changeId: string,
    environment: HubSpotEnvironment,
  ) => Promise<OperationResult>;
  discardChange: (projectId: string, changeId: string) => Promise<void>;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  usedGroups: new Set(),
  changes: [],
  loading: false,
  error: null,
  load: async (projectId, objectType) => {
    set({ loading: true, error: null });
    try {
      const [groups, properties, pending] = await Promise.all([
        window.api.groupsList({ projectId, objectType }),
        window.api.hubspotPropertiesList({ projectId, objectType }),
        window.api.groupChanges({ projectId }),
      ]);
      set({
        groups,
        usedGroups: new Set(properties.map((p) => p.groupName).filter(Boolean) as string[]),
        changes: pending.filter((c) => c.objectType === objectType),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ loading: false });
    }
  },
  requestDelete: (input) => window.api.groupRequestDelete(input),
  applyChange: (projectId, changeId, environment) =>
    window.api.groupApplyChange({ projectId, changeId, environment }),
  discardChange: async (projectId, changeId) => {
    await window.api.groupDiscardChange({ projectId, changeId });
  },
}));
