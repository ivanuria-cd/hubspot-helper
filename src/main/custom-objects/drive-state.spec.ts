import { describe, it, expect } from 'vitest';
import {
  CUSTOM_OBJECTS_STATE_SCHEMA_VERSION,
  parseCustomObjectsState,
  serializeCustomObjectsState,
  type CustomObjectsDriveState,
} from './drive-state';

const sample: CustomObjectsDriveState = {
  objects: [
    {
      id: 'obj1',
      name: 'machine',
      labels: { singular: 'Máquina', plural: 'Máquinas' },
      primaryDisplayProperty: 'model',
      requiredProperties: ['model'],
      properties: [{ name: 'model', label: 'Modelo', type: 'string', fieldType: 'text' }],
      status: 'draft',
      createdAt: '2026-06-16T00:00:00.000Z',
      updatedAt: '2026-06-16T00:00:00.000Z',
    },
  ],
};

describe('drive-state (objetos custom)', () => {
  it('round-trip serializa y parsea sin pérdida', () => {
    const parsed = parseCustomObjectsState(serializeCustomObjectsState(sample));
    const { schemaVersion, ...state } = parsed;
    expect(schemaVersion).toBe(CUSTOM_OBJECTS_STATE_SCHEMA_VERSION);
    expect(state).toEqual(sample);
  });

  it('lanza si schema_version es mayor que el soportado', () => {
    const content = JSON.stringify({
      schema_version: CUSTOM_OBJECTS_STATE_SCHEMA_VERSION + 1,
      objects: [],
    });
    expect(() => parseCustomObjectsState(content)).toThrow(
      'El documento es de una versión más nueva que la app.',
    );
  });

  it('lanza si schema_version no es número', () => {
    expect(() => parseCustomObjectsState(JSON.stringify({ objects: [] }))).toThrow();
  });
});
