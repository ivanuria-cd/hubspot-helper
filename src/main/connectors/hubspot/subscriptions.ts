/**
 * Communication Preferences API v4 de HubSpot (SPEC-0008 §24): tipos de suscripción del portal,
 * necesarios para construir los `communicationsCheckboxes` del consentimiento legal de formularios.
 * Ref: GET /communication-preferences/v4/definitions (cuenta clouddistrict).
 */
import type { SubscriptionType } from '@shared/types/forms';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import type { HubSpotRequester } from './properties';

const DEFINITIONS = '/communication-preferences/v4/definitions';

interface RawDefinition {
  id?: string;
  name?: string;
  communicationMethod?: string;
  isActive?: boolean;
}

export interface SubscriptionsApiDeps {
  request: HubSpotRequester;
  projectId: string;
}

export function createSubscriptionsApi(deps: SubscriptionsApiDeps) {
  /** Lista los tipos de suscripción de Email activos del portal. */
  async function listDefinitions(environment?: HubSpotEnvironment): Promise<SubscriptionType[]> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'GET',
      path: DEFINITIONS,
    });
    const data = response.data as { results?: RawDefinition[] };
    return (data.results ?? [])
      .filter((def) => def.isActive !== false && def.communicationMethod === 'Email')
      .map((def) => ({ id: Number(def.id), name: def.name ?? String(def.id) }))
      .filter((def) => Number.isFinite(def.id));
  }

  return { listDefinitions };
}

export type SubscriptionsApi = ReturnType<typeof createSubscriptionsApi>;
