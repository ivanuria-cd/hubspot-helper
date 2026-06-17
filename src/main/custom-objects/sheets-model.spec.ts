import { describe, it, expect } from 'vitest';
import { buildCustomObjectsTabs, CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION } from './sheets-model';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';

const objects: CustomObjectDefinition[] = [
  {
    id: 'obj1',
    name: 'machine',
    description: 'Máquinas del cliente',
    labels: { singular: 'Máquina', plural: 'Máquinas' },
    primaryDisplayProperty: 'model',
    secondaryDisplayProperties: [],
    searchableProperties: ['model'],
    requiredProperties: ['model'],
    associatedObjects: ['contacts'],
    properties: [
      {
        name: 'model',
        label: 'Modelo',
        type: 'string',
        fieldType: 'text',
        hasUniqueValue: true,
      },
    ],
    objectTypeId: { sandbox: '2-7', production: '2-9' },
    status: 'created',
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z',
  },
];

describe('sheets-model (objetos custom)', () => {
  it('produce cuatro hojas con encabezados y una fila por elemento', () => {
    const tabs = buildCustomObjectsTabs(objects, '2026-06-16T00:00:00Z');
    expect(tabs.map((tab) => tab.title)).toEqual([
      '00_Portada',
      '01_Objetos',
      '02_Propiedades',
      '03_Asociaciones',
    ]);
    expect(tabs[0]?.rows).toContainEqual(['schema_version', CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION]);
    expect(tabs[0]?.rows).toContainEqual(['Objetos', 1]);

    const objetos = tabs[1]!;
    expect(objetos.rows[1]).toEqual([
      'machine',
      'Máquina',
      'Máquinas',
      'Máquinas del cliente',
      '2-7',
      '2-9',
      'created',
    ]);

    const propiedades = tabs[2]!;
    expect(propiedades.rows[1]).toEqual([
      'machine',
      'model',
      'Modelo',
      'string',
      'text',
      true,
      true,
      true,
      true,
    ]);

    const asociaciones = tabs[3]!;
    expect(asociaciones.rows[1]).toEqual(['machine', 'contacts']);
  });

  it('genera solo cabeceras cuando no hay objetos', () => {
    const tabs = buildCustomObjectsTabs([], '');
    expect(tabs).toHaveLength(4);
    expect(tabs[1]?.rows).toHaveLength(1);
    expect(tabs[2]?.rows).toHaveLength(1);
    expect(tabs[3]?.rows).toHaveLength(1);
  });
});
