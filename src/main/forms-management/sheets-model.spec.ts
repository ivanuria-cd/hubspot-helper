import { describe, it, expect } from 'vitest';
import { buildFormsTabs, FORMS_SHEETS_SCHEMA_VERSION } from './sheets-model';
import type { FormCoverageReport, FormOriginLink, HubSpotForm } from '@shared/types/forms';
import type { DataOrigin } from '@shared/types/properties';

const forms: HubSpotForm[] = [
  {
    id: 'f1',
    name: 'Newsletter',
    formType: 'hubspot',
    archived: false,
    updatedAt: '2026-06-16',
    objectTypes: ['contacts'],
    fieldNames: ['email'],
    fieldGroups: [
      {
        fields: [
          { objectTypeId: '0-1', name: 'email', label: 'Email', fieldType: 'email', required: true, hidden: false },
        ],
      },
    ],
  },
];

const links: FormOriginLink[] = [
  { id: 'l1', formId: 'f1', originIds: ['o1'], objectType: 'contacts', createdAt: '2026-06-16' },
];

const reports: FormCoverageReport[] = [
  { formId: 'f1', originId: 'o1', objectType: 'contacts', expected: 2, present: 1, missing: 1, items: [] },
];

const origins: DataOrigin[] = [
  { id: 'o1', name: 'Salesforce', type: 'integration', createdAt: '2026-06-16' },
];

describe('sheets-model (formularios)', () => {
  it('produce cuatro hojas con encabezados y una fila por elemento', () => {
    const tabs = buildFormsTabs(forms, links, reports, origins, '2026-06-16T00:00:00Z');
    expect(tabs.map((t) => t.title)).toEqual([
      '00_Portada',
      '01_Formularios',
      '02_Asociaciones',
      '03_Cobertura',
    ]);
    expect(tabs[0]?.rows).toContainEqual(['schema_version', FORMS_SHEETS_SCHEMA_VERSION]);

    const formularios = tabs[1]!;
    expect(formularios.rows[0]).toEqual([
      'ID', 'Nombre', 'Tipo', 'Archivado', 'Objetos', 'Nº campos', 'Actualizado',
    ]);
    expect(formularios.rows[1]).toEqual(['f1', 'Newsletter', 'hubspot', false, 'contacts', 1, '2026-06-16']);

    const asociaciones = tabs[2]!;
    expect(asociaciones.rows[1]).toEqual(['l1', 'Newsletter', 'contacts', 'Salesforce']);

    const cobertura = tabs[3]!;
    expect(cobertura.rows[1]).toEqual(['Newsletter', 'Salesforce', 'contacts', 2, 1, 1]);
  });

  it('refleja ids verbatim cuando no encuentra el nombre (no corrige erratas)', () => {
    const tabs = buildFormsTabs(forms, links, reports, [], '');
    const cobertura = tabs[3]!;
    // sin origins, se muestra el id del origen tal cual
    expect(cobertura.rows[1]?.[1]).toBe('o1');
  });
});
