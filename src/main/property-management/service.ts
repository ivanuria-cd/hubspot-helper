/**
 * Servicio de gestión de propiedades (SPEC-0006, rediseño §16). Orquesta el store local de
 * entradas, el conector HubSpot (propiedades + objetos), la reconciliación y la exportación.
 * Nunca aplica cambios en HubSpot sin confirmación explícita del usuario.
 * NOTA: el volcado al Google Sheets queda diferido hasta resolver la conexión de Drive.
 */
import type {
  ApplyChangeInput,
  ApplyChangeResult,
  ConvertEntryInput,
  ConvertEntryResult,
  ConvertMissingInput,
  ConvertMissingResult,
  DataOrigin,
  DiscardChangeInput,
  EntriesListInput,
  EntryDeleteInput,
  EntryUpsertInput,
  ExportJsonInput,
  GroupApplyChangeInput,
  GroupChangesListInput,
  GroupCreateInput,
  GroupDeleteChange,
  GroupDeleteRequestInput,
  GroupDiscardChangeInput,
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
import { markApplied, cleanOptions, diffDefinition } from './pending-changes';
import { EntryValidationError, validateEntryInput } from './entry-validation';
import { isSystemProperty } from './system-properties';
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
  const ref = entry.hubspotProperty as unknown as {
    mode?: string;
    hubspotName?: string;
    definition?: { hubspotName?: string };
  };
  if (!ref || typeof ref !== 'object') return '';
  if (ref.mode === 'existing') return ref.hubspotName ?? '';
  return ref.definition?.hubspotName ?? '';
}


function toDef(remote: RemoteProperty): HubSpotPropertyDef {
  return {
    hubspotName: remote.name,
    label: remote.label,
    type: remote.type,
    fieldType: remote.fieldType,
    groupName: remote.groupName,
    options: remote.options,
    description: remote.description,
    numberDisplayHint: remote.numberDisplayHint,
    showCurrencySymbol: remote.showCurrencySymbol,
    currencyPropertyName: remote.currencyPropertyName,
    textDisplayHint: remote.textDisplayHint,
    calculationFormula: remote.calculationFormula,
    hasUniqueValue: remote.hasUniqueValue,
    dataSensitivity: remote.dataSensitivity,
    externalOptions: remote.externalOptions,
    referencedObjectType: remote.referencedObjectType,
    formField: remote.formField,
  };
}

/**
 * Traduce el error de HubSpot a un mensaje accionable según el status/categoría (SPEC-0006 §39.9),
 * conservando el detalle del body.
 */
function hubspotErrorMessage(error: unknown): string {
  const e = error as {
    response?: {
      status?: number;
      data?: { message?: string; category?: string; errors?: Array<{ message?: string }> };
    };
    message?: string;
  };
  const status = e?.response?.status;
  const data = e?.response?.data;
  const base =
    data?.message ||
    (data?.errors ?? []).map((x) => x.message).filter(Boolean).join('; ') ||
    e?.message ||
    'Error en HubSpot';
  if (status === 401) return `Token de HubSpot no válido o caducado: revisa el PAT del entorno. (${base})`;
  if (status === 403)
    return `Permisos insuficientes: al token le faltan scopes para esta operación. (${base})`;
  if (status === 429) return `Límite de peticiones de HubSpot alcanzado; reintenta en unos segundos. (${base})`;
  if (status === 409 || data?.category === 'OBJECT_ALREADY_EXISTS')
    return `La propiedad ya existe en el entorno destino. (${base})`;
  if (status === 400) return `HubSpot rechazó la petición (datos inválidos): ${base}`;
  return base;
}

