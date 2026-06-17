/**
 * Servicio de gestión de propiedades (SPEC-0006, rediseño §16). Orquesta el store local de
 * entradas, el conector HubSpot (propiedades + objetos), la reconciliación y la exportación.
 * Nunca aplica cambios en HubSpot sin confirmación explícita del usuario.
 * NOTA: el volcado al Google Sheets queda diferido hasta resolver la conexión de Drive.
 */
import type {
  ApplyChangeInput,
  ApplyChangeResult,
  DataOrigin,
  DiscardChangeInput,
  EntriesListInput,
  EntryDeleteInput,
  EntryUpsertInput,
  ExportJsonInput,
  GroupCreateInput,
  GroupsListInput,
  HubSpotGroup,
  HubSpotObject,
  HubSpotPropertiesInput,
  HubSpotPropertyDef,
  OperationResult,
  OriginCreateInput,
  OriginDeleteInput,
  OriginExport,
  OriginUpdateInput,
  ProjectScopedInput,
  PropertiesSyncResult,
  PropertyEntry,
} from '@shared/types/properties';
import type { PropertiesApi, RemoteProperty } from '../connectors/hubspot/properties';
import type { ObjectsApi } from '../connectors/hubspot/objects';
import type { PropertyStore } from './store';
import type { HubSpotPropertyRef } from '@shared/types/properties';
import type { DriveDocMeta } from '@shared/types/gdrive';
import { reconcileEntries } from './reconcile';
import { markApplied, cleanOptions } from './pending-changes';
import { buildOriginExport } from './origin-export';
import type { PropertyDriveState } from './drive-state';

/** Sanea las opciones de la definición destino para no almacenar opciones vacías. */
function sanitizeRef(ref: HubSpotPropertyRef): HubSpotPropertyRef {
  if (ref.mode === 'new') {
    return { ...ref, definition: { ...ref.definition, options: cleanOptions(ref.definition.options) } };
  }
  if (ref.definition) {
    return { ...ref, definition: { ...ref.definition, options: cleanOptions(ref.definition.options) } };
  }
  return ref;
}

export interface PropertyServiceDeps {
  store: PropertyStore;
  propertiesApiFor: (projectId: string) => PropertiesApi;
  objectsApiFor: (projectId: string) => ObjectsApi;
  newId: () => string;
  now: () => string;
}

function entryDestName(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'existing'
    ? entry.hubspotProperty.hubspotName
    : entry.hubspotProperty.definition.hubspotName;
}

function toDef(remote: RemoteProperty): HubSpotPropertyDef {
  return {
    hubspotName: remote.name,
    label: remote.label,
    type: remote.type,
    fieldType: remote.fieldType,
    groupName: remote.groupName,
    options: remote.options,
  };
}

/** Extrae el mensaje de error útil que devuelve HubSpot (body de la respuesta 4xx). */
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

