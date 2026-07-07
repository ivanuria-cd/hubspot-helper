import { describe, expect, it } from 'vitest';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';
import { ingestPlanning, type ReadTab, type CellValue } from './planning-import';

const origins: DataOrigin[] = [
  {
    id: 'o1',
    name: 'Pipedrive',
    type: 'migration',
    createdAt: '2026-01-01T00:00:00.000Z',
    objects: [],
  },
  {
    id: 'o2',
    name: 'LearnWorlds',
    type: 'integration',
    createdAt: '2026-01-01T00:00:00.000Z',
    objects: [],
  },
];

const entries: PropertyEntry[] = [
  {
    id: 'e1',
    objectType: 'contacts',
    name: 'Correo',
    hubspotProperty: {
      mode: 'existing',
      hubspotName: 'email',
      definition: {
        hubspotName: 'email',
        label: 'Email',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },
    },
    sources: [
      { id: 's1', originId: 'o1', sourceField: 'email', definition: { kind: 'text' } },
      { id: 's2', originId: 'o2', sourceField: 'username', definition: { kind: 'text' } },
    ],
    hubspotStatus: 'exists',
  },
  {
    id: 'e2',
    objectType: 'contacts',
    name: 'Nombre',
    hubspotProperty: {
      mode: 'new',
      definition: {
        hubspotName: 'first_name',
        label: 'Nombre',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },
    },
    sources: [
      { id: 's3', originId: 'o1', sourceField: 'first_name', definition: { kind: 'text' } },
    ],
    hubspotStatus: 'missing',
  },
];

const HEADER: CellValue[] = [
  'Custom',
  'Name',
  'Internal name',
  'Type',
  'Unique',
  'Options',
  'Group',
  'Description',
  'Read-only / Schema',
  'Pipedrive Field name',
  'Pipedrive Origin',
  'Pipedrive Comments',
  'LearnWorlds Field name',
  'LearnWorlds Origin',
  'LearnWorlds Comments',
];

const emailRow: CellValue[] = [
  'No',
  'Correo',
  'email',
  'string (text)',
  'No',
  '',
  'contactinformation',
  '',
  '',
  'email',
  'Migration',
  '',
  'username',
  'Integration',
  '',
];
const firstNameRow: CellValue[] = [
  'Yes (Pending)',
  'Nombre',
  'first_name',
  'string (text)',
  'No',
  '',
  'contactinformation',
  '',
  '',
  'first_name',
  'Migration',
  '',
  '',
  '',
  '',
];

function contactsTab(...rows: CellValue[][]): ReadTab[] {
  return [{ title: 'contacts', rows: [HEADER, ...rows] }];
}

describe('ingestPlanning (SPEC-0016 2.6 / incremento 4)', () => {
  it('mapa identico al estado -> sin cambios ni acciones', () => {
    const log = ingestPlanning(contactsTab(emailRow, firstNameRow), { entries, origins });
    expect(log.changes).toEqual([]);
    expect(log.needsAction).toEqual([]);
  });

  it('detecta cambio de mapeo (mapping-changed)', () => {
    const changed = [...emailRow];
    changed[9] = 'email_address';
    const log = ingestPlanning(contactsTab(changed, firstNameRow), { entries, origins });
    const mapping = log.changes.filter((c) => c.kind === 'mapping-changed');
    expect(mapping).toHaveLength(1);
    expect(mapping[0].hubspotName).toBe('email');
  });

  it('detecta alta de entrada (entry-added)', () => {
    const phoneRow: CellValue[] = [
      'Yes (Pending)',
      'Telefono',
      'phone',
      'string (phonenumber)',
      'No',
      '',
      'contactinformation',
      '',
      '',
      'phone',
      'Migration',
      '',
      '',
      '',
      '',
    ];
    const log = ingestPlanning(contactsTab(emailRow, firstNameRow, phoneRow), { entries, origins });
    const added = log.changes.filter((c) => c.kind === 'entry-added');
    expect(added).toHaveLength(1);
    expect(added[0].hubspotName).toBe('phone');
  });

  it('detecta baja de entrada (entry-removed)', () => {
    const log = ingestPlanning(contactsTab(emailRow), { entries, origins });
    const removed = log.changes.filter((c) => c.kind === 'entry-removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].hubspotName).toBe('first_name');
  });

  it('marca necesita-accion cuando el tipo user-friendly es ambiguo (choice)', () => {
    const choiceRow: CellValue[] = [
      'Yes (Pending)',
      'Segmento',
      'segment',
      'choice',
      '',
      '',
      'contactinformation',
      '',
      '',
      'segment',
      'Migration',
      '',
      '',
      '',
      '',
    ];
    const log = ingestPlanning(contactsTab(emailRow, firstNameRow, choiceRow), {
      entries,
      origins,
    });
    expect(log.needsAction).toHaveLength(1);
    expect(log.needsAction[0].userFriendlyType).toBe('choice');
    expect(log.needsAction[0].candidates.length).toBeGreaterThan(1);
  });
});
