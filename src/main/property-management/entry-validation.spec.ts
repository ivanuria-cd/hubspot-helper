import { describe, it, expect } from 'vitest';
import { validateEntryInput, EntryValidationError } from './entry-validation';
import type { EntryUpsertInput } from '@shared/types/properties';

const valid: EntryUpsertInput['entry'] = {
  objectType: 'contacts',
  name: 'LOPD - Estado',
  hubspotProperty: {
    mode: 'new',
    definition: {
      hubspotName: 'lopd_estado',
      label: 'LOPD - Estado',
      type: 'string',
      fieldType: 'text',
      groupName: 'datos_firma_lopd',
    },
  },
  sources: [{ id: 's1', originId: 'o1', sourceField: 'estado', definition: { kind: 'text' } }],
};

describe('validateEntryInput', () => {
  it('no devuelve issues para un entry válido', () => {
    expect(validateEntryInput(valid)).toEqual([]);
  });

  it('acumula todos los problemas, no solo el primero', () => {
    const bad = {
      hubspotProperty: 'firstname',
      sources: ['0bc11910'],
    } as unknown as EntryUpsertInput['entry'];
    const issues = validateEntryInput(bad);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain('OBJECT_TYPE_REQUIRED');
    expect(codes).toContain('NAME_REQUIRED');
    expect(codes).toContain('HUBSPOT_PROPERTY_NOT_OBJECT');
    expect(codes).toContain('SOURCE_NOT_OBJECT');
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  it('cada issue lleva field y, donde aplica, un ejemplo', () => {
    const bad = { ...valid, hubspotProperty: 'x' } as unknown as EntryUpsertInput['entry'];
    const issue = validateEntryInput(bad).find((i) => i.code === 'HUBSPOT_PROPERTY_NOT_OBJECT');
    expect(issue?.field).toBe('hubspotProperty');
    expect(issue?.example).toBeTruthy();
  });

  it('EntryValidationError expone code e issues', () => {
    const err = new EntryValidationError(validateEntryInput({} as EntryUpsertInput['entry']));
    expect(err.code).toBe('ENTRY_VALIDATION');
    expect(err.issues.length).toBeGreaterThan(0);
    expect(err.message).toContain('entry inválido');
  });

  it('rechaza hubspotName demasiado largo (§44)', () => {
    const long = 'a'.repeat(101);
    const entry = {
      ...valid,
      hubspotProperty: { mode: 'new', definition: { ...valid.hubspotProperty.definition!, hubspotName: long } },
    } as EntryUpsertInput['entry'];
    expect(validateEntryInput(entry).map((i) => i.code)).toContain('HUBSPOTNAME_TOO_LONG');
  });

  it('rechaza hubspotName con patrón inválido (§44)', () => {
    const entry = {
      ...valid,
      hubspotProperty: { mode: 'existing', hubspotName: 'Mi Campo' },
    } as EntryUpsertInput['entry'];
    expect(validateEntryInput(entry).map((i) => i.code)).toContain('HUBSPOTNAME_PATTERN');
  });
});
