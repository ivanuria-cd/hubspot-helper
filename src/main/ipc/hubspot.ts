/** Handlers IPC del conector HubSpot (SPEC-0003). Extraído de `index.ts` (SPEC-0002 §23). */
import { ipcMain } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import type {
  HubSpotEnvironmentInput,
  HubSpotRequest,
  HubSpotSaveTokenInput,
} from '@shared/types/hubspot';
import type { HubSpotConnector } from '../connectors/hubspot';

// SPEC-0003 §17: el proxy genérico solo admite paths de la allowlist; evita que un renderer
// comprometido use el PAT contra endpoints arbitrarios del portal.
const HUBSPOT_ALLOWED_PATH_PREFIXES = ['/crm/', '/marketing/v3/forms', '/account-info/'];

export function registerHubspotIpc(hubspot: HubSpotConnector): void {
  ipcMain.handle(IpcChannels.hubspotSaveToken, (_event, input: HubSpotSaveTokenInput) =>
    hubspot.saveToken(input),
  );
  ipcMain.handle(IpcChannels.hubspotGetStatus, (_event, projectId: string) =>
    hubspot.getStatus(projectId),
  );
  ipcMain.handle(IpcChannels.hubspotRevokeToken, (_event, input: HubSpotEnvironmentInput) =>
    hubspot.revokeToken(input),
  );
  ipcMain.handle(IpcChannels.hubspotSetEnvironment, (_event, input: HubSpotEnvironmentInput) =>
    hubspot.setEnvironment(input),
  );
  ipcMain.handle(IpcChannels.hubspotRequest, (_event, request: HubSpotRequest) => {
    const path = typeof request?.path === 'string' ? request.path : '';
    if (!HUBSPOT_ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return Promise.resolve({ status: 403, data: { message: 'Path no permitido' } });
    }
    return hubspot.request(request);
  });
}
