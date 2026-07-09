/**
 * Ingest del mapa de campos editable (SPEC-0016 2.6 / D3). Parsea las pestanas leidas del
 * documento y las compara con el estado del proyecto para producir un PlanningChangelog
 * (altas/bajas/cambios de mapeo o definicion + tipos que "necesitan accion", D6). NO crea
 * borradores: solo describe los cambios para alerta y confirmacion previa. Puro y testeable;
 * no importa el builder (evita acoplar el layout) ni ficheros con mirror corrupto en sandbox.
 * ASCII intencionado. Erratas reflejadas tal cual.
 */
import type {
  DataOrigin,
  EntryUpsertInput,
  PropertyEntry,
  SourceFieldKind,
} from '@shared/types/properties';
import type {
  HubSpotFieldConfig,
  PlanningChange,
  PlanningChangelog,
  PlanningNeedsAction,
  PlanningResolution,
  UserFriendlyFieldTypeKey,
} from '@shared/types/planning';
import {
  configsFor,
  isAmbiguous,
  resolveUserFriendlyType,
  userFriendlyFieldType,
} from '@shared/constants/planningFieldTypes';
import { entryDestName as destName } from './dest-name';
import { PLANNING_META_TITLE } from './planning-meta';
import { defOf, typeDisplay } from './planning-defs';

export type CellValue = string | number | boolean;

export interface ReadTab {
  title: string;
  rows: CellValue[][];
}

export interface ParsedPlanningSource {
  originId: string;
  originName: string;
  sourceField: string;
  originType: string;
  comments: string;
}

export interface ParsedPlanningEntry {
  objectType: string;
  custom: string;
  name: string;
  internalName: string;
  type: string; // valor de la columna Type: key user-friendly (D6) o tipo tecnico
  sources: ParsedPlanningSource[];
}

export interface PlanningState {
  entries: PropertyEntry[];
  origins: DataOrigin[];
}

const FIELD_NAME_SUFFIX = ' Field name';

function cell(row: CellValue[], index: number): string {
  if (index < 0 || index >= row.length) return '';
  const value = row[index];
  return value === undefined || value === null ? '' : String(value).trim();
}

function isObjectTab(tab: ReadTab): boolean {
  return cell(tab.rows[0] ?? [], 0) === 'Custom';
}

function isUserFriendlyKey(value: string): value is UserFriendlyFieldTypeKey {
  return userFriendlyFieldType(value as UserFriendlyFieldTypeKey) !== undefined;
}

/**
 * SPEC-0006 §53.6: lee la hoja de metadatos `00_Metadatos` (titulo de pestana -> objectType real).
 * Vacia si no existe (mapas generados antes del schema 2): el llamador cae al titulo.
 */
function objectTypeByTitle(tabs: ReadTab[]): Map<string, string> {
  const map = new Map<string, string>();
  const meta = tabs.find((tab) => tab.title === PLANNING_META_TITLE);
  if (!meta) return map;
  for (const row of meta.rows.slice(1)) {
    const title = cell(row, 0);
    const objectType = cell(row, 1);
    if (title && objectType) map.set(title, objectType);
  }
  return map;
}

/** Parsea las pestanas de objeto (cabecera con 'Custom' en A1) a entradas estructuradas. */
export function parsePlanningTabs(tabs: ReadTab[], origins: DataOrigin[]): ParsedPlanningEntry[] {
  const parsed: ParsedPlanningEntry[] = [];
  // §53.6: el objectType real viene de la hoja de metadatos; el titulo saneado es solo el fallback.
  const objectTypeMap = objectTypeByTitle(tabs);
  for (const tab of tabs) {
    if (!isObjectTab(tab)) continue;
    const header = (tab.rows[0] ?? []).map((c) => String(c ?? '').trim());
    const nameIdx = header.indexOf('Name');
    const internalIdx = header.indexOf('Internal name');
    const typeIdx = header.indexOf('Type');
    const originCols = origins
      .map((origin) => ({ origin, col: header.indexOf(`${origin.name}${FIELD_NAME_SUFFIX}`) }))
      .filter((o) => o.col >= 0);

    for (const row of tab.rows.slice(1)) {
      const name = cell(row, nameIdx);
      const internalName = cell(row, internalIdx);
      const sources: ParsedPlanningSource[] = [];
      for (const { origin, col } of originCols) {
        const sourceField = cell(row, col);
        if (!sourceField) continue;
        sources.push({
          originId: origin.id,
          originName: origin.name,
          sourceField,
          originType: cell(row, col + 1),
          comments: cell(row, col + 2),
        });
      }
      if (!name && !internalName && sources.length === 0) continue; // fila en blanco
      parsed.push({
        objectType: objectTypeMap.get(tab.title) ?? tab.title,
        custom: cell(row, 0),
        name,
        internalName,
        type: cell(row, typeIdx),
        sources,
      });
    }
  }
  return parsed;
}

