import { describe, it, expect } from 'vitest';
import { writePropertyMap, type SheetsClient, type SheetsWriteInput } from './sheets-writer';
import type {
  DataOrigin,
  HubSpotProperty,
  PropertyOriginMapping,
} from '@shared/types/properties';

const origins: DataOrigin[] = [
  { id: 'o1', name: 'Salesforce Q1', type: 'migration', createdAt: '2026-06-01T00:00:00.000Z' },
];

const properties: HubSpotProperty[] = [
  {
    id: 'p1',
    hubspotName: 'custom_tier',
    label: 'Tier',
    objectType: 'contacts',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'custom',
    isCustom: true,
    options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    hubspotStatus: 'divergent',
    pendingChanges: [
      {
        id: 'c1',
        propertyId: 'p1',
        operation: 'update_label',
        summary: 'Cambiar etiqueta',
        payload: {},
        appliedToSandbox: false,
        appliedToProduction: false,
        createdAt: '2026-06-10T00:00:00.000Z',
      },
    ],
  },
];

const mappings: PropertyOriginMapping[] = [
  {
    id: 'm1',
    propertyId: 'p1',
    originId: 'o1',
    sourceField: 'Account_Tier__c',
    transformations: [{ sourceValue: 'GOLD', targetValue: 'enterprise' }],
  },
];

function memoryClient(): SheetsClient & { last: () => SheetsWriteInput | null } {
  let last: SheetsWriteInput | null = null;
  return {
    writeSpreadsheet: (input) => {
      last = input;
      return Promise.resolve({ spreadsheetId: 'sheet-1' });
    },
    last: () => last,
  };
}

describe('writePropertyMap', () => {
  it('escribe las cuatro hojas con sus cabeceras', async () => {
    const client = memoryClient();
    const result = await writePropertyMap({
      client,
      folderId: 'folder-1',
      projectName: 'Acme',
      origins,
      properties,
      mappings,
      generatedAt: '2026-06-10T10:00:00.000Z',
    });

    expect(result.spreadsheetId).toBe('sheet-1');
    const written = client.last();
    expect(written?.featureKey).toBe('property-management');
    expect(written?.schemaVersion).toBe(1);

    const titles = written?.tabs.map((tab) => tab.title);
    expect(titles).toEqual(['00_Portada', '01_Origenes', '02_Propiedades', '03_Mapeo_Origenes']);
  });

  it('vuelca el contenido correcto en cada hoja', async () => {
    const client = memoryClient();
    await writePropertyMap({
      client,
      folderId: 'folder-1',
      projectName: 'Acme',
      origins,
      properties,
      mappings,
      generatedAt: '2026-06-10T10:00:00.000Z',
    });
    const tabs = client.last()!.tabs;

    const cover = tabs[0]!;
    expect(cover.rows[0]).toEqual(['Mapa de Propiedades — Cloud District']);
    expect(cover.rows.some((row) => String(row[0]).includes('schema_version: 1'))).toBe(true);

    const originsTab = tabs[1]!;
    expect(originsTab.rows[0]).toEqual(['ID', 'Nombre', 'Tipo', 'Descripción', 'Fecha de creación']);
    expect(originsTab.rows[1]).toEqual([
      'o1',
      'Salesforce Q1',
      'Migración',
      '',
      '2026-06-01T00:00:00.000Z',
    ]);

    const propsTab = tabs[2]!;
    expect(propsTab.rows[0]).toContain('Estado HubSpot');
    expect(propsTab.rows[1]).toContain('divergent');
    expect(propsTab.rows[1]).toContain('Salesforce Q1'); // columna Orígenes

    const mapTab = tabs[3]!;
    expect(mapTab.rows[1]).toEqual([
      'm1',
      'custom_tier',
      'Salesforce Q1',
      'Account_Tier__c',
      JSON.stringify([{ GOLD: 'enterprise' }]),
      '',
    ]);
  });
});
