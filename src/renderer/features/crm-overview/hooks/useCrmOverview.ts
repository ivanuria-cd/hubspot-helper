import { useCallback, useEffect, useRef, useState } from 'react';

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
  // SPEC-0011 §13: guard de respuesta obsoleta (patrón runId de useAsyncResource).
  const runId = useRef(0);

  const reload = useCallback(async () => {
    if (!projectId) return;
    const current = ++runId.current;
    const isCurrent = (): boolean => runId.current === current;
    // Reset completo: no arrastrar datos del proyecto anterior durante la recarga (SPEC-0002 §17.2).
    setState({ ...INITIAL, loading: true });
    try {
      const [hs, entries, defs, forms, formChanges] = await Promise.all([
        window.api.hubspotGetStatus(projectId),
        window.api.entriesList({ projectId }),
        window.api.objectsListSchemas({ projectId }),
        window.api.formsList({ projectId }),
        window.api.formsPendingChanges({ projectId }),
      ]);
      if (!isCurrent()) return;
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
      if (isCurrent()) setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