function entryKey(objectType: string, dest: string, name: string): string {
  return dest ? `${objectType}|${dest}` : `${objectType}|name:${name}`;
}

function currentSourceFields(entry: PropertyEntry): Map<string, string> {
  const map = new Map<string, string>();
  for (const source of entry.sources) map.set(source.originId, source.sourceField);
  return map;
}

/** Compara el mapa parseado con el estado y devuelve el changelog (sin crear borradores). */
export function buildPlanningChangelog(
  parsed: ParsedPlanningEntry[],
  state: PlanningState,
): PlanningChangelog {
  const changes: PlanningChange[] = [];
  const needsAction: PlanningNeedsAction[] = [];

  const currentByKey = new Map<string, PropertyEntry>();
  for (const entry of state.entries) {
    currentByKey.set(entryKey(entry.objectType, destName(entry), entry.name), entry);
  }
  const parsedKeys = new Set<string>();

  for (const row of parsed) {
    const key = entryKey(row.objectType, row.internalName, row.name);
    parsedKeys.add(key);

    if (isUserFriendlyKey(row.type) && isAmbiguous(row.type)) {
      needsAction.push({
        objectType: row.objectType,
        entryName: row.name || row.internalName,
        userFriendlyType: row.type,
        candidates: configsFor(row.type),
      });
    }

    const current = currentByKey.get(key);
    if (!current) {
      changes.push({
        kind: 'entry-added',
        objectType: row.objectType,
        entryName: row.name || row.internalName,
        hubspotName: row.internalName || undefined,
        detail: `Nueva entrada en el mapa (${row.internalName || row.name}).`,
      });
      continue;
    }

    const currentFields = currentSourceFields(current);
    const mappingChanged = row.sources.some(
      (source) => (currentFields.get(source.originId) ?? '') !== source.sourceField,
    );
    if (mappingChanged) {
      changes.push({
        kind: 'mapping-changed',
        objectType: row.objectType,
        entryName: current.name,
        hubspotName: destName(current),
        detail: `Cambia el mapeo origen->campo de ${destName(current)}.`,
      });
    }

    const currentType = typeDisplay(defOf(current));
    if (row.type && row.type !== currentType) {
      changes.push({
        kind: 'definition-changed',
        objectType: row.objectType,
        entryName: current.name,
        hubspotName: destName(current),
        detail: `Cambia el tipo de ${destName(current)}: "${currentType}" -> "${row.type}".`,
      });
    }
  }

  for (const entry of state.entries) {
    const key = entryKey(entry.objectType, destName(entry), entry.name);
    if (!parsedKeys.has(key)) {
      changes.push({
        kind: 'entry-removed',
        objectType: entry.objectType,
        entryName: entry.name,
        hubspotName: destName(entry),
        detail: `La entrada ${destName(entry)} ya no aparece en el mapa.`,
      });
    }
  }

  return { changes, needsAction };
}

/** Ingest completo: parsea las pestanas y produce el changelog (SPEC-0016 2.6). */
export function ingestPlanning(tabs: ReadTab[], state: PlanningState): PlanningChangelog {
  return buildPlanningChangelog(parsePlanningTabs(tabs, state.origins), state);
}

