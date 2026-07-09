import { describe, expect, it } from 'vitest';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';
import {
  buildDraftEntries,
  ingestPlanning,
  parsePlanningTabs,
  type CellValue,
  type ParsedPlanningEntry,
  type PlanningResolution,
  type ReadTab,
} from './planning-import';
import { PLANNING_META_TITLE } from './planning-meta';

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

describe('buildDraftEntries (SPEC-0016 2.6 apply / incremento 6 parte 2)', () => {
  const parsedExisting: ParsedPlanningEntry = {
    objectType: 'contacts',
    custom: 'No',
    name: 'Correo',
    internalName: 'email',
    type: 'string (text)',
    sources: [
      {
        originId: 'o1',
        originName: 'Pipedrive',
        sourceField: 'email',
        originType: 'Migration',
        comments: '',
      },
    ],
  };
  const parsedNewText: ParsedPlanningEntry = {
    objectType: 'contacts',
    custom: 'Yes (Pending)',
    name: 'Ciudad',
    internalName: 'city',
    type: 'text',
    sources: [],
  };
  const parsedNewChoice: ParsedPlanningEntry = {
    objectType: 'contacts',
    custom: 'Yes (Pending)',
    name: 'Segmento',
    internalName: 'segment',
    type: 'choice',
    sources: [],
  };

  it('fila existente reutiliza el id de la entrada actual (update)', () => {
    const { drafts } = buildDraftEntries([parsedExisting], { entries, origins });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe('e1');
    expect(drafts[0].hubspotProperty.mode).toBe('existing');
  });

  it('fila nueva 1:1 genera definicion (text -> string/text) sin id', () => {
    const { drafts } = buildDraftEntries([parsedNewText], { entries, origins });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBeUndefined();
    const ref = drafts[0].hubspotProperty;
    expect(ref.mode).toBe('new');
    if (ref.mode === 'new') {
      expect(ref.definition.type).toBe('string');
      expect(ref.definition.fieldType).toBe('text');
    }
  });

  it('tipo ambiguo sin resolver -> bloqueado, sin borrador', () => {
    const { drafts, blocked } = buildDraftEntries([parsedNewChoice], { entries, origins });
    expect(drafts).toHaveLength(0);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].userFriendlyType).toBe('choice');
  });

  it('tipo ambiguo resuelto por el usuario -> borrador con la config elegida', () => {
    const resolutions: PlanningResolution[] = [
      {
        objectType: 'contacts',
        entryName: 'Segmento',
        config: { type: 'enumeration', fieldType: 'select' },
      },
    ];
    const { drafts, blocked } = buildDraftEntries(
      [parsedNewChoice],
      { entries, origins },
      resolutions,
    );
    expect(blocked).toHaveLength(0);
    expect(drafts).toHaveLength(1);
    const ref = drafts[0].hubspotProperty;
    if (ref.mode === 'new') {
      expect(ref.definition.fieldType).toBe('select');
    }
  });
});

describe('§53.6 round-trip del objectType via 00_Metadatos', () => {
  const OBJ_HEADER = [
    'Custom',
    'Name',
    'Internal name',
    'Type',
    'Unique',
    'Options',
    'Group',
    'Description',
    'Read-only / Schema',
  ];
  const objectTab = (title: string): ReadTab => ({
    title,
    rows: [OBJ_HEADER, ['No', 'Correo', 'email', 'text', 'No', '', 'contactinformation', '', '']],
  });
  const metaTab = (pairs: Array<[string, string]>): ReadTab => ({
    title: PLANNING_META_TITLE,
    rows: [['Tab', 'Object type'], ...pairs],
  });

  it('usa el objectType real de la hoja de metadatos, no el titulo saneado', () => {
    const tabs = [metaTab([['Mi Objeto', '2-99_real']]), objectTab('Mi Objeto')];
    expect(parsePlanningTabs(tabs, []).map((e) => e.objectType)).toEqual(['2-99_real']);
  });

  it('sin hoja de metadatos cae al titulo (mapas anteriores al schema 2)', () => {
    expect(parsePlanningTabs([objectTab('contacts')], []).map((e) => e.objectType)).toEqual([
      'contacts',
    ]);
  });
});
