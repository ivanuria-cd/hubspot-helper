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
import type { CustomObjectStore } from './store';
import { buildArchiveChange, cleanOptions, markApplied } from './changes';
import { reconcileDefinitions } from './reconcile';

export interface CustomObjectServiceDeps {
  store: CustomObjectStore;
  schemasApiFor: (projectId: string) => SchemasApi;
  activeEnvironment: (projectId: string) => HubSpotEnvironment;
  newId: () => string;
  now: () => string;
}

/** Extrae el mensaje útil del cuerpo de error 4xx de HubSpot. */
function hubspotErrorMessage(error: unknown): string {
  const e = error as {
    response?: { data?: { message?: string; errors?: Array<{ message?: string }> } };
    message?: string;
  };
  const data = e?.response?.data;
  if (data?.message) return data.message;
  const detail = (data?.errors ?? []).map((x) => x.message).filter(Boolean).join('; ');
  if (detail) return detail;
  return e?.message ?? 'Error en HubSpot';
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
  function changeFactory() {
    return { newId: deps.newId, now: deps.now };
  }

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
    return { success: true };
  }

  function deleteDraft(input: ObjectDeleteDraftInput): ObjectChangeResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      definitions: state.definitions.filter((d) => d.id !== input.objectId),
    });
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
        deps.store.set(input.projectId, { definitions: result.definitions });
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
    const definitions = state.definitions.map((d) =>
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
    return { success: true };
  }

  function discardChange(input: ObjectDiscardChangeInput): ObjectChangeResult {
    const state = deps.store.get(input.projectId);
    const definitions = state.definitions.map((d) => ({
      ...d,
      pendingChanges: d.pendingChanges?.filter((c: SchemaChange) => c.id !== input.changeId),
    }));
    deps.store.set(input.projectId, { definitions });
    return { success: true };
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
  };
}

export type CustomObjectService = ReturnType<typeof createCustomObjectService>;
