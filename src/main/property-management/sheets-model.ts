/**
 * Builder del Google Sheets del mapa de propiedades (SPEC-0006 §16.4 / §18, schema_version: 2).
 * Cinco hojas: Portada, Orígenes, Entradas, Fuentes, Opciones. Es puro (sin dependencias de Drive)
 * para poder testearlo. Las erratas en nombres/claves se reflejan tal cual (no se corrigen).
 */
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

export const SHEETS_SCHEMA_VERSION = 2;
export const PROPERTY_MAP_FEATURE_KEY = 'property-management';

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

function destName(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'existing'
    ? entry.hubspotProperty.hubspotName
    : entry.hubspotProperty.definition.hubspotName;
}

function destType(entry: PropertyEntry): string {
  const ref = entry.hubspotProperty;
  return ref.mode === 'new' ? ref.definition.type : (ref.definition?.type ?? '');
}

export function buildPropertyMapTabs(
  entries: PropertyEntry[],
  origins: DataOrigin[],
  generatedAt = '',
): SheetTab[] {
  const originName = new Map(origins.map((origin) => [origin.id, origin.name]));

  const portada: SheetTab = {
    title: '00_Portada',
    rows: [
      ['RevOps Assistant — Mapa de propiedades CRM'],
      ['schema_version', SHEETS_SCHEMA_VERSION],
      ['Generado', generatedAt],
      [],
      ['Hoja generada por RevOps Assistant. No edites las zonas de datos: se regeneran en cada volcado.'],
      ['Entradas', entries.length],
      ['Orígenes', origins.length],
    ],
  };

  const origenes: SheetTab = {
    title: '01_Origenes',
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

  const entradas: SheetTab = {
    title: '02_Entradas',
    rows: [
      [
        'ID',
        'Objeto',
        'Nombre',
        'Propiedad HubSpot',
        '¿Nueva?',
        'Tipo HubSpot',
        'Estado',
        'Nº orígenes',
        'Cambios pendientes',
      ],
      ...entries.map((entry) => [
        entry.id,
        entry.objectType,
        entry.name,
        destName(entry),
        entry.hubspotProperty.mode === 'new' ? 'Sí' : 'No',
        destType(entry),
        entry.hubspotStatus,
        entry.sources.length,
        entry.pendingChanges?.length ?? 0,
      ]),
    ],
  };

  const fuentes: SheetTab = {
    title: '03_Fuentes',
    rows: [
      ['ID', 'Entrada', 'Objeto', 'Origen', 'Campo origen', 'Tipo genérico', 'Formato booleano', 'Notas'],
      ...entries.flatMap((entry) =>
        entry.sources.map((source) => [
          source.id,
          entry.name,
          entry.objectType,
          originName.get(source.originId) ?? source.originId,
          source.sourceField,
          source.definition.kind,
          source.definition.boolean
            ? `${source.definition.boolean.truthy}/${source.definition.boolean.falsy}`
            : '',
          source.notes ?? '',
        ]),
      ),
    ],
  };

  const opciones: SheetTab = {
    title: '04_Opciones',
    rows: [
      ['Entrada', 'Origen', 'Valor origen', 'Etiqueta origen', 'Valor HubSpot'],
      ...entries.flatMap((entry) =>
        entry.sources.flatMap((source) =>
          source.definition.kind === 'enum'
            ? (source.definition.options ?? []).map((option) => [
                entry.name,
                originName.get(source.originId) ?? source.originId,
                option.sourceValue,
                option.sourceLabel ?? '',
                option.hubspotValue ?? '',
              ])
            : [],
        ),
      ),
    ],
  };

  return [portada, origenes, entradas, fuentes, opciones];
}
