/**
 * Reconciliación entre las definiciones locales de objetos custom y el estado real de
 * HubSpot (SPEC-0007). La identificación se hace por `name` dentro del entorno (no por
 * `objectTypeId`, que difiere entre portales). Genera cambios `create`/`update_schema`.
 */
import type { CustomObjectDefinition, CustomObjectsSyncResult } from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import type { RemoteSchema } from '../connectors/hubspot/schemas';
import { buildCreateChange, diffSchema, preserveIdentity, type ChangeFactoryDeps } from './changes';

export interface ReconcileResult {
  definitions: CustomObjectDefinition[];
  summary: CustomObjectsSyncResult;
}

export function reconcileDefinitions(
  definitions: CustomObjectDefinition[],
  remotes: RemoteSchema[],
  environment: HubSpotEnvironment,
  deps: ChangeFactoryDeps,
): ReconcileResult {
  const remoteByName = new Map(remotes.map((r) => [r.name, r]));
  let created = 0;
  let divergent = 0;
  let draft = 0;

  const result = definitions.map((def) => {
    // Mantenemos los cambios de archivado pendientes sin reclasificar.
    const previous = def.pendingChanges ?? [];
    const archive = previous.filter((c) => c.operation === 'archive');
    const remote = remoteByName.get(def.name);

    if (!remote) {
      draft += 1;
      return {
        ...def,
        status: 'draft' as const,
        pendingChanges: preserveIdentity([...archive, buildCreateChange(def, deps)], previous),
      };
    }

    const objectTypeId = { ...def.objectTypeId, [environment]: remote.objectTypeId };
    const fullyQualifiedName = {
      ...def.fullyQualifiedName,
      [environment]: remote.fullyQualifiedName,
    };
    const changes = diffSchema(def, remote, deps);

    if (changes.length === 0) {
      created += 1;
      return {
        ...def,
        objectTypeId,
        fullyQualifiedName,
        status: 'created' as const,
        pendingChanges: preserveIdentity(archive, previous),
      };
    }
    divergent += 1;
    return {
      ...def,
      objectTypeId,
      fullyQualifiedName,
      status: 'divergent' as const,
      pendingChanges: preserveIdentity([...archive, ...changes], previous),
    };
  });

  return { definitions: result, summary: { created, divergent, draft } };
}
