/**
 * Reconciliación entre las entradas del proyecto y el estado real de HubSpot (SPEC-0006 §16).
 * El estado de cada entrada se calcula sobre su propiedad HubSpot destino, identificada por
 * `objectType + hubspotName`. Varias entradas pueden apuntar al mismo destino.
 */
import type { PropertyEntry } from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';
import {
  buildCreateChange,
  buildDeleteChange,
  diffDefinition,
  type ChangeFactoryDeps,
} from './pending-changes';

export interface ReconcileResult {
  entries: PropertyEntry[];
  summary: { updated: number; divergent: number; missing: number };
}

function destName(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'existing'
    ? entry.hubspotProperty.hubspotName
    : entry.hubspotProperty.definition.hubspotName;
}

export function reconcileEntries(
  entries: PropertyEntry[],
  remotes: RemoteProperty[],
  deps: ChangeFactoryDeps,
): ReconcileResult {
  const key = (objectType: string, name: string): string => `${objectType}:${name}`;
  const remoteByKey = new Map(remotes.map((r) => [key(r.objectType, r.name), r]));
  let updated = 0;
  let divergent = 0;
  let missing = 0;

  const result = entries.map((entry) => {
    const remote = remoteByKey.get(key(entry.objectType, destName(entry)));
    const ref = entry.hubspotProperty;

    // Solicitud de archivado: si la propiedad existe en HubSpot, el único cambio es `delete`.
    if (entry.pendingDelete && remote) {
      divergent += 1;
      return {
        ...entry,
        hubspotStatus: 'divergent' as const,
        pendingChanges: [buildDeleteChange(entry.id, entry.objectType, destName(entry), deps)],
      };
    }

    // Propiedad nueva: si no existe en HubSpot, hay que crearla.
    if (ref.mode === 'new') {
      if (!remote) {
        missing += 1;
        return {
          ...entry,
          hubspotStatus: 'missing' as const,
          pendingChanges: [buildCreateChange(entry.id, entry.objectType, ref.definition, deps)],
        };
      }
      const changes = diffDefinition(entry.id, ref.definition, remote, deps);
      if (changes.length === 0) {
        updated += 1;
        return { ...entry, hubspotStatus: 'exists' as const, pendingChanges: [] };
      }
      divergent += 1;
      return { ...entry, hubspotStatus: 'divergent' as const, pendingChanges: changes };
    }

    // Propiedad existente referenciada.
    if (!remote) {
      missing += 1;
      return { ...entry, hubspotStatus: 'missing' as const, pendingChanges: [] };
    }
    // Si el usuario editó la definición, comparamos para proponer update_*.
    if (ref.definition) {
      const changes = diffDefinition(entry.id, ref.definition, remote, deps);
      if (changes.length > 0) {
        divergent += 1;
        return { ...entry, hubspotStatus: 'divergent' as const, pendingChanges: changes };
      }
    }
    updated += 1;
    return { ...entry, hubspotStatus: 'exists' as const, pendingChanges: [] };
  });

  return { entries: result, summary: { updated, divergent, missing } };
}
