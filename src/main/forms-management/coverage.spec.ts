import { describe, it, expect } from 'vitest';
import { buildCoverageReport, expectedProperties, missingItems } from './coverage';
import type { HubSpotForm } from '@shared/types/forms';
import type { PropertyEntry } from '@shared/types/properties';

function entry(partial: Partial<PropertyEntry> & { id: string }): PropertyEntry {
  return {
    id: partial.id,
    objectType: partial.objectType ?? 'contacts',
    name: partial.name ?? 'Nombre',
    hubspotProperty: partial.hubspotProperty ?? {
      mode: 'existing',
      hubspotName: 'firstname',
      definition: {
        hubspotName: 'firstname',
        label: 'Nombre',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },
    },
    sources: partial.sources ?? [
      {
        id: 's1',
        originId: 'o1',
        sourceField: 'first_name',
        definition: { kind: 'text' },
      },
    ],
    hubspotStatus: 'exists',
  };
}

function form(names: string[]): HubSpotForm {
  return {
    id: 'f1',
    name: 'Demo',
    formType: 'hubspot',
    archived: false,
    updatedAt: '',
    objectTypes: ['contacts'],
    fieldNames: names,
    fieldGroups: [
      {
        fields: names.map((name) => ({
          objectTypeId: '0-1',
          name,
          label: name,
          fieldType: 'single_line_text',
          required: false,
          hidden: false,
        })),
      },
    ],
  };
}

describe('coverage', () => {
  const entries: PropertyEntry[] = [
    entry({ id: 'e1', hubspotProperty: { mode: 'existing', hubspotName: 'firstname' } }),
    entry({ id: 'e2', hubspotProperty: { mode: 'existing', hubspotName: 'email' } }),
    entry({
      id: 'e3',
      hubspotProperty: {
        mode: 'new',
        definition: {
          hubspotName: 'custom_tier',
          label: 'Tier',
          type: 'enumeration',
          fieldType: 'select',
          groupName: 'custom',
        },
      },
    }),
  ];

  it('expectedProperties deriva las propiedades destino del origen para el objeto', () => {
    const expected = expectedProperties(entries, 'o1', 'contacts');
    expect(expected.map((i) => i.hubspotName).sort()).toEqual(['custom_tier', 'email', 'firstname']);
    // email se mapea a campo email; select → dropdown
    expect(expected.find((i) => i.hubspotName === 'email')?.fieldType).toBe('email');
    expect(expected.find((i) => i.hubspotName === 'custom_tier')?.fieldType).toBe('dropdown');
  });

  it('reporta missing cuando faltan propiedades del origen', () => {
    const report = buildCoverageReport(form(['firstname']), entries, 'o1', 'contacts');
    expect(report.expected).toBe(3);
    expect(report.present).toBe(1);
    expect(report.missing).toBe(2);
    expect(missingItems(report).map((i) => i.hubspotName).sort()).toEqual(['custom_tier', 'email']);
  });

  it('un formulario completo reporta todo present', () => {
    const report = buildCoverageReport(
      form(['firstname', 'email', 'custom_tier']),
      entries,
      'o1',
      'contacts',
    );
    expect(report.missing).toBe(0);
    expect(report.items.every((i) => i.status === 'present')).toBe(true);
  });

  it('la comparación es por objectType + name (otro objeto no cuenta)', () => {
    const dealForm: HubSpotForm = {
      ...form([]),
      objectTypes: ['deals'],
      fieldGroups: [
        {
          fields: [
            {
              objectTypeId: '0-3',
              name: 'firstname',
              label: 'firstname',
              fieldType: 'single_line_text',
              required: false,
              hidden: false,
            },
          ],
        },
      ],
    };
    // firstname está pero como campo de deals; para contacts sigue faltando
    const report = buildCoverageReport(dealForm, entries, 'o1', 'contacts');
    expect(report.present).toBe(0);
    expect(report.missing).toBe(3);
  });
});
