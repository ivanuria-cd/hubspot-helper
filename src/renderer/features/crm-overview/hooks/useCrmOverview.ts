import { useCallback, useEffect, useState } from 'react';

interface AreaCount {
  total: number;
  pending: number;
}

export interface CrmOverview {
  loading: boolean;
  error: boolean;
  hubspotConnected: boolean;
  areas: { properties: AreaCount; objects: AreaCount; forms: AreaCount };
}

const INITIAL: CrmOverview = {
  loading: true,
  error: false,
  hubspotConnected: false,
  areas: {
    properties: { total: 0, pending: 0 },
    objects: { total: 0, pending: 0 },
    forms: { total: 0, pending: 0 },
  },
};

export function useCrmOverview(projectId: string): CrmOverview & { reload: () => Promise<void> } {
  const [state, setState] = useState<CrmOverview>(INITIAL);

  const reload = useCallback(async () => {
    if (!projectId) return;
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const [hs, entries, defs, forms, formChanges] = await Promise.all([
        window.api.hubspotGetStatus(projectId),
        window.api.entriesList({ projectId }),
        window.api.objectsListSchemas({ projectId }),
        window.api.formsList({ projectId }),
        window.api.formsPendingChanges({ projectId }),
      ]);
      setState({
        loading: false,
        error: false,
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
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
