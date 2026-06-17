import { describe, it, expect } from 'vitest';
import {
  PROPERTY_STATE_SCHEMA_VERSION,
  parsePropertyState,
  serializePropertyState,
  type PropertyDriveState,
} from './drive-state';

const sample: PropertyDriveState = {
  origins: [
    { id: 'o1', name: 'Salesforce', type: 'migration', objects: [], createdAt: '2026-06-11T00:00:00.000Z' },
  ],
  entries: [
    {
      id: 'e1',
      objectType: 'contacts',
      name: 'Tier',
      hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
      sources: [],
      hubspotStatus: 'exists',
      pendingChanges: [],
    },
  ],
};

describe('drive-state (propiedades)', () => {
  it('round-trip serializa y parsea sin pérdida', () => {
    const parsed = parsePropertyState(serializePropertyState(sample));
    const { schemaVersion, ...state } = parsed;
    expect(schemaVersion).toBe(PROPERTY_STATE_SCHEMA_VERSION);
    expect(state).toEqual(sample);
  });

  it('lanza si schema_version es mayor que el soportado', () => {
    const content = JSON.stringify({
      schema_version: PROPERTY_STATE_SCHEMA_VERSION + 1,
      entries: [],
      origins: [],
    });
    expect(() => parsePropertyState(content)).toThrow(
      'El documento es de una versión más nueva que la app.',
    );
  });

  it('lanza si schema_version no es número', () => {
    expect(() => parsePropertyState(JSON.stringify({ entries: [], origins: [] }))).toThrow();
  });
});
