import { useCallback, useEffect, useState } from 'react';
import type {
  HubSpotConfig,
  HubSpotEnvironment,
  HubSpotSaveTokenResult,
} from '@shared/types/hubspot';
import { useShellStore } from '@renderer/app/store/shell-store';

export interface UseHubSpotConnector {
  status: HubSpotConfig | null;
  loading: boolean;
  saving: boolean;
  saveToken: (environment: HubSpotEnvironment, token: string) => Promise<HubSpotSaveTokenResult>;
  revoke: (environment: HubSpotEnvironment) => Promise<void>;
  selectEnvironment: (environment: HubSpotEnvironment) => Promise<void>;
}

export function useHubSpotConnector(projectId: string): UseHubSpotConnector {
  const [status, setStatus] = useState<HubSpotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setHubspotEnvironment = useShellStore((state) => state.setHubspotEnvironment);

  const applyStatus = useCallback(
    (next: HubSpotConfig | null) => {
      setStatus(next);
      setHubspotEnvironment(next?.activeEnvironment ?? null);
    },
    [setHubspotEnvironment],
  );

  const refresh = useCallback(async () => {
    applyStatus(await window.api.hubspotGetStatus(projectId));
  }, [projectId, applyStatus]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.api
      .hubspotGetStatus(projectId)
      .then((next) => {
        if (cancelled) return;
        applyStatus(next);
      })
      .catch(() => {
        // SPEC-0003 §20: sin este catch, un fallo IPC dejaba loading=true para siempre.
        if (!cancelled) applyStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, applyStatus]);

  const saveToken = useCallback(
    async (environment: HubSpotEnvironment, token: string) => {
      setSaving(true);
      try {
        const result = await window.api.hubspotSaveToken({ projectId, environment, token });
        if (result.success) await refresh();
        return result;
      } finally {
        setSaving(false);
      }
    },
    [projectId, refresh],
  );

  const revoke = useCallback(
    async (environment: HubSpotEnvironment) => {
      await window.api.hubspotRevokeToken({ projectId, environment });
      await refresh();
    },
    [projectId, refresh],
  );

  const selectEnvironment = useCallback(
    async (environment: HubSpotEnvironment) => {
      await window.api.hubspotSetEnvironment({ projectId, environment });
      await refresh();
    },
    [projectId, refresh],
  );

  return { status, loading, saving, saveToken, revoke, selectEnvironment };
}
