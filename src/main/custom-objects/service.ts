/**
 * Servicio de gestión de objetos custom (SPEC-0007). Orquesta el store local de
 * definiciones, el conector de schemas de HubSpot, la reconciliación y la aplicación
 * de cambios. Nunca aplica cambios en HubSpot sin confirmación explícita y entorno.
 * Ref API: /crm-object-schemas/v3/schemas (SPEC-0007 §2).
 */
import type {
  CustomObjectDefinition,
  CustomObjectsSyncResult,
  ObjectApplyChangeInput,
  ObjectChangeResult,
  ObjectDeleteDraftInput,
  ObjectDiscardChangeInput,
  ObjectGetSchemaInput,
  ObjectsListSchemasInput,
  ObjectUpsertDraftInput,
  SchemaChange,
} from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import type { SchemasApi } from '../connectors/hubspot/schemas';
import { hubspotErrorMessage as sharedHubspotErrorMessage } from '../connectors/hubspot/errors';
import type { CustomObjectStore } from './store';
import type { CustomObjectsDriveState } from './drive-state';
import { buildArchiveChange, cleanOptions, markApplied } from './changes';
import { reconcileDefinitions } from './reconcile';
import { createDriveMetaOps } from '../shared/drive-meta-ops';

export interface CustomObjectServiceDeps {
  store: CustomObjectStore;
  schemasApiFor: (projectId: string) => SchemasApi;
  activeEnvironment: (projectId: string) => HubSpotEnvironment;
  newId: () => string;
  now: () => string;
}

// Versión compartida en el conector (SPEC-0003 §19): añade el mapeo 401/403/429/409/400
// del que esta feature carecía.
function hubspotErrorMessage(error: unknown): string {
  return sharedHubspotErrorMessage(error, 'El objeto');
}

function sanitizeDefinition(
  def: ObjectUpsertDraftInput['definition'],
): ObjectUpsertDraftInput['definition'] {
  return {
    ...def,
    properties: def.properties.map((p) => ({ ...p, options: cleanOptions(p.options) })),
  };
}

