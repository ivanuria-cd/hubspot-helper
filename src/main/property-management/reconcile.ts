/**
 * Reconciliación entre la definición de propiedades del proyecto y el estado real
 * del portal de HubSpot (SPEC-0006). Clasifica cada propiedad como exists / divergent /
 * missing y adjunta los cambios pendientes necesarios.
 */
import type { HubSpotProperty } from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';
import { buildCreateChange, diffProperty, type ChangeFactoryDeps } from './pending-changes';

export interface ReconcileResult {
  properties: HubSpotProperty[];
  summary: { updated: number; divergent: number; missing: number };
}

export function reconcile(
  locals: HubSpotProperty[],
  remotes: RemoteProperty[],
  deps: ChangeFactoryDeps,
): ReconcileResult {
  const remoteByName = new Map(remotes.map((remote) => [remote.name, remote]));
  let updated = 0;
  let divergent = 0;
  let missing = 0;

  const properties = locals.map((property) => {
    const remote = remoteByName.get(property.hubspotName);

    if (!remote) {
      missing += 1;
      return {
        ...property,
        hubspotStatus: 'missing' as const,
        pendingChanges: [buildCreateChange(property, deps)],
      };
    }

    const changes = diffProperty(property, remote, deps);
    if (changes.length === 0) {
      updated += 1;
      return { ...property, hubspotStatus: 'exists' as const, pendingChanges: [] };
    }

    divergent += 1;
    return { ...property, hubspotStatus: 'divergent' as const, pendingChanges: changes };
  });

  return { properties, summary: { updated, divergent, missing } };
}
