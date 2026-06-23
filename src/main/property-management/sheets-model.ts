/**
 * Builder del Google Sheets del mapa de propiedades (SPEC-0006 §16.4 / §18 + SPEC-0012 §2.3,
 * schema_version: 3). Hojas globales: Portada, Indice, Origenes. Por cada objeto con entradas, un
 * bloque de tres hojas: Campos, Fuentes, Opciones (esta última se omite si no hay fuentes `enum`).
 * Es puro (sin dependencias de Drive) para poder testearlo. Las erratas en nombres/claves se reflejan
 * tal cual (no se corrigen).
 */
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

export const SHEETS_SCHEMA_VERSION = 3;
export const PROPERTY_MAP_FEATURE_KEY = 'property-management';

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

const ENTRADAS_HEADER = [
  'ID',
  'Objeto',
  'Nombre',
  'Propiedad HubSpot',
  '¿Nueva?',
  'Tipo HubSpot',
  'Estado',
  'Nº orígenes',
  'Cambios pendientes',
];
const FUENTES_HEADER = ['ID', 'Entrada', 'Objeto', 'Origen', 'Campo origen', 'Tipo genérico', 'Formato booleano', 'Notas'];
const OPCIONES_HEADER = ['Entrada', 'Origen', 'Valor origen', 'Etiqueta origen', 'Valor HubSpot'];
const SHEET_NAME_MAX = 100;
const INVALID_SHEET_CHARS = /[:\\/?*[\]]/g;

function destName(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'existing'
    ? entry.hubspotProperty.hubspotName
    : entry.hubspotProperty.definition.hubspotName;
}

function destType(entry: PropertyEntry): string {
  const ref = entry.hubspotProperty;
  return ref.mode === 'new' ? ref.definition.type : (ref.definition?.type ?? '');
}

function sanitizeSheetPart(raw: string): string {
  const cleaned = raw.replace(INVALID_SHEET_CHARS, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'objeto';
}

function blockTitle(prefix: string, objectPart: string, table: string): string {
  const head = `${prefix}_`;
  const tail = `_${table}`;
  const room = SHEET_NAME_MAX - head.length - tail.length;
  const part = objectPart.length > room ? objectPart.slice(0, room) : objectPart;
  return `${head}${part}${tail}`;
}

function entradaRow(entry: PropertyEntry): CellValue[] {
  return [
    entry.id,
    entry.objectType,
    entry.name,
    destName(entry),
    entry.hubspotProperty.mode === 'new' ? 'Sí' : 'No',
    destType(entry),
    entry.hubspotStatus,
    entry.sources.length,
    entry.pendingChanges?.length ?? 0,
  ];
}

function fuenteRows(entry: PropertyEntry, originName: Map<string, string>): CellValue[][] {
  return entry.sources.map((source) => [
    source.id,
    entry.name,
    entry.objectType,
    originName.get(source.originId) ?? source.originId,
    source.sourceField,
    source.definition.kind,
    source.definition.boolean ? `${source.definition.boolean.truthy}/${source.definition.boolean.falsy}` : '',
    source.notes ?? '',
  ]);
}

function opcionRows(entry: PropertyEntry, originName: Map<string, string>): CellValue[][] {
  return entry.sources.flatMap((source) =>
    source.definition.kind === 'enum'
      ? (source.definition.options ?? []).map((option) => [
          entry.name,
          originName.get(source.originId) ?? source.originId,
          option.sourceValue,
          option.sourceLabel ?? '',
          option.hubspotValue ?? '',
        ])
      : [],
  );
}

export function buildPropertyMapTabs(
  entries: PropertyEntry[],
  origins: DataOrigin[],
  generatedAt = '',
): SheetTab[] {
  const originName = new Map(origins.map((origin) => [origin.id, origin.name]));

  // Agrupación por objeto, preservando el primer orden de aparición y ordenando por nombre de objeto.
  const byObject = new Map<string, PropertyEntry[]>();
  for (const entry of entries) {
    const list = byObject.get(entry.objectType) ?? [];
    list.push(entry);
    byObject.set(entry.objectType, list);
  }
  const objectTypes = [...byObject.keys()].sort((a, b) => a.localeCompare(b));

  // Saneado del nombre de objeto para el título de hoja, con resolución de colisiones.
  const usedParts = new Set<string>();
  const partByObject = new Map<string, string>();
  for (const objectType of objectTypes) {
    const base = sanitizeSheetPart(objectType);
    let part = base;
    let n = 2;
    while (usedParts.has(part)) {
      part = `${base}_${n}`;
      n += 1;
    }
    usedParts.add(part);
    partByObject.set(objectType, part);
  }

  const portada: SheetTab = {
    title: '00_Portada',
    rows: [
      ['RevOps Assistant — Mapa de propiedades CRM'],
      ['schema_version', SHEETS_SCHEMA_VERSION],
      ['Generado', generatedAt],
      [],
      ['Hoja generada por RevOps Assistant. No edites las zonas de datos: se regeneran en cada volcado.'],
      ['Objetos', objectTypes.length],
      ['Campos', entries.length],
      ['Orígenes', origins.length],
    ],
  };

  const indice: SheetTab = {
    title: '01_Indice',
    rows: [['Objeto', 'Campos', 'Fuentes', 'Opciones', 'Hojas']],
  };

  const origenes: SheetTab = {
    title: '02_Origenes',
    rows: [
      ['ID', 'Nombre', 'Tipo', 'Descripción', 'Objetos'],
      ...origins.map((origin) => [
        origin.id,
        origin.name,
        origin.type,
        origin.description ?? '',
        (origin.objects ?? []).map((object) => object.name).join(', '),
      ]),
    ],
  };

  const blocks: SheetTab[] = [];
  objectTypes.forEach((objectType, position) => {
    const prefix = String(position + 3).padStart(2, '0');
    const part = partByObject.get(objectType) as string;
    const objectEntries = byObject.get(objectType) as PropertyEntry[];

    const entradas: SheetTab = {
      title: blockTitle(prefix, part, 'Campos'),
      rows: [ENTRADAS_HEADER, ...objectEntries.map(entradaRow)],
    };
    const fuentesRows = objectEntries.flatMap((entry) => fuenteRows(entry, originName));
    const fuentes: SheetTab = {
      title: blockTitle(prefix, part, 'Fuentes'),
      rows: [FUENTES_HEADER, ...fuentesRows],
    };
    const opcionesRows = objectEntries.flatMap((entry) => opcionRows(entry, originName));

    const sheetNames = [entradas.title, fuentes.title];
    blocks.push(entradas, fuentes);
    if (opcionesRows.length > 0) {
      const opciones: SheetTab = { title: blockTitle(prefix, part, 'Opciones'), rows: [OPCIONES_HEADER, ...opcionesRows] };
      sheetNames.push(opciones.title);
      blocks.push(opciones);
    }

    indice.rows.push([objectType, objectEntries.length, fuentesRows.length, opcionesRows.length, sheetNames.join(', ')]);
  });

  return [portada, indice, origenes, ...blocks];
}
