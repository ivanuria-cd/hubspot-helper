/**
 * Builder del mapa de campos editable (SPEC-0016), estructura del skill mapa-de-campos:
 * Leyenda + una pestana por objeto (bloque HubSpot + un bloque por origen aplicable con
 * desplegables) + hojas "Origen <sistema>" con destino calculado + Asociaciones (informativa)
 * + Listas (oculta) que alimenta los desplegables. Puro y testeable, sin dependencias de Drive.
 * ASCII intencionado (evita el truncado del espejo del sandbox y permite testear aqui); el
 * estilo/i18n de presentacion se aplican en la capa de estilo/UI. Erratas reflejadas tal cual.
 */
import type { DataOrigin, HubSpotPropertyDef, PropertyEntry } from '@shared/types/properties';
import type { PlanningAssociation } from '@shared/types/planning';
import { USER_FRIENDLY_FIELD_TYPES } from '@shared/constants/planningFieldTypes';
import { entryDestName as destName } from './dest-name';
import { PLANNING_META_TITLE, PLANNING_META_HEADER } from './planning-meta';

export const PLANNING_MAP_FEATURE_KEY = 'property-planning-map';
// SPEC-0006 §53.6: sube a 2 al anadir la hoja de metadatos (round-trip fiel del objectType).
export const PLANNING_SCHEMA_VERSION = 2;

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

/** Validacion (desplegable) que la capa de estilo aplica sobre un rango de una hoja. */
export interface PlanningValidation {
  tab: string;
  column: number; // 0-based
  firstRow: number; // 0-based, primera fila de datos
  lastRow: number; // 0-based, inclusiva
  oneOf?: string[]; // lista literal (Custom, Origin)
  listRange?: string; // rango A1 en la hoja Listas (Field name)
}

export interface PlanningWorkbook {
  tabs: SheetTab[];
  hiddenTabs: string[];
  validations: PlanningValidation[];
  formulaTabs: string[]; // hojas cuyas celdas "=" deben escribirse USER_ENTERED
}

export interface PlanningInput {
  entries: PropertyEntry[];
  origins: DataOrigin[];
  hubspotCatalog?: Record<string, HubSpotPropertyDef[]>;
  associations?: PlanningAssociation[];
}

const HS_HEADER = [
  'Custom',
  'Name',
  'Internal name',
  'Type',
  'Unique',
  'Options',
  'Group',
  'Description',
  'Read-only / Schema',
];
const NHS = HS_HEADER.length;
const CUSTOM_VALUES = ['No', 'Yes (Pending)', 'Yes (Created)'];
const ORIGIN_VALUES = ['Migration', 'Integration'];
// Columna Type: desplegable de tipos user-friendly (D6); la resolucion a config HubSpot y la
// deteccion de ambiguedad ("necesita accion") ocurren en la ingest (planning-import.ts).
const TYPE_VALUES = USER_FRIENDLY_FIELD_TYPES.map((t) => t.key);
const TYPE_COL = 3; // 0-based en el bloque HubSpot (Custom, Name, Internal name, Type)
const UNIQUE_VALUES = ['Yes', 'No'];
const UNIQUE_COL = 4; // 0-based: columna Unique del bloque HubSpot
const ORIGEN_HEADER = ['Objeto', 'Campo', '-> Propiedad HubSpot destino', 'Notas'];
const ASOCIACIONES_HEADER = ['Objeto A', 'Objeto B', 'Clave de enlace', 'Notas'];
const SHEET_NAME_MAX = 100;
const INVALID_SHEET_CHARS = /[:\\/?*[\]]/g;
const INTERNAL_NAME_COL = 'C'; // 3a columna del bloque HubSpot

