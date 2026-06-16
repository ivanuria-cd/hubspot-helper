import { describe, it, expect } from 'vitest';
import { buildPropertyMapTabs } from './sheets-model';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

const origins: DataOrigin[] = [
  {
    id: 'o1',
    name: 'Salesforce',
    type: 'migration',
    description: 'Migración inicial',
    objects: [{ id: 'ob1', name: 'Contact' }],
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const entries: PropertyEntry[] = [
  {
    id: 'e1',
    objectType: 'contacts',
    name: 'Grado',
    hubspotProperty: { mode: 'existing', hubspotName: 'degree' },
    sources: [
      {
        id: 's1',
        originId: 'o1',
        sourceField: 'Degree__c',
        definition: {
          kind: 'enum',
          options: [{ sourceValue: 'bach', sourceLabel: 'Bachelor', hubspotValue: 'bachelor' }],
        },
      },
    ],
    hubspotStatus: 'exists',
  },
  {
    id: 'e2',
    objectType: 'contacts',
    name: 'Activo',
    hubspotProperty: {
      mode: 'new',
      definition: { hubspotName: 'is_active', label: 'Activo', type: 'bool', fieldType: 'booleancheckbox', groupName: 'x' },
    },
    sources: [
      { id: 's2', originId: 'o1', sourceField: 'Active__c', definition: { kind: 'boolean', boolean: { truthy: '1', falsy: '0' } } },
    ],
    hubspotStatus: 'missing',
  },
];

describe('buildPropertyMapTabs', () => {
  it('genera las cinco hojas con sus títulos', () => {
    const tabs = buildPropertyMapTabs(entries, origins);
    expect(tabs.map((t) => t.title)).toEqual([
      '00_Portada',
      '01_Origenes',
      '02_Entradas',
      '03_Fuentes',
      '04_Opciones',
    ]);
  });

  it('02_Entradas refleja destino, ¿nueva?, tipo y estado', () => {
    const entradas = buildPropertyMapTabs(entries, origins)[2];
    expect(entradas.rows[0]).toContain('Propiedad HubSpot');
    expect(entradas.rows[1]).toEqual(['e1', 'contacts', 'Grado', 'degree', 'No', '', 'exists', 1, 0]);
    expect(entradas.rows[2]).toEqual(['e2', 'contacts', 'Activo', 'is_active', 'Sí', 'bool', 'missing', 1, 0]);
  });

  it('03_Fuentes resuelve el nombre del origen y el formato booleano', () => {
    const fuentes = buildPropertyMapTabs(entries, origins)[3];
    const boolRow = fuentes.rows.find((row) => row[0] === 's2');
    expect(boolRow).toEqual(['s2', 'Activo', 'contacts', 'Salesforce', 'Active__c', 'boolean', '1/0', '']);
  });

  it('04_Opciones vuelca el mapeo enum por opción', () => {
    const opciones = buildPropertyMapTabs(entries, origins)[4];
    expect(opciones.rows[0]).toEqual(['Entrada', 'Origen', 'Valor origen', 'Etiqueta origen', 'Valor HubSpot']);
    expect(opciones.rows[1]).toEqual(['Grado', 'Salesforce', 'bach', 'Bachelor', 'bachelor']);
  });

  it('refleja erratas en claves sin corregirlas', () => {
    const withTypo: PropertyEntry[] = [{ ...entries[0], name: 'Graod' }];
    const entradas = buildPropertyMapTabs(withTypo, origins)[2];
    expect(entradas.rows[1][2]).toBe('Graod');
  });
});
