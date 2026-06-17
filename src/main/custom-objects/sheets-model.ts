/**
 * Builder del Google Sheets del catálogo de objetos custom (SPEC-0007 §15). Cuatro hojas: Portada,
 * Objetos, Propiedades y Asociaciones. Es puro (sin dependencias de Drive) para poder testearlo. Las
 * erratas en nombres/etiquetas se reflejan tal cual (no se corrigen) — SPEC-0000.
 */
import type { CustomObjectDefinition } from '@shared/types/custom-objects';

export const CUSTOM_OBJECTS_FEATURE_KEY = 'custom-objects';
export const CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION = 1;

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

export function buildCustomObjectsTabs(
  objects: CustomObjectDefinition[],
  generatedAt = '',
): SheetTab[] {
  const portada: SheetTab = {
    title: '00_Portada',
    rows: [
      ['RevOps Assistant — Objetos custom'],
      ['schema_version', CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION],
      ['Generado', generatedAt],
      [],
      ['Hoja generada por RevOps Assistant. No edites las zonas de datos: se regeneran en cada volcado.'],
      ['Objetos', objects.length],
    ],
  };

  const objetos: SheetTab = {
    title: '01_Objetos',
    rows: [
      [
        'Nombre interno',
        'Label singular',
        'Label plural',
        'Descripción',
        'objectTypeId sandbox',
        'objectTypeId production',
        'Estado',
      ],
      ...objects.map((object) => [
        object.name,
        object.labels.singular,
        object.labels.plural,
        object.description ?? '',
        object.objectTypeId?.sandbox ?? '',
        object.objectTypeId?.production ?? '',
        object.status,
      ]),
    ],
  };

  const propiedades: SheetTab = {
    title: '02_Propiedades',
    rows: [
      [
        'Objeto',
        'Nombre interno',
        'Etiqueta',
        'Tipo',
        'fieldType',
        'Display principal',
        'Requerida',
        'Buscable',
        'Valor único',
      ],
      ...objects.flatMap((object) =>
        object.properties.map((property) => [
          object.name,
          property.name,
          property.label,
          property.type,
          property.fieldType,
          object.primaryDisplayProperty === property.name,
          (object.requiredProperties ?? []).includes(property.name),
          (object.searchableProperties ?? []).includes(property.name),
          property.hasUniqueValue ?? false,
        ]),
      ),
    ],
  };

  const asociaciones: SheetTab = {
    title: '03_Asociaciones',
    rows: [
      ['Objeto', 'Objeto asociado'],
      ...objects.flatMap((object) =>
        (object.associatedObjects ?? []).map((associated) => [object.name, associated]),
      ),
    ],
  };

  return [portada, objetos, propiedades, asociaciones];
}