function columnLetter(index1Based: number): string {
  let n = index1Based;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function sanitizeSheetPart(raw: string): string {
  const cleaned = raw.replace(INVALID_SHEET_CHARS, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'objeto';
}

function uniqueTitle(base: string, used: Set<string>): string {
  let title = base.slice(0, SHEET_NAME_MAX);
  let suffix = 2;
  while (used.has(title)) {
    const tag = `_${suffix}`;
    title = `${base.slice(0, SHEET_NAME_MAX - tag.length)}${tag}`;
    suffix += 1;
  }
  used.add(title);
  return title;
}

function defOf(entry: PropertyEntry): HubSpotPropertyDef | undefined {
  return entry.hubspotProperty.definition;
}

function typeDisplay(def: HubSpotPropertyDef | undefined): string {
  if (!def) return '';
  return def.fieldType ? `${def.type} (${def.fieldType})` : String(def.type ?? '');
}

function customValue(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'new' ? 'Yes (Pending)' : 'No';
}

function originTypeLabel(origin: DataOrigin): string {
  return origin.type === 'integration' ? 'Integration' : 'Migration';
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Origenes aplicables a un objeto: los que alimentan alguna fuente de sus entradas, en orden de `origins`. */
function applicableOrigins(objectEntries: PropertyEntry[], origins: DataOrigin[]): DataOrigin[] {
  const used = new Set<string>();
  for (const entry of objectEntries) {
    for (const source of entry.sources) used.add(source.originId);
  }
  return origins.filter((origin) => used.has(origin.id));
}

/** Catalogo de campos para (objeto, origen): objetos de origen referenciados (o todos) + campos ya usados. */
function fieldCatalog(objectEntries: PropertyEntry[], origin: DataOrigin): string[] {
  const refIds = new Set<string>();
  const usedFields: string[] = [];
  for (const entry of objectEntries) {
    for (const source of entry.sources) {
      if (source.originId !== origin.id) continue;
      if (source.originObjectId) refIds.add(source.originObjectId);
      if (source.sourceField) usedFields.push(source.sourceField);
    }
  }
  const objects = origin.objects ?? [];
  const chosen = refIds.size > 0 ? objects.filter((o) => refIds.has(o.id)) : objects;
  const catalog: string[] = [];
  for (const object of chosen) catalog.push(...(object.fields ?? []));
  return dedupe([...catalog, ...usedFields]);
}

function sourceFor(entry: PropertyEntry, originId: string) {
  return entry.sources.find((source) => source.originId === originId);
}

function objectTypesInOrder(entries: PropertyEntry[]): string[] {
  const seen: string[] = [];
  for (const entry of entries) if (!seen.includes(entry.objectType)) seen.push(entry.objectType);
  return seen.sort((a, b) => a.localeCompare(b));
}

export function buildPlanningWorkbook(input: PlanningInput): PlanningWorkbook {
  const { entries, origins } = input;
  const associations = input.associations ?? [];
  const catalog = input.hubspotCatalog ?? {};

  const tabs: SheetTab[] = [];
  const validations: PlanningValidation[] = [];
  const formulaTabs: string[] = [];
  const usedTitles = new Set<string>();

  // Leyenda
  tabs.push({
    title: uniqueTitle('Leyenda', usedTitles),
    rows: [
      ['Mapa de campos (planificacion)', ''],
      ['', ''],
      [
        'Estructura',
        'Una pestana por objeto HubSpot: bloque HubSpot (destino) + un bloque por origen aplicable.',
      ],
      [
        'Custom',
        'Desplegable: No (ya existe) / Yes (Pending) (a crear) / Yes (Created) (ya creada).',
      ],
      [
        '<Origen> Field name',
        'Desplegable con el catalogo de ese origen para ese objeto; el mapeo conocido va preseleccionado.',
      ],
      ['<Origen> Origin', 'Desplegable: Migration o Integration.'],
      [
        'Hojas Origen <sistema>',
        'Catalogo del origen; la columna destino es calculada (vacia si el campo no se usa).',
      ],
      [
        'Asociaciones',
        'Solo informativa (SPEC-0016 D4): registro-registro, no gestiona asociaciones CRM.',
      ],
      [
        'Editable',
        'Documento sin proteccion; lo rellena el cliente. La app reimporta con alerta + changelog.',
      ],
    ],
  });

  const objectTitles = new Map<string, string>();
  const objectOrigins = new Map<string, DataOrigin[]>();
  const listasColumns: { key: string; values: string[] }[] = [];
  const listRangeByKey = new Map<string, string>();

  // reserva de columnas de Listas antes de crear las hojas de objeto (para conocer los rangos)
  const objectTypes = objectTypesInOrder(entries);
  for (const objectType of objectTypes) {
    const objectEntries = entries.filter((e) => e.objectType === objectType);
    const originsHere = applicableOrigins(objectEntries, origins);
    objectOrigins.set(objectType, originsHere);
    const tabTitle = uniqueTitle(sanitizeSheetPart(objectType), usedTitles);
    objectTitles.set(objectType, tabTitle);
    for (const origin of originsHere) {
      const key = `${tabTitle}|${origin.name}`;
      const values = fieldCatalog(objectEntries, origin);
      const colIndex = listasColumns.length + 1; // 1-based en Listas
      listasColumns.push({ key, values });
      const letter = columnLetter(colIndex);
      listRangeByKey.set(key, `Listas!$${letter}$2:$${letter}$${values.length + 1}`);
    }
  }

  // SPEC-0006 §53.6: hoja de metadatos (protegida por la capa de estilo) que guarda el objectType REAL
  // por titulo de pestana, para que el import no lo derive del titulo saneado/truncado/desambiguado.
  const metaRows: CellValue[][] = [[...PLANNING_META_HEADER]];
  for (const objectType of objectTypes) {
    metaRows.push([objectTitles.get(objectType)!, objectType]);
  }
  tabs.splice(1, 0, { title: PLANNING_META_TITLE, rows: metaRows });

  // Hojas de objeto
  for (const objectType of objectTypes) {
    const tabTitle = objectTitles.get(objectType)!;
    const originsHere = objectOrigins.get(objectType)!;
    const objectEntries = entries.filter((e) => e.objectType === objectType);

    const header = [...HS_HEADER];
    for (const origin of originsHere) {
      header.push(`${origin.name} Field name`, `${origin.name} Origin`, `${origin.name} Comments`);
    }

    const mappedNames = new Set(objectEntries.map((e) => destName(e)));
    const rows: CellValue[][] = [header];

    for (const entry of objectEntries) {
      const def = defOf(entry);
      const row: CellValue[] = [
        customValue(entry),
        entry.name,
        destName(entry),
        typeDisplay(def),
        def?.hasUniqueValue ? 'Yes' : 'No',
        (def?.options ?? []).map((o) => o.label).join(', '),
        def?.groupName ?? '',
        def?.description ?? '',
        def?.fieldType === 'calculation_equation' ? 'Solo lectura (calculada)' : '',
      ];
      for (const origin of originsHere) {
        const source = sourceFor(entry, origin.id);
        row.push(
          source?.sourceField ?? '',
          source ? originTypeLabel(origin) : '',
          source?.notes ?? '',
        );
      }
      rows.push(row);
    }

    // propiedades del catalogo HubSpot no mapeadas (si se aporta catalogo)
    for (const prop of catalog[objectType] ?? []) {
      if (mappedNames.has(prop.hubspotName)) continue;
      const row: CellValue[] = [
        'No',
        prop.label,
        prop.hubspotName,
        typeDisplay(prop),
        prop.hasUniqueValue ? 'Yes' : 'No',
        (prop.options ?? []).map((o) => o.label).join(', '),
        prop.groupName ?? '',
        prop.description ?? '',
        prop.fieldType === 'calculation_equation' ? 'Solo lectura (calculada)' : '',
      ];
      for (let i = 0; i < originsHere.length; i += 1) row.push('', '', '');
      rows.push(row);
    }

    tabs.push({ title: tabTitle, rows });

    const dataCount = rows.length - 1;
    if (dataCount > 0) {
      validations.push({
        tab: tabTitle,
        column: 0,
        firstRow: 1,
        lastRow: dataCount,
        oneOf: CUSTOM_VALUES,
      });
      validations.push({
        tab: tabTitle,
        column: TYPE_COL,
        firstRow: 1,
        lastRow: dataCount,
        oneOf: TYPE_VALUES,
      });
      validations.push({
        tab: tabTitle,
        column: UNIQUE_COL,
        firstRow: 1,
        lastRow: dataCount,
        oneOf: UNIQUE_VALUES,
      });
      originsHere.forEach((origin, i) => {
        const fieldCol = NHS + 3 * i; // 0-based: primera col del bloque de origen
        const range = listRangeByKey.get(`${tabTitle}|${origin.name}`);
        if (range) {
          validations.push({
            tab: tabTitle,
            column: fieldCol,
            firstRow: 1,
            lastRow: dataCount,
            listRange: range,
          });
        }
        validations.push({
          tab: tabTitle,
          column: fieldCol + 1,
          firstRow: 1,
          lastRow: dataCount,
          oneOf: ORIGIN_VALUES,
        });
      });
    }
  }

  // Hojas "Origen <sistema>" con destino calculado (INDEX/MATCH)
  for (const origin of origins) {
    const originTitle = uniqueTitle(sanitizeSheetPart(`Origen ${origin.name}`), usedTitles);
    const rows: CellValue[][] = [ORIGEN_HEADER];
    for (const objectType of objectTypes) {
      const originsHere = objectOrigins.get(objectType) ?? [];
      const originIndex = originsHere.findIndex((o) => o.id === origin.id);
      if (originIndex < 0) continue;
      const tabTitle = objectTitles.get(objectType)!;
      const fieldColLetter = columnLetter(NHS + 1 + 3 * originIndex); // 1-based en la hoja de objeto
      const key = `${tabTitle}|${origin.name}`;
      const fields = listasColumns.find((c) => c.key === key)?.values ?? [];
      for (const field of fields) {
        const rowNumber = rows.length + 1; // 1-based fila actual en esta hoja Origen
        const idx = `INDEX('${tabTitle}'!$${INTERNAL_NAME_COL}:$${INTERNAL_NAME_COL},MATCH($B${rowNumber},'${tabTitle}'!$${fieldColLetter}:$${fieldColLetter},0))`;
        rows.push([tabTitle, field, `=IFERROR(IF(${idx}=0,"",${idx}),"")`, '']);
      }
    }
    tabs.push({ title: originTitle, rows });
    if (rows.length > 1) formulaTabs.push(originTitle);
  }

  // Asociaciones (solo informativa, D4)
  tabs.push({
    title: uniqueTitle('Asociaciones', usedTitles),
    rows: [
      ASOCIACIONES_HEADER,
      ...associations.map((a) => [a.objetoA, a.objetoB, a.claveEnlace, a.notas ?? '']),
    ],
  });

  // Listas (oculta): una columna por (objeto, origen)
  const listasTitle = uniqueTitle('Listas', usedTitles);
  const maxLen = listasColumns.reduce((max, c) => Math.max(max, c.values.length), 0);
  const listasRows: CellValue[][] = [listasColumns.map((c) => c.key)];
  for (let r = 0; r < maxLen; r += 1) {
    listasRows.push(listasColumns.map((c) => c.values[r] ?? ''));
  }
  tabs.push({ title: listasTitle, rows: listasRows });

  return { tabs, hiddenTabs: [listasTitle], validations, formulaTabs };
}
