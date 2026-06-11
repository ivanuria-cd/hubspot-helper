/**
 * Servicio de gestión de propiedades (SPEC-0006). Orquesta el store local, el conector
 * HubSpot (CRM Properties API v3), la reconciliación y el volcado al Google Sheets.
 * Nunca aplica cambios en HubSpot sin que el usuario lo pida explícitamente.
 */
import type {
  ApplyChangeInput,
  ApplyChangeResult,
  DataOrigin,
  DiscardChangeInput,
  ExportJsonInput,
  HubSpotProperty,
  MappingDeleteInput,
  MappingUpsertInput,
  MappingsListInput,
  OperationResult,
  OriginCreateInput,
  OriginDeleteInput,
  OriginExport,
  OriginUpdateInput,
  ProjectScopedInput,
  PropertiesSyncResult,
  PropertyOriginMapping,
  PropertyUpsertInput,
} from '@shared/types/properties';
import type { PropertiesApi, RemoteProperty } from '../connectors/hubspot/properties';
import type { PropertyStore } from './store';
import { reconcile } from './reconcile';
import { markApplied } from './pending-changes';
import { buildOriginExport } from './origin-export';
import type { SheetTab } from '../connectors/google-drive/sheets-client';
import { buildSheetsModel } from './sheets-model';

const DEFAULT_OBJECT_TYPES = ['contacts', 'deals', 'companies'];

export interface SheetSink {
  /** Vuelca el mapa al Sheets de Drive. Best-effort: no debe romper el flujo si Drive no está. */
  write(projectId: string, name: string, schemaVersion: number, tabs: SheetTab[]): Promise<void>;
}

export interface PropertyServiceDeps {
  store: PropertyStore;
  propertiesApiFor: (projectId: string) => PropertiesApi;
  projectName: (projectId: string) => string;
  sheetSink?: SheetSink;
  newId: () => string;
  now: () => string;
}

