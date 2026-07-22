import { useAsyncResource } from '@shared/hooks/useAsyncResource';

interface AreaCount {
  total: number;
  pending: number;
}

interface CrmData {
  hubspotConnected: boolean;
  areas: { properties: AreaCount; objects: AreaCount; forms: AreaCount };
}

export interface CrmOverview extends CrmData {
  loading: boolean;
  error: boolean;
}

const INITIAL_DATA: CrmData = {
  hubspotConnected: false,
  areas: {
    properties: { total: 0, pending: 0 },
    objects: { total: 0, pending: 0 },
    forms: { total: 0, pending: 0 },
  },
};

// SPEC-0011 §14: delega en useAsyncResource (SPEC-0002 §17) el guard de respuesta obsoleta y el reset.
export function useCrmOverview(projectId: string): CrmOverview & { reload: () => void } {
  const { data, loading, error, reload } = useAsyncResource<CrmData>(
    async () => {
      if (!projectId) return INITIAL_DATA;
      const [hs, entries, defs, forms, formChanges] = await Promise.all([
        window.api.hubspotGetStatus(projectId),
        window.api.entriesList({ projectId }),
        window.api.objectsListSchemas({ projectId }),
        window.api.formsList({ projectId }),
        window.api.formsPendingChanges({ projectId }),
      ]);
      return {
        hubspotConnected: hs ? Object.keys(hs.environments).length > 0 : false,
        areas: {
          properties: {
            total: (entries ?? []).length,
            pending: (entries ?? []).reduce((n, e) => n + (e.pendingChanges?.length ?? 0), 0),
          },
          objects: {
            total: (defs ?? []).length,
            pending: (defs ?? []).reduce((n, d) => n + (d.pendingChanges?.length ?? 0), 0),
          },
          forms: { total: (forms ?? []).length, pending: (formChanges ?? []).length },
        },
      };
    },
    [projectId],
    INITIAL_DATA,
  );

  return { ...data, loading, error, reload };
}
