import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { useAsyncResource } from '@shared/hooks/useAsyncResource';

interface DashboardData {
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

export interface DashboardStatus extends DashboardData {
  loading: boolean;
  error: boolean;
}

const INITIAL_DATA: DashboardData = {
  hubspot: { connected: false, environments: [] },
  drive: { connected: false },
  mcp: { running: false, toolCount: 0, port: 0 },
  pending: { properties: 0, objects: 0, forms: 0 },
  anyConnector: false,
};

// SPEC-0010 §14: delega en useAsyncResource (SPEC-0002 §17) el guard de respuesta obsoleta y el reset.
export function useDashboardStatus(projectId: string): DashboardStatus & { reload: () => void } {
  const { data, loading, error, reload } = useAsyncResource<DashboardData>(
    async () => {
      if (!projectId) return INITIAL_DATA;
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
      const drive2 = { connected: Boolean(drive?.folderId), folderName: drive?.folderName };
      const mcp2 = { running: mcp.running, toolCount: mcp.toolCount, port: mcp.port };
      const pending = {
        properties: (entries ?? []).reduce((n, e) => n + (e.pendingChanges?.length ?? 0), 0),
        objects: (defs ?? []).reduce((n, d) => n + (d.pendingChanges?.length ?? 0), 0),
        forms: (formChanges ?? []).length,
      };
      return {
        hubspot,
        drive: drive2,
        mcp: mcp2,
        pending,
        anyConnector: hubspot.connected || drive2.connected || mcp2.running,
      };
    },
    [projectId],
    INITIAL_DATA,
  );

  return { ...data, loading, error, reload };
}
