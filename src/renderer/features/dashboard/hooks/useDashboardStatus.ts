import { useCallback, useEffect, useState } from 'react';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

export interface DashboardStatus {
  loading: boolean;
  error: boolean;
  hubspot: {
    connected: boolean;
    activeEnvironment?: HubSpotEnvironment;
    environments: HubSpotEnvironment[];
  };
  drive: { connected: boolean; folderName?: string };
  mcp: { running: boolean; toolCount: number; port: number };
  pending: { properties: number; objects: number; forms: number };
  anyConnector: boolean;
}

const INITIAL: DashboardStatus = {
  loading: true,
  error: false,
  hubspot: { connected: false, environments: [] },
  drive: { connected: false },
  mcp: { running: false, toolCount: 0, port: 0 },
  pending: { properties: 0, objects: 0, forms: 0 },
  anyConnector: false,
};

export function useDashboardStatus(projectId: string): DashboardStatus & { reload: () => Promise<void> } {
  const [state, setState] = useState<DashboardStatus>(INITIAL);

  const reload = useCallback(async () => {
    if (!projectId) return;
    // Reset completo: no arrastrar datos del proyecto anterior durante la recarga (SPEC-0002 §17.2).
    setState({ ...INITIAL, loading: true });
    try {
      const [hs, drive, mcp, entries, defs, formChanges] = await Promise.all([
        window.api.hubspotGetStatus(projectId),
        window.api.gdriveGetStatus({ projectId }),
        window.api.mcpGetStatus(),
        window.api.entriesList({ projectId }),
        window.api.objectsListSchemas({ projectId }),
        window.api.formsPendingChanges({ projectId }),
      ]);
      const environments = hs ? (Object.keys(hs.environments) as HubSpotEnvironment[]) : [];
      const hubspot = {
        connected: environments.length > 0,
        activeEnvironment: hs?.activeEnvironment,
        environments,
      };
      const driveStatus = { connected: Boolean(drive?.folderId), folderName: drive?.folderName };
      const mcpStatus = { running: mcp.running, toolCount: mcp.toolCount, port: mcp.port };
      const pending = {
        properties: (entries ?? []).reduce((n, e) => n + (e.pendingChanges?.length ?? 0), 0),
        objects: (defs ?? []).reduce((n, d) => n + (d.pendingChanges?.length ?? 0), 0),
        forms: (formChanges ?? []).length,
      };
      setState({
        loading: false,
        error: false,
        hubspot,
        drive: driveStatus,
        mcp: mcpStatus,
        pending,
        anyConnector: hubspot.connected || driveStatus.connected || mcpStatus.running,
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