/** Detecta el error de HubSpot «la propiedad ya existe» para tratar el create como idempotente (§38). */
function isAlreadyExists(error: unknown): boolean {
  const e = error as {
    response?: { status?: number; data?: { category?: string; message?: string } };
    message?: string;
  };
  const status = e?.response?.status;
  const category = e?.response?.data?.category;
  const message = e?.response?.data?.message ?? e?.message ?? '';
  return status === 409 || category === 'OBJECT_ALREADY_EXISTS' || /already exists/i.test(message);
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
    const issues = validateEntryInput(input.entry);
    if (issues.length > 0) throw new EntryValidationError(issues);
    const state = deps.store.get(input.projectId);
    const incoming = input.entry;
    const validOrigins = new Set(state.origins.map((o) => o.id));
    for (const source of incoming.sources) {
      if (source.originId && !validOrigins.has(source.originId)) {
        throw new Error(`Origen no encontrado: ${source.originId}`);
      }
    }
    const existing = incoming.id ? state.entries.find((e) => e.id === incoming.id) : undefined;
    const ref = sanitizeRef(incoming.hubspotProperty);

    // Colisión: dos entradas distintas que CREAN la misma propiedad nueva son un duplicado real
    // (varias entradas pueden compartir una propiedad existente, pero no dos creaciones del mismo
    // nombre). Evita los `create` duplicados por truncado de nombre (SPEC-0006 §44).
    if (ref.mode === 'new') {
      const dup = state.entries.find(
        (e) =>
          e.id !== existing?.id &&
          e.objectType === incoming.objectType &&
          e.hubspotProperty.mode === 'new' &&
          e.hubspotProperty.definition.hubspotName === ref.definition.hubspotName,
      );
      if (dup) {
        throw new EntryValidationError([
          {
            code: 'HUBSPOTNAME_COLLISION',
            field: 'hubspotProperty.definition.hubspotName',
            message: `otra entrada nueva («${dup.name}») ya crea «${ref.definition.hubspotName}» en ${incoming.objectType}.`,
          },
        ]);
      }
    }

    // Idempotencia: si cambia el destino o la definición respecto a la entrada existente, los
    // cambios pendientes previos quedan huérfanos; se resetean para que `syncHubspot` los regenere
    // limpios (SPEC-0006 §41). Editar solo `name`/`sources` los preserva.
    const refUnchanged =
      existing !== undefined && JSON.stringify(existing.hubspotProperty) === JSON.stringify(ref);
    const entry: PropertyEntry = {
      id: existing?.id ?? deps.newId(),
      objectType: incoming.objectType,
      name: incoming.name,
      hubspotProperty: ref,
      sources: incoming.sources.map((source) => ({ ...source, id: source.id || deps.newId() })),
      hubspotStatus: refUnchanged
        ? (existing as PropertyEntry).hubspotStatus
        : incoming.hubspotProperty.mode === 'existing'
          ? 'exists'
          : 'missing',
      pendingChanges: refUnchanged ? (existing?.pendingChanges ?? []) : [],
      pendingDelete: refUnchanged ? existing?.pendingDelete : undefined,
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
    const failedObjects = new Set<string>();
    for (const objectType of objectTypes) {
      try {
        // El estado (exists/missing/divergent) se reconcilia SIEMPRE contra producción (SPEC-0006 §37),
        // con independencia del entorno activo. Aplicar cambios sigue usando el entorno elegido.
        remotes.push(...(await api.listProperties(objectType, 'production')));
      } catch {
        // Un objeto inaccesible (p. ej. custom archivado/inexistente) no debe abortar el sync;
        // se salta y sus entradas quedan intactas (no se reconcilian contra remotos vacíos).
        failedObjects.add(objectType);
      }
    }

    const reconcilable = state.entries.filter((e) => !failedObjects.has(e.objectType));
    const skipped = state.entries.filter((e) => failedObjects.has(e.objectType));
    const result = reconcileEntries(reconcilable, remotes, changeFactory());
    deps.store.set(input.projectId, { ...state, entries: [...result.entries, ...skipped] });
    markChanged(input.projectId);
    return { ...result.summary, blockers: result.blockers };
  }

  /**
   * Convierte una entrada de modo `existing` (que apunta a algo inexistente) a modo `new`
   * para que la siguiente sincronización genere el cambio `create` (SPEC-0006 §35.4).
   */
  function convertEntryToNew(input: ConvertEntryInput): ConvertEntryResult {
    const state = deps.store.get(input.projectId);
    const target = state.entries.find((e) => e.id === input.entryId);
    if (!target) return { success: false, error: 'Entrada no encontrada' };
    const ref = target.hubspotProperty;
    if (ref.mode === 'new') return { success: true, seeded: false };

    const seeded = !ref.definition;
    const base: HubSpotPropertyDef = ref.definition ?? {
      hubspotName: ref.hubspotName,
      label: target.name,
      type: 'string',
      fieldType: 'text',
      groupName: '',
    };
    const definition: HubSpotPropertyDef = {
      ...base,
      hubspotName: base.hubspotName || ref.hubspotName,
    };
    const entries = state.entries.map((e) =>
      e.id === target.id
        ? { ...e, hubspotProperty: { mode: 'new' as const, definition }, hubspotStatus: 'missing' as const }
        : e,
    );
    deps.store.set(input.projectId, { ...state, entries });
    markChanged(input.projectId);
    return { success: true, seeded };
  }

  /** Convierte en bloque todas las entradas en `missing` + modo `existing` (SPEC-0006 §35.4). */
  function convertMissingToNew(input: ConvertMissingInput): ConvertMissingResult {
    const targets = deps.store
      .get(input.projectId)
      .entries.filter(
        (e) =>
          e.hubspotStatus === 'missing' &&
          e.hubspotProperty.mode === 'existing' &&
          // Las propiedades de sistema no se recrean (§43): se excluyen de la conversión en bloque.
          !isSystemProperty(e.objectType, entryDestName(e)) &&
          (!input.objectType || e.objectType === input.objectType),
      );
    let converted = 0;
    let seeded = 0;
    for (const t of targets) {
      const r = convertEntryToNew({ projectId: input.projectId, entryId: t.id });
      if (r.success) {
        converted += 1;
        if (r.seeded) seeded += 1;
      }
    }
    return { converted, seeded };
  }

  /** Garantiza que el grupo de la propiedad existe en el entorno destino antes de crearla (H2). */
  async function ensureGroup(
    api: PropertiesApi,
    objectType: string,
    groupName: string | undefined,
    environment: ApplyChangeInput['environment'],
  ): Promise<void> {
    if (!groupName) return;
    const groups = await api.listGroups(objectType, environment);
    if (groups.some((g) => g.name === groupName)) return;
    await api.createGroup(objectType, { name: groupName, label: groupName }, environment);
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
        const groupName = (change.payload as { groupName?: string }).groupName;
        await ensureGroup(api, entry.objectType, groupName, input.environment);
        try {
          await api.createProperty(entry.objectType, change.payload, input.environment);
        } catch (error) {
          // El estado se reconcilia contra producción (§37); la propiedad puede existir ya en el
          // entorno destino (p. ej. sandbox). En ese caso, en vez de fallar, se reconcilia contra la
          // propiedad existente en ESE entorno y se aplica el update equivalente (§38).
          if (!isAlreadyExists(error)) throw error;
          const def = entry.hubspotProperty.definition;
          if (def) {
            const remotes = await api.listProperties(entry.objectType, input.environment);
            const remote = remotes.find((r) => r.name === def.hubspotName);
            if (remote) {
              for (const update of diffDefinition(entry.id, def, remote, changeFactory())) {
                await api.patchProperty(entry.objectType, def.hubspotName, update.payload, input.environment);
              }
            }
          }
        }
      } else if (change.operation === 'delete') {
        await api.deleteProperty(entry.objectType, entryDestName(entry), input.environment);
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
    // Un archivado aplicado a producción se completa: se limpia la solicitud para no regenerarlo.
    const clearDelete = change.operation === 'delete' && input.environment === 'production';
    const entries = state.entries.map((e) =>
      e.id === entry.id
        ? {
            ...e,
            ...(clearDelete ? { pendingDelete: false } : {}),
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

  /** Solicita archivar la propiedad destino de una entrada en HubSpot (genera un cambio `delete` al sincronizar). */
  function requestDelete(input: { projectId: string; entryId: string }): OperationResult {
    const state = deps.store.get(input.projectId);
    const target = state.entries.find((e) => e.id === input.entryId);
    if (!target) return { success: false, error: 'Entrada no encontrada' };
    const entries = state.entries.map((e) =>
      e.id === input.entryId ? { ...e, pendingDelete: true } : e,
    );
    deps.store.set(input.projectId, { ...state, entries });
    markChanged(input.projectId);
    return { success: true };
  }

  function discardChange(input: DiscardChangeInput): OperationResult {
    const state = deps.store.get(input.projectId);
    const exists = state.entries.some((e) =>
      e.pendingChanges?.some((c) => c.id === input.changeId),
    );
    if (!exists) return { success: false, error: 'Cambio no encontrado' };
    const entries = state.entries.map((e) => ({
      ...e,
      pendingChanges: e.pendingChanges?.filter((c) => c.id !== input.changeId),
    }));
    deps.store.set(input.projectId, { ...state, entries });
    markChanged(input.projectId);
    return { success: true };
  }

  // --- Borrado de grupos de propiedades (SPEC-0006 §33): destructivo, cambio pendiente por proyecto. ---

  /** Solicita borrar un grupo: crea un cambio pendiente (no borra al instante). */
  function requestGroupDelete(input: GroupDeleteRequestInput): OperationResult {
    const state = deps.store.get(input.projectId);
    const exists = state.groupChanges.some(
      (c) => c.objectType === input.objectType && c.groupName === input.groupName,
    );
    if (exists) return { success: false, error: 'Ya hay un borrado pendiente para ese grupo' };
    const change: GroupDeleteChange = {
      id: deps.newId(),
      objectType: input.objectType,
      groupName: input.groupName,
      label: input.label,
      summary: `Borrar grupo «${input.label ?? input.groupName}» en ${input.objectType}`,
      appliedToSandbox: false,
      appliedToProduction: false,
      createdAt: deps.now(),
    };
    deps.store.set(input.projectId, { ...state, groupChanges: [...state.groupChanges, change] });
    markChanged(input.projectId);
    return { success: true };
  }

  function listGroupChanges(input: GroupChangesListInput): GroupDeleteChange[] {
    return deps.store.get(input.projectId).groupChanges;
  }

  /** Aplica un borrado de grupo en el entorno indicado. Precondición: el grupo debe estar vacío. */
  async function applyGroupChange(input: GroupApplyChangeInput): Promise<ApplyChangeResult> {
    const state = deps.store.get(input.projectId);
    const change = state.groupChanges.find((c) => c.id === input.changeId);
    if (!change) return { success: false, error: 'Cambio no encontrado' };

    const api = deps.propertiesApiFor(input.projectId);
    try {
      const remotes = await api.listProperties(change.objectType, input.environment);
      const stillUsed = remotes.some((p) => p.groupName === change.groupName);
      if (stillUsed) {
        return {
          success: false,
          error: 'El grupo no está vacío: mueve o archiva sus propiedades antes de borrarlo.',
        };
      }
      await api.deleteGroup(change.objectType, change.groupName, input.environment);
    } catch (error) {
      return { success: false, error: hubspotErrorMessage(error) };
    }

    // Aplicado a producción ⇒ completado: se retira. En sandbox ⇒ se marca el flag.
    const groupChanges =
      input.environment === 'production'
        ? state.groupChanges.filter((c) => c.id !== input.changeId)
        : state.groupChanges.map((c) =>
            c.id === input.changeId ? { ...c, appliedToSandbox: true } : c,
          );
    deps.store.set(input.projectId, { ...state, groupChanges });
    markChanged(input.projectId);
    return { success: true };
  }

  function discardGroupChange(input: GroupDiscardChangeInput): OperationResult {
    const state = deps.store.get(input.projectId);
    const exists = state.groupChanges.some((c) => c.id === input.changeId);
    if (!exists) return { success: false, error: 'Cambio no encontrado' };
    deps.store.set(input.projectId, {
      ...state,
      groupChanges: state.groupChanges.filter((c) => c.id !== input.changeId),
    });
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
    convertEntryToNew,
    convertMissingToNew,
    applyChange,
    discardChange,
    requestDelete,
    requestGroupDelete,
    listGroupChanges,
    applyGroupChange,
    discardGroupChange,
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