export function createPropertyService(deps: PropertyServiceDeps) {
  const isoNow = deps.now ?? (() => new Date().toISOString());

  function changeFactory() {
    return { newId: deps.newId, now: deps.now };
  }

  function markChanged(projectId: string): void {
    const timestamps = deps.store.getTimestamps(projectId);
    deps.store.setTimestamps(projectId, { ...timestamps, lastChangedAt: isoNow() });
  }

  function listObjects(input: ProjectScopedInput): Promise<HubSpotObject[]> {
    return deps.objectsApiFor(input.projectId).listObjects();
  }

  async function listHubSpotProperties(input: HubSpotPropertiesInput): Promise<HubSpotPropertyDef[]> {
    const remotes = await deps.propertiesApiFor(input.projectId).listProperties(input.objectType);
    return remotes.map(toDef);
  }

  function listGroups(input: GroupsListInput): Promise<HubSpotGroup[]> {
    return deps.propertiesApiFor(input.projectId).listGroups(input.objectType);
  }

  function createGroup(input: GroupCreateInput): Promise<HubSpotGroup> {
    return deps
      .propertiesApiFor(input.projectId)
      .createGroup(input.objectType, { name: input.name, label: input.label });
  }

  function listEntries(input: EntriesListInput): PropertyEntry[] {
    const entries = deps.store.get(input.projectId).entries;
    return input.objectType
      ? entries.filter((entry) => entry.objectType === input.objectType)
      : entries;
  }

  function upsertEntry(input: EntryUpsertInput): PropertyEntry {
    const state = deps.store.get(input.projectId);
    const incoming = input.entry;
    const existing = incoming.id ? state.entries.find((e) => e.id === incoming.id) : undefined;
    const entry: PropertyEntry = {
      id: existing?.id ?? deps.newId(),
      objectType: incoming.objectType,
      name: incoming.name,
      hubspotProperty: sanitizeRef(incoming.hubspotProperty),
      sources: incoming.sources.map((source) => ({ ...source, id: source.id || deps.newId() })),
      hubspotStatus:
        existing?.hubspotStatus ?? (incoming.hubspotProperty.mode === 'existing' ? 'exists' : 'missing'),
      pendingChanges: existing?.pendingChanges ?? [],
    };
    const entries = existing
      ? state.entries.map((e) => (e.id === entry.id ? entry : e))
      : [...state.entries, entry];
    deps.store.set(input.projectId, { ...state, entries });
    markChanged(input.projectId);
    return entry;
  }

  function deleteEntry(input: EntryDeleteInput): OperationResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      entries: state.entries.filter((e) => e.id !== input.entryId),
    });
    markChanged(input.projectId);
    return { success: true };
  }

  async function syncHubspot(input: ProjectScopedInput): Promise<PropertiesSyncResult> {
    const state = deps.store.get(input.projectId);
    const api = deps.propertiesApiFor(input.projectId);
    const objectTypes = Array.from(new Set(state.entries.map((e) => e.objectType)));

    const remotes: RemoteProperty[] = [];
    for (const objectType of objectTypes) {
      remotes.push(...(await api.listProperties(objectType)));
    }

    const result = reconcileEntries(state.entries, remotes, changeFactory());
    deps.store.set(input.projectId, { ...state, entries: result.entries });
    markChanged(input.projectId);
    return result.summary;
  }

  async function applyChange(input: ApplyChangeInput): Promise<ApplyChangeResult> {
    const state = deps.store.get(input.projectId);
    const entry = state.entries.find((e) =>
      e.pendingChanges?.some((change) => change.id === input.changeId),
    );
    const change = entry?.pendingChanges?.find((c) => c.id === input.changeId);
    if (!entry || !change) return { success: false, error: 'Cambio no encontrado' };

    const api = deps.propertiesApiFor(input.projectId);
    try {
      if (change.operation === 'create') {
        await api.createProperty(entry.objectType, change.payload, input.environment);
      } else {
        await api.patchProperty(
          entry.objectType,
          entryDestName(entry),
          change.payload,
          input.environment,
        );
      }
    } catch (error) {
      return { success: false, error: hubspotErrorMessage(error) };
    }

    const updatedChange = markApplied(change, input.environment);
    const entries = state.entries.map((e) =>
      e.id === entry.id
        ? {
            ...e,
            pendingChanges: e.pendingChanges?.map((c) =>
              c.id === input.changeId ? updatedChange : c,
            ),
          }
        : e,
    );
    deps.store.set(input.projectId, { ...state, entries });
    markChanged(input.projectId);
    return { success: true };
  }

  function discardChange(input: DiscardChangeInput): OperationResult {
    const state = deps.store.get(input.projectId);
    const entries = state.entries.map((e) => ({
      ...e,
      pendingChanges: e.pendingChanges?.filter((c) => c.id !== input.changeId),
    }));
    deps.store.set(input.projectId, { ...state, entries });
    markChanged(input.projectId);
    return { success: true };
  }

  function listOrigins(input: ProjectScopedInput): DataOrigin[] {
    return deps.store.get(input.projectId).origins;
  }

  function createOrigin(input: OriginCreateInput): DataOrigin {
    const state = deps.store.get(input.projectId);
    const origin: DataOrigin = {
      id: deps.newId(),
      name: input.origin.name,
      type: input.origin.type,
      description: input.origin.description,
      objects: [],
      createdAt: deps.now(),
    };
    deps.store.set(input.projectId, { ...state, origins: [...state.origins, origin] });
    markChanged(input.projectId);
    return origin;
  }

  function updateOrigin(input: OriginUpdateInput): DataOrigin {
    const state = deps.store.get(input.projectId);
    const origins = state.origins.map((origin) =>
      origin.id === input.origin.id ? { ...origin, ...input.origin } : origin,
    );
    deps.store.set(input.projectId, { ...state, origins });
    markChanged(input.projectId);
    return input.origin;
  }

  function deleteOrigin(input: OriginDeleteInput): OperationResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      origins: state.origins.filter((origin) => origin.id !== input.originId),
      entries: state.entries.map((entry) => ({
        ...entry,
        sources: entry.sources.filter((source) => source.originId !== input.originId),
      })),
    });
    markChanged(input.projectId);
    return { success: true };
  }

  function exportJson(input: ExportJsonInput): OriginExport {
    const state = deps.store.get(input.projectId);
    const origin = state.origins.find((o) => o.id === input.originId);
    if (!origin) throw new Error('Origen no encontrado');
    return buildOriginExport({ origin, entries: state.entries, now: deps.now });
  }

  function getDriveMeta(input: ProjectScopedInput): DriveDocMeta {
    const timestamps = deps.store.getTimestamps(input.projectId);
    return {
      lastWrittenAt: timestamps.lastWrittenAt,
      lastChangedAt: timestamps.lastChangedAt,
    };
  }

  function markDriveWritten(input: ProjectScopedInput): void {
    const timestamps = deps.store.getTimestamps(input.projectId);
    deps.store.setTimestamps(input.projectId, { ...timestamps, lastWrittenAt: isoNow() });
  }

  function applyDriveState(input: ProjectScopedInput, state: PropertyDriveState): void {
    const current = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...current,
      entries: state.entries,
      origins: state.origins,
    });
    const stamp = isoNow();
    deps.store.setTimestamps(input.projectId, { lastWrittenAt: stamp, lastChangedAt: stamp });
  }

  return {
    listObjects,
    listHubSpotProperties,
    listGroups,
    createGroup,
    listEntries,
    upsertEntry,
    deleteEntry,
    syncHubspot,
    applyChange,
    discardChange,
    listOrigins,
    createOrigin,
    updateOrigin,
    deleteOrigin,
    exportJson,
    getDriveMeta,
    markDriveWritten,
    applyDriveState,
  };
}

export type PropertyService = ReturnType<typeof createPropertyService>;