// PlanningResolution vive en @shared/types/planning (fuente unica); reexport por compatibilidad.
export type { PlanningResolution };

export type DraftEntry = EntryUpsertInput['entry'];

export interface PlanningDraftsResult {
  drafts: DraftEntry[];
  blocked: PlanningNeedsAction[];
}

function kindForType(type: string | undefined): SourceFieldKind {
  switch (type) {
    case 'number':
      return 'number';
    case 'bool':
      return 'boolean';
    case 'enumeration':
      return 'enum';
    default:
      return 'text';
  }
}

/** Config de HubSpot para una fila nueva: resuelta (1:1), aportada por el usuario, o `null` si sigue ambigua. */
function resolveRowConfig(
  row: ParsedPlanningEntry,
  resolutions: PlanningResolution[],
): HubSpotFieldConfig | null {
  if (!isUserFriendlyKey(row.type)) return null;
  const single = resolveUserFriendlyType(row.type);
  if (single) return single;
  const match = resolutions.find(
    (r) => r.objectType === row.objectType && r.entryName === (row.name || row.internalName),
  );
  return match ? match.config : null;
}

function draftSources(
  row: ParsedPlanningEntry,
  config: HubSpotFieldConfig | null,
): DraftEntry['sources'] {
  const kind = kindForType(config?.type);
  // id vacio: el servicio lo asigna con `source.id || newId()` (service.upsertEntry, SPEC-0006 §41).
  return row.sources.map((source) => ({
    id: '',
    originId: source.originId,
    sourceField: source.sourceField,
    definition: { kind },
    ...(source.comments ? { notes: source.comments } : {}),
  }));
}

/**
 * Convierte las filas parseadas en borradores de PropertyEntry (SPEC-0016 2.6, paso «apply»).
 * Las filas «Yes (Pending)» cuyo tipo user-friendly es ambiguo y no viene resuelto se devuelven en
 * `blocked` (no se crean). Las filas existentes reutilizan el id de la entrada actual (update).
 */
export function buildDraftEntries(
  parsed: ParsedPlanningEntry[],
  state: PlanningState,
  resolutions: PlanningResolution[] = [],
): PlanningDraftsResult {
  const idByKey = new Map<string, string>();
  for (const entry of state.entries) {
    idByKey.set(entryKey(entry.objectType, destName(entry), entry.name), entry.id);
  }

  const drafts: DraftEntry[] = [];
  const blocked: PlanningNeedsAction[] = [];

  for (const row of parsed) {
    const id = idByKey.get(entryKey(row.objectType, row.internalName, row.name));
    const isNew = row.custom === 'Yes (Pending)';
    let config: HubSpotFieldConfig | null = null;

    if (isNew) {
      config = resolveRowConfig(row, resolutions);
      if (!config) {
        // Tipo ausente o ambiguo sin resolver: no se puede crear la propiedad. Bloqueada (D6).
        blocked.push({
          objectType: row.objectType,
          entryName: row.name || row.internalName,
          userFriendlyType: isUserFriendlyKey(row.type)
            ? row.type
            : ('text' as UserFriendlyFieldTypeKey),
          candidates: isUserFriendlyKey(row.type) ? configsFor(row.type) : [],
        });
        continue;
      }
    }

    const hubspotProperty: DraftEntry['hubspotProperty'] = isNew
      ? {
          mode: 'new',
          definition: {
            hubspotName: row.internalName,
            label: row.name || row.internalName,
            type: config!.type,
            fieldType: config!.fieldType,
            groupName: '',
            ...(config!.numberDisplayHint ? { numberDisplayHint: config!.numberDisplayHint } : {}),
            ...(config!.showCurrencySymbol ? { showCurrencySymbol: true } : {}),
            ...(config!.textDisplayHint ? { textDisplayHint: config!.textDisplayHint } : {}),
          },
        }
      : { mode: 'existing', hubspotName: row.internalName };

    drafts.push({
      ...(id ? { id } : {}),
      objectType: row.objectType,
      name: row.name || row.internalName,
      hubspotProperty,
      sources: draftSources(row, config),
    });
  }

  return { drafts, blocked };
}
