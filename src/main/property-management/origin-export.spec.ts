import { describe, it, expect } from 'vitest';
import { buildOriginExport } from './origin-export';
import type {
  DataOrigin,
  HubSpotProperty,
  PropertyOriginMapping,
} from '@shared/types/properties';

const origin: DataOrigin = {
  id: 'o1',
  name: 'Salesforce Migration Q1',
  type: 'migration',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const property: HubSpotProperty = {
  id: 'p1',
  hubspotName: 'custom_tier',
  label: 'Tier',
  objectType: 'contacts',
  type: 'enumeration',
  fieldType: 'select',
  groupName: 'custom',
  isCustom: true,
  hubspotStatus: 'exists',
};

describe('buildOriginExport', () => {
  it('cumple el schema y mapea transformaciones', () => {
    const mappings: PropertyOriginMapping[] = [
      {
        id: 'm1',
        propertyId: 'p1',
        originId: 'o1',
        sourceField: 'Account_Tier__c',
        transformations: [{ sourceValue: 'GOLD', targetValue: 'enterprise' }],
        notes: 'nivel comercial',
      },
    ];

    const result = buildOriginExport({
      origin,
      properties: [property],
      mappings,
      now: () => '2026-06-10T10:00:00.000Z',
    });

    expect(result.schema_version).toBe(1);
    expect(result.origin).toEqual({ id: 'o1', name: 'Salesforce Migration Q1', type: 'migration' });
    expect(result.exported_at).toBe('2026-06-10T10:00:00.000Z');
    expect(result.properties).toHaveLength(1);
    expect(result.properties[0]).toEqual({
      hubspot_name: 'custom_tier',
      label: 'Tier',
      object_type: 'contacts',
      type: 'enumeration',
      source_field: 'Account_Tier__c',
      transformations: [{ sourceValue: 'GOLD', targetValue: 'enterprise' }],
      notes: 'nivel comercial',
    });
  });

  it('ignora mapeos de otros orígenes y propiedades inexistentes', () => {
    const mappings: PropertyOriginMapping[] = [
      { id: 'm1', propertyId: 'p1', originId: 'otro', sourceField: 'x', transformations: [] },
      { id: 'm2', propertyId: 'inexistente', originId: 'o1', sourceField: 'y', transformations: [] },
    ];
    const result = buildOriginExport({
      origin,
      properties: [property],
      mappings,
      now: () => '2026-06-10T10:00:00.000Z',
    });
    expect(result.properties).toHaveLength(0);
  });
});
