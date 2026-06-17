import { describe, it, expect } from 'vitest';
import {
  FORMS_STATE_SCHEMA_VERSION,
  parseFormsState,
  serializeFormsState,
  type FormsDriveState,
} from './drive-state';

const sample: FormsDriveState = {
  forms: [
    {
      id: 'f1',
      name: 'Newsletter',
      formType: 'hubspot',
      archived: false,
      updatedAt: '2026-06-16T00:00:00.000Z',
      objectTypes: ['contacts'],
      fieldNames: ['email'],
      fieldGroups: [
        {
          fields: [
            {
              objectTypeId: '0-1',
              name: 'email',
              label: 'Email',
              fieldType: 'email',
              required: true,
              hidden: false,
            },
          ],
        },
      ],
    },
  ],
  links: [
    {
      id: 'l1',
      formId: 'f1',
      originIds: ['o1'],
      objectType: 'contacts',
      createdAt: '2026-06-16T00:00:00.000Z',
    },
  ],
};

describe('drive-state (formularios)', () => {
  it('round-trip serializa y parsea sin pérdida', () => {
    const parsed = parseFormsState(serializeFormsState(sample));
    const { schemaVersion, ...state } = parsed;
    expect(schemaVersion).toBe(FORMS_STATE_SCHEMA_VERSION);
    expect(state).toEqual(sample);
  });

  it('lanza si schema_version es mayor que el soportado', () => {
    const content = JSON.stringify({
      schema_version: FORMS_STATE_SCHEMA_VERSION + 1,
      forms: [],
      links: [],
    });
    expect(() => parseFormsState(content)).toThrow(
      'El documento es de una versión más nueva que la app.',
    );
  });

  it('lanza si schema_version no es número', () => {
    expect(() => parseFormsState(JSON.stringify({ forms: [], links: [] }))).toThrow();
  });
});
