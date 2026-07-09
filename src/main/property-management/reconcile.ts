/**
 * Reconciliación entre las entradas del proyecto y el estado real de HubSpot (SPEC-0006 §16).
 * El estado de cada entrada se calcula sobre su propiedad HubSpot destino, identificada por
 * `objectType + hubspotName`. Varias entradas pueden apuntar al mismo destino.
 */
import type { Blocker, PropertyEntry } from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';
import {
  buildCreateChange,
  buildDeleteChange,
  diffDefinition,
  preserveIdentity,
  type ChangeFactoryDeps,
} from './pending-changes';
import { isSystemProperty } from './system-properties';
import { entryDestName as destName } from './dest-name';

export interface ReconcileResult {
  entries: PropertyEntry[];
  summary: { updated: number; divergent: number; missing: number; blocked: number };
  blockers: Blocker[];
}

/**
 * Fuente única del `Blocker` de una entrada `existing` cuya propiedad destino no existe (SPEC-0006 §35/§53.3).
 * Si es una propiedad de sistema, el remedio es `relink`; si no, `convert-to-new`.
 */
export function buildBlocker(entry: PropertyEntry): Blocker {
  const name = destName(entry);
  const system = isSystemProperty(entry.objectType, name);
  return {
    entryId: entry.id,
    entry: entry.name,
    objectType: entry.objectType,
    hubspotName: name,
    reason: system ? 'system-property' : 'existing-missing-remote',
    remediation: system ? 'relink' : 'convert-to-new',
  };
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
  let blocked = 0;
  const blockers: Blocker[] = [];

  const result = entries.map((entry) => {
    const remote = remoteByKey.get(key(entry.objectType, destName(entry)));
    const ref = entry.hubspotProperty;
    // Cambios previos de la entrada: su identidad (id/createdAt/flags) se preserva (§54.1/§54.3).
    const prev = entry.pendingChanges ?? [];

    // Solicitud de archivado: si la propiedad existe en HubSpot, el único cambio es `delete`.
    if (entry.pendingDelete && remote) {
      divergent += 1;
      return {
        ...entry,
        hubspotStatus: 'divergent' as const,
        pendingChanges: preserveIdentity(
          [buildDeleteChange(entry.id, entry.objectType, destName(entry), deps)],
          prev,
        ),
      };
    }

    // Propiedad nueva: si no existe en HubSpot, hay que crearla.
    if (ref.mode === 'new') {
      if (!remote) {
        missing += 1;
        return {
          ...entry,
          hubspotStatus: 'missing' as const,
          pendingChanges: preserveIdentity(
            [buildCreateChange(entry.id, entry.objectType, ref.definition, deps)],
            prev,
          ),
        };
      }
      const changes = diffDefinition(entry.id, ref.definition, remote, deps);
      if (changes.length === 0) {
        updated += 1;
        return { ...entry, hubspotStatus: 'exists' as const, pendingChanges: [] };
      }
      divergent += 1;
      return {
        ...entry,
        hubspotStatus: 'divergent' as const,
        pendingChanges: preserveIdentity(changes, prev),
      };
    }

    // Propiedad existente referenciada.
    if (!remote) {
      // Bloqueo: apunta a una propiedad inexistente y no genera cambio (SPEC-0006 §35/§43).
      missing += 1;
      blocked += 1;
      blockers.push(buildBlocker(entry));
      return { ...entry, hubspotStatus: 'missing' as const, pendingChanges: [] };
    }
    // Si el usuario editó la definición, comparamos para proponer update_*.
    if (ref.definition) {
      const changes = diffDefinition(entry.id, ref.definition, remote, deps);
      if (changes.length > 0) {
        divergent += 1;
        return {
          ...entry,
          hubspotStatus: 'divergent' as const,
          pendingChanges: preserveIdentity(changes, prev),
        };
      }
    }
    updated += 1;
    return { ...entry, hubspotStatus: 'exists' as const, pendingChanges: [] };
  });

  return { entries: result, summary: { updated, divergent, missing, blocked }, blockers };
}