export function createCustomObjectService(deps: CustomObjectServiceDeps) {
  const isoNow = deps.now ?? (() => new Date().toISOString());

  function changeFactory() {
    return { newId: deps.newId, now: deps.now };
  }

  const { markChanged, getDriveMeta, markDriveWritten, touchWritten } = createDriveMetaOps(
    deps.store,
    isoNow,
  );

  function listDefinitions(input: ObjectsListSchemasInput): CustomObjectDefinition[] {
    return deps.store.get(input.projectId).definitions;
  }

  function getDefinition(input: ObjectGetSchemaInput): CustomObjectDefinition | null {
    return deps.store.get(input.projectId).definitions.find((d) => d.id === input.objectId) ?? null;
  }

  function upsertDraft(input: ObjectUpsertDraftInput): CustomObjectDefinition {
    const state = deps.store.get(input.projectId);
    const incoming = sanitizeDefinition(input.definition);
    const existing = incoming.id ? state.definitions.find((d) => d.id === incoming.id) : undefined;
    const definition: CustomObjectDefinition = {
      ...incoming,
      id: existing?.id ?? deps.newId(),
      objectTypeId: existing?.objectTypeId,
      fullyQualifiedName: existing?.fullyQualifiedName,
      status: existing?.status ?? 'draft',
      pendingChanges: existing?.pendingChanges ?? [],
      createdAt: existing?.createdAt ?? deps.now(),
      updatedAt: deps.now(),
    };
    const definitions = existing
      ? state.definitions.map((d) => (d.id === definition.id ? definition : d))
      : [...state.definitions, definition];
    deps.store.set(input.projectId, { definitions });
    markChanged(input.projectId);
    return definition;
  }

  function requestArchive(input: ObjectGetSchemaInput): ObjectChangeResult {
    const state = deps.store.get(input.projectId);
    const def = state.definitions.find((d) => d.id === input.objectId);
    if (!def) return { success: false, error: 'Objeto no encontrado' };
    if ((def.pendingChanges ?? []).some((c) => c.operation === 'archive')) {
      return { success: true };
    }
    const change = buildArchiveChange(def, changeFactory());
    const definitions = state.definitions.map((d) =>
      d.id === def.id ? { ...d, pendingChanges: [...(d.pendingChanges ?? []), change] } : d,
    );
    deps.store.set(input.projectId, { definitions });
    markChanged(input.projectId);
    return { success: true };
  }

  function deleteDraft(input: ObjectDeleteDraftInput): ObjectChangeResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      definitions: state.definitions.filter((d) => d.id !== input.objectId),
    });
    markChanged(input.projectId);
    return { success: true };
  }

  function syncHubspot(input: ObjectsListSchemasInput): Promise<CustomObjectsSyncResult> {
    const state = deps.store.get(input.projectId);
    const environment = deps.activeEnvironment(input.projectId);
    return deps
      .schemasApiFor(input.projectId)
      .listSchemas(environment)
      .then((remotes) => {
        const result = reconcileDefinitions(
          state.definitions,
          remotes,
          environment,
          changeFactory(),
        );
        // SPEC-0007 §25: relectura del store tras el await (patrón SPEC-0006 §47).
        const reconciledById = new Map(result.definitions.map((d) => [d.id, d]));
        const fresh = deps.store.get(input.projectId);
        deps.store.set(input.projectId, {
          definitions: fresh.definitions.map((d) => reconciledById.get(d.id) ?? d),
        });
        markChanged(input.projectId);
        return result.summary;
      });
  }

  async function applyChange(input: ObjectApplyChangeInput): Promise<ObjectChangeResult> {
    const state = deps.store.get(input.projectId);
    const def = state.definitions.find((d) =>
      d.pendingChanges?.some((c) => c.id === input.changeId),
    );
    const change = def?.pendingChanges?.find((c) => c.id === input.changeId);
    if (!def || !change) return { success: false, error: 'Cambio no encontrado' };

    const api = deps.schemasApiFor(input.projectId);
    let nextDef: CustomObjectDefinition = def;

    try {
      if (change.operation === 'create') {
        const response = await api.createSchema(change.payload, input.environment);
        const data = response.data as { objectTypeId?: string; fullyQualifiedName?: string };
        nextDef = {
          ...def,
          objectTypeId: { ...def.objectTypeId, [input.environment]: data.objectTypeId },
          fullyQualifiedName: {
            ...def.fullyQualifiedName,
            [input.environment]: data.fullyQualifiedName,
          },
          status: 'created',
        };
      } else {
        const objectType = def.objectTypeId?.[input.environment];
        if (!objectType) {
          return {
            success: false,
            error: `El objeto no existe aún en ${input.environment}; crea primero el objeto en ese entorno.`,
          };
        }
        if (change.operation === 'update_schema') {
          await api.updateSchema(objectType, change.payload, input.environment);
        } else {
          await api.deleteSchema(objectType, input.environment);
          nextDef = { ...def, status: 'archived' };
        }
      }
    } catch (error) {
      return { success: false, error: hubspotErrorMessage(error) };
    }

    const updatedChange = markApplied(change, input.environment);
    // SPEC-0007 §25: relectura del store tras los await de red (patrón SPEC-0006 §47).
    const fresh = deps.store.get(input.projectId);
    const definitions = fresh.definitions.map((d) =>
      d.id === def.id
        ? {
            ...nextDef,
            pendingChanges: nextDef.pendingChanges?.map((c) =>
              c.id === input.changeId ? updatedChange : c,
            ),
          }
        : d,
    );
    deps.store.set(input.projectId, { definitions });
    markChanged(input.projectId);
    return { success: true };
  }

  function discardChange(input: ObjectDiscardChangeInput): ObjectChangeResult {
    const state = deps.store.get(input.projectId);
    const definitions = state.definitions.map((d) => ({
      ...d,
      pendingChanges: d.pendingChanges?.filter((c: SchemaChange) => c.id !== input.changeId),
    }));
    deps.store.set(input.projectId, { definitions });
    markChanged(input.projectId);
    return { success: true };
  }

  function applyDriveState(input: { projectId: string }, state: CustomObjectsDriveState): void {
    deps.store.set(input.projectId, { definitions: state.objects });
    touchWritten(input.projectId);
  }

  return {
    listDefinitions,
    getDefinition,
    upsertDraft,
    requestArchive,
    deleteDraft,
    syncHubspot,
    applyChange,
    discardChange,
    getDriveMeta,
    markDriveWritten,
    applyDriveState,
  };
}

export type CustomObjectService = ReturnType<typeof createCustomObjectService>;
