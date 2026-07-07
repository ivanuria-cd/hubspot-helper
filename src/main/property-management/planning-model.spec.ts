import { describe, expect, it } from 'vitest';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';
import type { PlanningAssociation } from '@shared/types/planning';
import { buildPlanningWorkbook, type SheetTab } from './planning-model';

const origins: DataOrigin[] = [
  {
    id: 'o1',
    name: 'Pipedrive',
    type: 'migration',
    createdAt: '2026-01-01T00:00:00.000Z',
    objects: [{ id: 'po1', name: 'People', fields: ['email', 'first_name'] }],
  },
  {
    id: 'o2',
    name: 'LearnWorlds',
    type: 'integration',
    createdAt: '2026-01-01T00:00:00.000Z',
    objects: [{ id: 'lw1', name: 'User', fields: ['username', 'course'] }],
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
      {
        id: 's1',
        originId: 'o1',
        originObjectId: 'po1',
        sourceField: 'email',
        definition: { kind: 'text' },
      },
      {
        id: 's2',
        originId: 'o2',
        originObjectId: 'lw1',
        sourceField: 'username',
        definition: { kind: 'text' },
      },
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
      {
        id: 's3',
        originId: 'o1',
        originObjectId: 'po1',
        sourceField: 'first_name',
        definition: { kind: 'text' },
      },
    ],
    hubspotStatus: 'missing',
  },
  {
    id: 'e3',
    objectType: 'deals',
    name: 'Importe',
    hubspotProperty: {
      mode: 'new',
      definition: {
        hubspotName: 'amount_custom',
        label: 'Importe',
        type: 'number',
        fieldType: 'number',
        groupName: 'dealinformation',
      },
    },
    sources: [
      {
        id: 's4',
        originId: 'o1',
        originObjectId: 'po1',
        sourceField: 'value',
        definition: { kind: 'number' },
      },
    ],
    hubspotStatus: 'missing',
  },
];

const associations: PlanningAssociation[] = [
  { objetoA: 'contacts', objetoB: 'deals', claveEnlace: 'email', notas: 'nota' },
];

function tab(tabs: SheetTab[], title: string): SheetTab {
  const found = tabs.find((t) => t.title === title);
  if (!found) throw new Error(`tab no encontrada: ${title}`);
  return found;
}

describe('buildPlanningWorkbook (SPEC-0016 incremento 3)', () => {
  const wb = buildPlanningWorkbook({ entries, origins, associations });

  it('primera hoja es Leyenda y estan las hojas de objeto', () => {
    expect(wb.tabs[0].title).toBe('Leyenda');
    const titles = wb.tabs.map((t) => t.title);
    expect(titles).toContain('contacts');
    expect(titles).toContain('deals');
  });

  it('scoping: contacts tiene ambos origenes; deals solo Pipedrive', () => {
    const contactsHeader = tab(wb.tabs, 'contacts').rows[0];
    expect(contactsHeader).toContain('Pipedrive Field name');
    expect(contactsHeader).toContain('LearnWorlds Field name');
    const dealsHeader = tab(wb.tabs, 'deals').rows[0];
    expect(dealsHeader).toContain('Pipedrive Field name');
    expect(dealsHeader).not.toContain('LearnWorlds Field name');
  });

  it('Custom se deriva del modo (nueva -> Yes (Pending), existente -> No)', () => {
    const rows = tab(wb.tabs, 'contacts').rows;
    const correo = rows.find((r) => r[2] === 'email');
    const nombre = rows.find((r) => r[2] === 'first_name');
    expect(correo?.[0]).toBe('No');
    expect(nombre?.[0]).toBe('Yes (Pending)');
  });

  it('preselecciona el campo de origen mapeado en su bloque', () => {
    const header = tab(wb.tabs, 'contacts').rows[0];
    const pdCol = header.indexOf('Pipedrive Field name');
    const correo = tab(wb.tabs, 'contacts').rows.find((r) => r[2] === 'email');
    expect(correo?.[pdCol]).toBe('email');
  });

  it('validaciones: Custom y Origin literales, Field name con rango de Listas', () => {
    const custom = wb.validations.find((v) => v.tab === 'contacts' && v.column === 0);
    expect(custom?.oneOf).toEqual(['No', 'Yes (Pending)', 'Yes (Created)']);
    const fieldName = wb.validations.find((v) => v.tab === 'contacts' && v.column === 9);
    expect(fieldName?.listRange).toMatch(/^Listas!\$/);
    const origin = wb.validations.find((v) => v.tab === 'contacts' && v.column === 10);
    expect(origin?.oneOf).toEqual(['Migration', 'Integration']);
  });

  it('Listas oculta con una columna por (objeto, origen)', () => {
    expect(wb.hiddenTabs).toContain('Listas');
    const listasHeader = tab(wb.tabs, 'Listas').rows[0];
    expect(listasHeader).toContain('contacts|Pipedrive');
    expect(listasHeader).toContain('contacts|LearnWorlds');
    expect(listasHeader).toContain('deals|Pipedrive');
  });

  it('hoja Origen con destino calculado (INDEX/MATCH) y marcada como formulaTab', () => {
    const origen = tab(wb.tabs, 'Origen Pipedrive');
    expect(origen.rows[0]).toEqual(['Objeto', 'Campo', '-> Propiedad HubSpot destino', 'Notas']);
    const formulaRow = origen.rows.find(
      (r) => typeof r[2] === 'string' && (r[2] as string).startsWith('=IFERROR'),
    );
    expect(formulaRow?.[2]).toContain("'contacts'!$C:$C");
    expect(wb.formulaTabs).toContain('Origen Pipedrive');
  });

  it('Origen LearnWorlds no referencia deals (scoping)', () => {
    const origen = tab(wb.tabs, 'Origen LearnWorlds');
    const objetos = new Set(origen.rows.slice(1).map((r) => r[0]));
    expect(objetos.has('contacts')).toBe(true);
    expect(objetos.has('deals')).toBe(false);
  });

  it('Asociaciones informativa con la fila aportada', () => {
    const aso = tab(wb.tabs, 'Asociaciones');
    expect(aso.rows[0]).toEqual(['Objeto A', 'Objeto B', 'Clave de enlace', 'Notas']);
    expect(aso.rows[1]).toEqual(['contacts', 'deals', 'email', 'nota']);
  });
});
