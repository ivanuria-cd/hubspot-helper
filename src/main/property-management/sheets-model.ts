/**
 * Builder del Google Sheets del mapa de propiedades (SPEC-0006 §16.4 / §18 / §32 + SPEC-0012 §2.3 / §12,
 * schema_version: 4). Hojas globales: Portada, Indice, Origenes. Por cada objeto con entradas, un
 * bloque de hasta cinco hojas: Campos, Definicion, Fuentes, Opciones (se omite si no hay fuentes `enum`)
 * y DefOpciones (solo con propiedades nuevas de enumeración con opciones). Es puro (sin dependencias de
 * Drive) para poder testearlo. Las erratas en nombres/claves se reflejan tal cual (no se corrigen).
 */
import type { DataOrigin, HubSpotPropertyDef, PropertyEntry } from '@shared/types/properties';

export const SHEETS_SCHEMA_VERSION = 4;
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
const DEFINICION_HEADER = [
  'ID',
  'Nombre',
  'Propiedad HubSpot',
  'Etiqueta',
  'Tipo',
  'Field type',
  'Grupo',
  'Descripción',
  'Formato número',
  'Símbolo moneda',
  'Propiedad moneda',
  'Formato texto',
  'Fórmula cálculo',
  'Valor único',
  'Sensibilidad',
  'Opciones externas',
  'Objeto referenciado',
  'Orden',
  'Oculta',
  'Campo de formulario',
];
const DEFOPCIONES_HEADER = ['ID', 'Nombre', 'Propiedad HubSpot', 'Valor', 'Etiqueta', 'Orden', 'Oculta'];
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

function destDef(entry: PropertyEntry): HubSpotPropertyDef | undefined {
  return entry.hubspotProperty.definition;
}

function definicionRow(entry: PropertyEntry): CellValue[] {
  const def = destDef(entry);
  const cell = (value: CellValue | undefined): CellValue => value ?? '';
  return [
    entry.id,
    entry.name,
    destName(entry),
    cell(def?.label),
    destType(entry),
    cell(def?.fieldType),
    cell(def?.groupName),
    cell(def?.description),
    cell(def?.numberDisplayHint),
    cell(def?.showCurrencySymbol),
    cell(def?.currencyPropertyName),
    cell(def?.textDisplayHint),
    cell(def?.calculationFormula),
    cell(def?.hasUniqueValue),
    cell(def?.dataSensitivity),
    cell(def?.externalOptions),
    cell(def?.referencedObjectType),
    cell(def?.displayOrder),
    cell(def?.hidden),
    cell(def?.formField),
  ];
}

function defOpcionRows(entry: PropertyEntry): CellValue[][] {
  const ref = entry.hubspotProperty;
  if (ref.mode !== 'new' || ref.definition.type !== 'enumeration') return [];
  return (ref.definition.options ?? []).map((option) => [
    entry.id,
    entry.name,
    ref.definition.hubspotName,
    option.value,
    option.label,
    option.displayOrder,
    option.hidden,
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
    rows: [['Objeto', 'Campos', 'Definicion', 'Fuentes', 'Opciones', 'DefOpciones', 'Hojas']],
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
    const definicion: SheetTab = {
      title: blockTitle(prefix, part, 'Definicion'),
      rows: [DEFINICION_HEADER, ...objectEntries.map(definicionRow)],
    };
    const fuentesRows = objectEntries.flatMap((entry) => fuenteRows(entry, originName));
    const fuentes: SheetTab = {
      title: blockTitle(prefix, part, 'Fuentes'),
      rows: [FUENTES_HEADER, ...fuentesRows],
    };
    const opcionesRows = objectEntries.flatMap((entry) => opcionRows(entry, originName));
    const defOpcionesRows = objectEntries.flatMap(defOpcionRows);

    const sheetNames = [entradas.title, definicion.title, fuentes.title];
    blocks.push(entradas, definicion, fuentes);
    if (opcionesRows.length > 0) {
      const opciones: SheetTab = { title: blockTitle(prefix, part, 'Opciones'), rows: [OPCIONES_HEADER, ...opcionesRows] };
      sheetNames.push(opciones.title);
      blocks.push(opciones);
    }
    if (defOpcionesRows.length > 0) {
      const defOpciones: SheetTab = { title: blockTitle(prefix, part, 'DefOpciones'), rows: [DEFOPCIONES_HEADER, ...defOpcionesRows] };
      sheetNames.push(defOpciones.title);
      blocks.push(defOpciones);
    }

    indice.rows.push([
      objectType,
      objectEntries.length,
      objectEntries.length,
      fuentesRows.length,
      opcionesRows.length,
      defOpcionesRows.length,
      sheetNames.join(', '),
    ]);
  });

  return [portada, indice, origenes, ...blocks];
}