export function createPropertyService(deps: PropertyServiceDeps) {
  function changeFactory() {
    return { newId: deps.newId, now: deps.now };
  }

  async function persistToSheets(projectId: string): Promise<void> {
    if (!deps.sheetSink) return;
    const state = deps.store.get(projectId);
    const model = buildSheetsModel({
      projectName: deps.projectName(projectId),
      origins: state.origins,
      properties: state.properties,
      mappings: state.mappings,
      generatedAt: deps.now(),
    });
    try {
      await deps.sheetSink.write(projectId, 'Mapa de Propiedades', model.schemaVersion, model.tabs);
    } catch {
      // Volcado best-effort: si Drive no está conectado, el estado local sigue siendo válido.
    }
  }

  function listProperties(input: ProjectScopedInput): HubSpotProperty[] {
    return deps.store.get(input.projectId).properties;
  }

  async function upsertProperty(input: PropertyUpsertInput): Promise<HubSpotProperty> {
    const state = deps.store.get(input.projectId);
    const incoming = input.property;
    const existing = incoming.id
      ? state.properties.find((p) => p.id === incoming.id)
      : undefined;
    const property: HubSpotProperty = {
      id: existing?.id ?? deps.newId(),
      hubspotName: incoming.hubspotName,
      label: incoming.label,
      objectType: incoming.objectType,
      type: incoming.type,
      fieldType: incoming.fieldType,
      groupName: incoming.groupName,
      isCustom: incoming.isCustom ?? true,
      description: incoming.description,
      options: incoming.options,
      hubspotStatus: existing?.hubspotStatus ?? 'missing',
      pendingChanges: existing?.pendingChanges ?? [],
    };
    const properties = existing
      ? state.properties.map((p) => (p.id === property.id ? property : p))
      : [...state.properties, property];
    deps.store.set(input.projectId, { ...state, properties });
    await persistToSheets(input.projectId);
    return property;
  }

  async function syncHubspot(input: ProjectScopedInput): Promise<PropertiesSyncResult> {
    const state = deps.store.get(input.projectId);
    const api = deps.propertiesApiFor(input.projectId);

    const objectTypes = Array.from(
      new Set(
        state.properties.length
          ? state.properties.map((property) => property.objectType)
          : DEFAULT_OBJECT_TYPES,
      ),
    );

    const remoteByObject = new Map<string, RemoteProperty[]>();
    for (const objectType of objectTypes) {
      remoteByObject.set(objectType, await api.listProperties(objectType));
    }

    // Importa propiedades remotas que aún no estén en el mapa (estado exists).
    const knownNames = new Set(state.properties.map((p) => `${p.objectType}:${p.hubspotName}`));
    const imported: HubSpotProperty[] = [];
    for (const [objectType, remotes] of remoteByObject) {
      for (const remote of remotes) {
        if (knownNames.has(`${objectType}:${remote.name}`)) continue;
        imported.push({
          id: deps.newId(),
          hubspotName: remote.name,
          label: remote.label,
          objectType,
          type: remote.type,
          fieldType: remote.fieldType,
          groupName: remote.groupName,
          isCustom: !remote.hubspotDefined,
          description: remote.description,
          options: remote.options,
          hubspotStatus: 'exists',
          pendingChanges: [],
        });
      }
    }

    const allRemotes = Array.from(remoteByObject.values()).flat();
    const result = reconcile([...state.properties, ...imported], allRemotes, changeFactory());

    deps.store.set(input.projectId, { ...state, properties: result.properties });
    await persistToSheets(input.projectId);
    return result.summary;
  }

  async function applyChange(input: ApplyChangeInput): Promise<ApplyChangeResult> {
    const state = deps.store.get(input.projectId);
    const property = state.properties.find((p) =>
      p.pendingChanges?.some((change) => change.id === input.changeId),
    );
    const change = property?.pendingChanges?.find((c) => c.id === input.changeId);
    if (!property || !change) return { success: false, error: 'Cambio no encontrado' };

    const api = deps.propertiesApiFor(input.projectId);
    try {
      if (change.operation === 'create') {
        await api.createProperty(property.objectType, change.payload, input.environment);
      } else {
        await api.patchProperty(
          property.objectType,
          property.hubspotName,
          change.payload,
          input.environment,
        );
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error en HubSpot' };
    }

    const updatedChange = markApplied(change, input.environment);
    const properties = state.properties.map((p) =>
      p.id === property.id
        ? {
            ...p,
            pendingChanges: p.pendingChanges?.map((c) =>
              c.id === input.changeId ? updatedChange : c,
            ),
          }
        : p,
    );
    deps.store.set(input.projectId, { ...state, properties });
    await persistToSheets(input.projectId);
    return { success: true };
  }

  async function discardChange(input: DiscardChangeInput): Promise<OperationResult> {
    const state = deps.store.get(input.projectId);
    const properties = state.properties.map((p) => ({
      ...p,
      pendingChanges: p.pendingChanges?.filter((c) => c.id !== input.changeId),
    }));
    deps.store.set(input.projectId, { ...state, properties });
    await persistToSheets(input.projectId);
    return { success: true };
  }

  function listOrigins(input: ProjectScopedInput): DataOrigin[] {
    return deps.store.get(input.projectId).origins;
  }

  async function createOrigin(input: OriginCreateInput): Promise<DataOrigin> {
    const state = deps.store.get(input.projectId);
    const origin: DataOrigin = {
      id: deps.newId(),
      name: input.origin.name,
      type: input.origin.type,
      description: input.origin.description,
      createdAt: deps.now(),
    };
    deps.store.set(input.projectId, { ...state, origins: [...state.origins, origin] });
    await persistToSheets(input.projectId);
    return origin;
  }

  async function updateOrigin(input: OriginUpdateInput): Promise<DataOrigin> {
    const state = deps.store.get(input.projectId);
    const origins = state.origins.map((origin) =>
      origin.id === input.origin.id ? { ...origin, ...input.origin } : origin,
    );
    deps.store.set(input.projectId, { ...state, origins });
    await persistToSheets(input.projectId);
    return input.origin;
  }

  async function deleteOrigin(input: OriginDeleteInput): Promise<OperationResult> {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      origins: state.origins.filter((origin) => origin.id !== input.originId),
      mappings: state.mappings.filter((mapping) => mapping.originId !== input.originId),
    });
    await persistToSheets(input.projectId);
    return { success: true };
  }

  function listMappings(input: MappingsListInput): PropertyOriginMapping[] {
    const mappings = deps.store.get(input.projectId).mappings;
    return input.propertyId
      ? mappings.filter((mapping) => mapping.propertyId === input.propertyId)
      : mappings;
  }

  async function upsertMapping(input: MappingUpsertInput): Promise<PropertyOriginMapping> {
    const state = deps.store.get(input.projectId);
    const mapping: PropertyOriginMapping = {
      id: input.mapping.id ?? deps.newId(),
      propertyId: input.mapping.propertyId,
      originId: input.mapping.originId,
      sourceField: input.mapping.sourceField,
      transformations: input.mapping.transformations ?? [],
      notes: input.mapping.notes,
    };
    const existingIndex = state.mappings.findIndex((m) => m.id === mapping.id);
    const mappings =
      existingIndex >= 0
        ? state.mappings.map((m) => (m.id === mapping.id ? mapping : m))
        : [...state.mappings, mapping];
    deps.store.set(input.projectId, { ...state, mappings });
    await persistToSheets(input.projectId);
    return mapping;
  }

  async function deleteMapping(input: MappingDeleteInput): Promise<OperationResult> {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      mappings: state.mappings.filter((mapping) => mapping.id !== input.mappingId),
    });
    await persistToSheets(input.projectId);
    return { success: true };
  }

  function exportJson(input: ExportJsonInput): OriginExport {
    const state = deps.store.get(input.projectId);
    const origin = state.origins.find((o) => o.id === input.originId);
    if (!origin) throw new Error('Origen no encontrado');
    return buildOriginExport({
      origin,
      properties: state.properties,
      mappings: state.mappings,
      now: deps.now,
    });
  }

  return {
    listProperties,
    upsertProperty,
    syncHubspot,
    applyChange,
    discardChange,
    listOrigins,
    createOrigin,
    updateOrigin,
    deleteOrigin,
    listMappings,
    upsertMapping,
    deleteMapping,
    exportJson,
  };
}

export type PropertyService = ReturnType<typeof createPropertyService>;
