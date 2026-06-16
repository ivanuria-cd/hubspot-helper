import { describe, it, expect } from 'vitest';
import { buildOriginExport } from './origin-export';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

const origin: DataOrigin = {
  id: 'o1',
  name: 'Salesforce Q1',
  type: 'migration',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const entry: PropertyEntry = {
  id: 'e1',
  objectType: 'contacts',
  name: 'Nivel comercial',
  hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
  sources: [
    {
      id: 's1',
      originId: 'o1',
      sourceField: 'Account_Tier__c',
      definition: {
        kind: 'enum',
        options: [{ sourceValue: 'GOLD', hubspotValue: 'enterprise' }],
      },
      notes: 'nivel',
    },
    {
      id: 's2',
      originId: 'otro',
      sourceField: 'X',
      definition: { kind: 'text' },
    },
  ],
  hubspotStatus: 'exists',
};

describe('buildOriginExport', () => {
  it('exporta solo las fuentes del origen, con su definición genérica', () => {
    const result = buildOriginExport({ origin, entries: [entry], now: () => '2026-06-11T10:00:00.000Z' });
    expect(result.schema_version).toBe(2);
    expect(result.origin).toEqual({ id: 'o1', name: 'Salesforce Q1', type: 'migration' });
    expect(result.properties).toHaveLength(1);
    expect(result.properties[0]).toEqual({
      entry_name: 'Nivel comercial',
      hubspot_name: 'custom_tier',
      object_type: 'contacts',
      source_field: 'Account_Tier__c',
      source_kind: 'enum',
      options: [{ sourceValue: 'GOLD', hubspotValue: 'enterprise' }],
      notes: 'nivel',
    });
  });

  it('incluye boolean_format cuando el origen es booleano', () => {
    const boolEntry: PropertyEntry = {
      ...entry,
      id: 'e2',
      sources: [
        {
          id: 's3',
          originId: 'o1',
          sourceField: 'active__c',
          definition: { kind: 'boolean', boolean: { truthy: 'Yes', falsy: 'No' } },
        },
      ],
    };
    const result = buildOriginExport({ origin, entries: [boolEntry], now: () => 'now' });
    expect(result.properties[0]?.boolean_format).toEqual({ truthy: 'Yes', falsy: 'No' });
  });
});
