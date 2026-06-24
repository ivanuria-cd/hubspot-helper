import { describe, it, expect } from 'vitest';
import { buildPropertyMapTabs } from './sheets-model';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

const origins: DataOrigin[] = [
  {
    id: 'o1',
    name: 'Salesforce',
    type: 'migration',
    description: 'Migración inicial',
    objects: [{ id: 'ob1', name: 'Contact' }],
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const entries: PropertyEntry[] = [
  {
    id: 'e1',
    objectType: 'contacts',
    name: 'Grado',
    hubspotProperty: { mode: 'existing', hubspotName: 'degree' },
    sources: [
      {
        id: 's1',
        originId: 'o1',
        sourceField: 'Degree__c',
        definition: {
          kind: 'enum',
          options: [{ sourceValue: 'bach', sourceLabel: 'Bachelor', hubspotValue: 'bachelor' }],
        },
      },
    ],
    hubspotStatus: 'exists',
  },
  {
    id: 'e2',
    objectType: 'contacts',
    name: 'Activo',
    hubspotProperty: {
      mode: 'new',
      definition: { hubspotName: 'is_active', label: 'Activo', type: 'bool', fieldType: 'booleancheckbox', groupName: 'x' },
    },
    sources: [
      { id: 's2', originId: 'o1', sourceField: 'Active__c', definition: { kind: 'boolean', boolean: { truthy: '1', falsy: '0' } } },
    ],
    hubspotStatus: 'missing',
  },
];

describe('buildPropertyMapTabs', () => {
  it('genera portada, índice, orígenes y un bloque por objeto', () => {
    const tabs = buildPropertyMapTabs(entries, origins);
    expect(tabs.map((t) => t.title)).toEqual([
      '00_Portada',
      '01_Indice',
      '02_Origenes',
      '03_contacts_Campos',
      '03_contacts_Definicion',
      '03_contacts_Fuentes',
      '03_contacts_Opciones',
    ]);
  });

  it('la hoja de Entradas del objeto refleja destino, ¿nueva?, tipo y estado', () => {
    const entradas = buildPropertyMapTabs(entries, origins).find((t) => t.title === '03_contacts_Campos');
    expect(entradas?.rows[0]).toContain('Propiedad HubSpot');
    expect(entradas?.rows[1]).toEqual(['e1', 'contacts', 'Grado', 'degree', 'No', '', 'exists', 1, 0]);
    expect(entradas?.rows[2]).toEqual(['e2', 'contacts', 'Activo', 'is_active', 'Sí', 'bool', 'missing', 1, 0]);
  });

  it('la hoja de Fuentes resuelve el nombre del origen y el formato booleano', () => {
    const fuentes = buildPropertyMapTabs(entries, origins).find((t) => t.title === '03_contacts_Fuentes');
    const boolRow = fuentes?.rows.find((row) => row[0] === 's2');
    expect(boolRow).toEqual(['s2', 'Activo', 'contacts', 'Salesforce', 'Active__c', 'boolean', '1/0', '']);
  });

  it('la hoja de Opciones vuelca el mapeo enum por opción', () => {
    const opciones = buildPropertyMapTabs(entries, origins).find((t) => t.title === '03_contacts_Opciones');
    expect(opciones?.rows[0]).toEqual(['Entrada', 'Origen', 'Valor origen', 'Etiqueta origen', 'Valor HubSpot']);
    expect(opciones?.rows[1]).toEqual(['Grado', 'Salesforce', 'bach', 'Bachelor', 'bachelor']);
  });

  it('la hoja Definicion vuelca la definición completa de la propiedad destino', () => {
    const def = buildPropertyMapTabs(entries, origins).find((t) => t.title === '03_contacts_Definicion');
    expect(def?.rows[0]).toEqual([
      'ID',
      'Nombre',
      'Propiedad HubSpot',
      'Etiqueta',
      'Tipo',
      'Field type',
      'Grupo',
      'Descripción',
      'Formato número',
      'Símbolo moneda',
      'Propiedad moneda',
      'Formato texto',
      'Fórmula cálculo',
      'Valor único',
      'Sensibilidad',
      'Opciones externas',
      'Objeto referenciado',
      'Orden',
      'Oculta',
      'Campo de formulario',
    ]);
    expect(def?.rows.find((row) => row[0] === 'e2')).toEqual([
      'e2',
      'Activo',
      'is_active',
      'Activo',
      'bool',
      'booleancheckbox',
      'x',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  });

  it('la hoja DefOpciones vuelca el catálogo de opciones de propiedades nuevas de enumeración', () => {
    const enumEntry: PropertyEntry = {
      id: 'e4',
      objectType: 'contacts',
      name: 'Nivel',
      hubspotProperty: {
        mode: 'new',
        definition: {
          hubspotName: 'level',
          label: 'Nivel',
          type: 'enumeration',
          fieldType: 'select',
          groupName: 'g',
          options: [{ label: 'Alto', value: 'high', displayOrder: 0, hidden: false }],
        },
      },
      sources: [],
      hubspotStatus: 'missing',
    };
    const tabs = buildPropertyMapTabs([enumEntry], origins);
    const defOpc = tabs.find((t) => t.title === '03_contacts_DefOpciones');
    expect(defOpc?.rows[0]).toEqual(['ID', 'Nombre', 'Propiedad HubSpot', 'Valor', 'Etiqueta', 'Orden', 'Oculta']);
    expect(defOpc?.rows[1]).toEqual(['e4', 'Nivel', 'level', 'high', 'Alto', 0, false]);
  });

  it('01_Indice resume recuentos y hojas por objeto', () => {
    const indice = buildPropertyMapTabs(entries, origins)[1];
    expect(indice.title).toBe('01_Indice');
    expect(indice.rows[0]).toEqual(['Objeto', 'Campos', 'Definicion', 'Fuentes', 'Opciones', 'DefOpciones', 'Hojas']);
    expect(indice.rows[1]).toEqual([
      'contacts',
      2,
      2,
      2,
      1,
      0,
      '03_contacts_Campos, 03_contacts_Definicion, 03_contacts_Fuentes, 03_contacts_Opciones',
    ]);
  });

  it('ordena los bloques por nombre de objeto y prefija el orden de pestaña', () => {
    const multi: PropertyEntry[] = [
      ...entries,
      {
        id: 'e3',
        objectType: 'companies',
        name: 'Sector',
        hubspotProperty: { mode: 'existing', hubspotName: 'industry' },
        sources: [{ id: 's3', originId: 'o1', sourceField: 'Industry', definition: { kind: 'text' } }],
        hubspotStatus: 'exists',
      },
    ];
    const titles = buildPropertyMapTabs(multi, origins).map((t) => t.title);
    expect(titles).toEqual([
      '00_Portada',
      '01_Indice',
      '02_Origenes',
      '03_companies_Campos',
      '03_companies_Definicion',
      '03_companies_Fuentes',
      '04_contacts_Campos',
      '04_contacts_Definicion',
      '04_contacts_Fuentes',
      '04_contacts_Opciones',
    ]);
  });

  it('omite la hoja de Opciones cuando el objeto no tiene fuentes enum', () => {
    const noEnum: PropertyEntry[] = [
      {
        id: 'e9',
        objectType: 'tickets',
        name: 'Asunto',
        hubspotProperty: { mode: 'existing', hubspotName: 'subject' },
        sources: [{ id: 's9', originId: 'o1', sourceField: 'Subject', definition: { kind: 'text' } }],
        hubspotStatus: 'exists',
      },
    ];
    const titles = buildPropertyMapTabs(noEnum, origins).map((t) => t.title);
    expect(titles).not.toContain('03_tickets_Opciones');
    expect(titles).toContain('03_tickets_Campos');
  });

  it('sanea caracteres no válidos del nombre de objeto en el título de hoja', () => {
    const weird: PropertyEntry[] = [
      {
        id: 'e10',
        objectType: 'p2p[deal]',
        name: 'X',
        hubspotProperty: { mode: 'existing', hubspotName: 'x' },
        sources: [{ id: 's10', originId: 'o1', sourceField: 'X', definition: { kind: 'text' } }],
        hubspotStatus: 'exists',
      },
    ];
    const title = buildPropertyMapTabs(weird, origins).find((t) => t.title.endsWith('_Campos'))?.title;
    expect(title).toBe('03_p2p deal_Campos');
  });

  it('refleja erratas en claves sin corregirlas', () => {
    const withTypo: PropertyEntry[] = [{ ...entries[0], name: 'Graod' }];
    const entradas = buildPropertyMapTabs(withTypo, origins).find((t) => t.title === '03_contacts_Campos');
    expect(entradas?.rows[1][2]).toBe('Graod');
  });
});
