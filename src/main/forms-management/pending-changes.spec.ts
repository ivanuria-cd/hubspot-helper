import { describe, it, expect } from 'vitest';
import {
  applyEditsToFormPayload,
  buildAddFieldsChange,
  buildCreateFormChange,
  buildUpdateFormChange,
  consentMissingRequired,
  isCompleted,
  markApplied,
  mergeConsentTemplate,
  normalizeFormDefinition,
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
      archived: boolean;
      createdAt: string;
      updatedAt: string;
      fieldGroups: Array<{
        fields: Array<{
          objectTypeId: string;
          name: string;
          fieldType: string;
          validation?: { blockedEmailDomains: string[]; useDefaultBlockList: boolean };
        }>;
      }>;
      legalConsentOptions: { type: string };
    };
    expect(payload.formType).toBe('hubspot');
    // Campos requeridos por HubSpot en el cuerpo (§25)
    expect(payload.archived).toBe(false);
    expect(payload.createdAt).toBe('2026-06-16T00:00:00Z');
    expect(payload.updatedAt).toBe('2026-06-16T00:00:00Z');
    expect(payload.legalConsentOptions.type).toBe('none');
    expect(payload.fieldGroups[0]?.fields.map((f) => f.name)).toEqual(['email', 'firstname']);
    expect(payload.fieldGroups[0]?.fields[0]?.objectTypeId).toBe('0-1');
    // El campo email lleva validation (requerido por Marketing Forms API v3, §20)
    expect(payload.fieldGroups[0]?.fields[0]?.validation).toEqual({
      blockedEmailDomains: [],
      useDefaultBlockList: false,
    });
    // Los campos no-email no llevan validation
    expect(payload.fieldGroups[0]?.fields[1]?.validation).toBeUndefined();
  });

  it('create_form reparte en grupos de ≤3 campos (§26)', () => {
    const definition: NewFormDefinition = {
      name: 'Muchos',
      originIds: [],
      objectType: 'contacts',
      fields: ['a', 'b', 'c', 'd', 'e'].map((n) => ({
        hubspotName: n,
        label: n,
        fieldType: 'single_line_text',
        required: false,
        hidden: false,
      })),
    };
    const change = buildCreateFormChange(definition, deps);
    const payload = change.payload as { fieldGroups: Array<{ fields: unknown[] }> };
    expect(payload.fieldGroups).toHaveLength(2); // 5 campos → 3 + 2
    expect(payload.fieldGroups.every((g) => g.fields.length <= 3)).toBe(true);
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
      fieldGroups: Array<{
        fields: Array<{
          name: string;
          fieldType: string;
          validation?: { blockedEmailDomains: string[]; useDefaultBlockList: boolean };
        }>;
      }>;
    };
    const allFields = payload.fieldGroups.flatMap((g) => g.fields);
    const allNames = allFields.map((f) => f.name);
    // El email existente se preserva y se añaden solo los que faltan
    expect(allNames).toContain('email');
    const added = allNames.filter((n) => n !== 'email');
    expect(added.sort()).toEqual(['firstname', 'phone']);
    // El email reenviado conserva su validation (§20)
    expect(allFields.find((f) => f.name === 'email')?.validation).toEqual({
      blockedEmailDomains: [],
      useDefaultBlockList: false,
    });
  });

  it('normalizeFormDefinition acepta la forma HubSpot (fieldGroups) y conserva el name del campo', () => {
    const def = normalizeFormDefinition({
      name: 'Aficiones',
      fieldGroups: [
        {
          fields: [
            { objectTypeId: '0-1', name: 'email', label: 'Email', fieldType: 'email' },
            { objectTypeId: '0-1', name: 'firstname', label: 'Nombre', fieldType: 'single_line_text' },
          ],
        },
      ],
    });
    expect(def.objectType).toBe('contacts');
    expect(def.fields.map((f) => f.hubspotName)).toEqual(['email', 'firstname']);
  });

  it('buildCreateFormChange con fieldGroups no rompe y conserva los name en el payload', () => {
    const change = buildCreateFormChange(
      {
        name: 'Aficiones',
        fieldGroups: [{ fields: [{ objectTypeId: '0-1', name: 'email', fieldType: 'email' }] }],
      },
      deps,
    );
    const payload = change.payload as {
      fieldGroups: Array<{ fields: Array<{ name: string }> }>;
    };
    expect(payload.fieldGroups[0]?.fields[0]?.name).toBe('email');
  });

  it('normalizeFormDefinition exige name de campo y name de formulario', () => {
    expect(() =>
      normalizeFormDefinition({ name: 'X', fields: [{ label: 'Sin name', fieldType: 'email' }] }),
    ).toThrow();
    expect(() => normalizeFormDefinition({ fields: [] })).toThrow(/name/);
  });

  it('buildUpdateFormChange sin raw reconstruye fieldGroups desde el espejo del formulario', () => {
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
    const change = buildUpdateFormChange(form, { name: 'Demo 2' }, deps);
    expect(change.operation).toBe('update_form');
    expect(change.formId).toBe('f1');
    const payload = change.payload as {
      name: string;
      legalConsentOptions: { type: string };
      fieldGroups: Array<{ fields: Array<{ name: string; validation?: unknown }> }>;
    };
    expect(payload.name).toBe('Demo 2');
    expect(payload.legalConsentOptions.type).toBe('none');
    // sin raw, reconstruye los campos conocidos e inyecta validation en el email
    expect(payload.fieldGroups[0]?.fields[0]?.name).toBe('email');
    expect(payload.fieldGroups[0]?.fields[0]?.validation).toEqual({
      blockedEmailDomains: [],
      useDefaultBlockList: false,
    });
  });

  it('applyEditsToFormPayload con isAddFields solo toca fieldGroups (no nombre)', () => {
    const base = { name: 'Demo', fieldGroups: [{ fields: [] }], configuration: { language: 'es' } };
    const result = applyEditsToFormPayload(
      base,
      { name: 'NO_DEBE_APLICAR', fields: [{ name: 'phone', fieldType: 'phone' }] },
      { isAddFields: true },
    );
    expect(result.name).toBe('Demo'); // nombre intacto en add_fields
    const payload = result as { fieldGroups: Array<{ fields: Array<{ name: string }> }> };
    expect(payload.fieldGroups[0]?.fields[0]?.name).toBe('phone');
  });

  it('consentMissingRequired y mergeConsentTemplate (§24)', () => {
    expect(consentMissingRequired({ type: 'none' })).toEqual([]);
    expect(consentMissingRequired({ type: 'explicit_consent_to_process' })).toEqual([
      'privacyText',
      'communicationsCheckboxes',
    ]);
    const merged = mergeConsentTemplate(
      { type: 'explicit_consent_to_process' },
      {
        type: 'explicit_consent_to_process',
        privacyText: 'P',
        communicationsCheckboxes: [{ subscriptionTypeId: 1, label: 'N', required: false }],
      },
    );
    expect(consentMissingRequired(merged)).toEqual([]);
    // no pisa lo ya puesto por el usuario
    const kept = mergeConsentTemplate(
      { type: 'explicit_consent_to_process', privacyText: 'MÍO', communicationsCheckboxes: [{ subscriptionTypeId: 2, label: 'X', required: true }] },
      { type: 'explicit_consent_to_process', privacyText: 'OTRO' },
    );
    expect(kept.privacyText).toBe('MÍO');
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
