import { describe, it, expect } from 'vitest';
import {
  buildAddFieldsChange,
  buildCreateFormChange,
  isCompleted,
  markApplied,
} from './pending-changes';
import type { FieldCoverageItem, HubSpotForm, NewFormDefinition } from '@shared/types/forms';

const deps = { newId: () => 'id-1', now: () => '2026-06-16T00:00:00Z' };

describe('pending-changes (formularios)', () => {
  it('create_form genera un POST con formType hubspot y los campos definidos', () => {
    const definition: NewFormDefinition = {
      name: 'Newsletter',
      originIds: ['o1'],
      objectType: 'contacts',
      fields: [
        { hubspotName: 'email', label: 'Email', fieldType: 'email', required: true, hidden: false },
        {
          hubspotName: 'firstname',
          label: 'Nombre',
          fieldType: 'single_line_text',
          required: false,
          hidden: false,
        },
      ],
    };
    const change = buildCreateFormChange(definition, deps);
    expect(change.operation).toBe('create_form');
    expect(change.formId).toBeUndefined();
    const payload = change.payload as {
      formType: string;
      fieldGroups: Array<{ fields: Array<{ objectTypeId: string; name: string }> }>;
      legalConsentOptions: { type: string };
    };
    expect(payload.formType).toBe('hubspot');
    expect(payload.legalConsentOptions.type).toBe('none');
    expect(payload.fieldGroups[0]?.fields.map((f) => f.name)).toEqual(['email', 'firstname']);
    expect(payload.fieldGroups[0]?.fields[0]?.objectTypeId).toBe('0-1');
  });

  it('add_fields genera un PATCH que añade solo los campos que faltan', () => {
    const form: HubSpotForm = {
      id: 'f1',
      name: 'Demo',
      formType: 'hubspot',
      archived: false,
      updatedAt: '',
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
    };
    const missing: FieldCoverageItem[] = [
      { hubspotName: 'firstname', label: 'Nombre', objectType: 'contacts', fieldType: 'single_line_text', status: 'missing' },
      { hubspotName: 'phone', label: 'Teléfono', objectType: 'contacts', fieldType: 'phone', status: 'missing' },
    ];
    const change = buildAddFieldsChange(form, 'contacts', missing, deps);
    expect(change.operation).toBe('add_fields');
    expect(change.formId).toBe('f1');

    const payload = change.payload as {
      fieldGroups: Array<{ fields: Array<{ name: string }> }>;
    };
    const allNames = payload.fieldGroups.flatMap((g) => g.fields.map((f) => f.name));
    // El email existente se preserva y se añaden solo los que faltan
    expect(allNames).toContain('email');
    const added = allNames.filter((n) => n !== 'email');
    expect(added.sort()).toEqual(['firstname', 'phone']);
  });

  it('markApplied marca el entorno y isCompleted exige producción', () => {
    const base = buildCreateFormChange(
      { name: 'X', originIds: [], objectType: 'contacts', fields: [] },
      deps,
    );
    const sandbox = markApplied(base, 'sandbox');
    expect(sandbox.appliedToSandbox).toBe(true);
    expect(isCompleted(sandbox)).toBe(false);
    const prod = markApplied(sandbox, 'production');
    expect(prod.appliedToProduction).toBe(true);
    expect(isCompleted(prod)).toBe(true);
  });
});
