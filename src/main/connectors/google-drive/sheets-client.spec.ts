import { describe, it, expect, vi } from 'vitest';
import { createSheetsClient, type SheetsDriveApi, type SheetsRawApi } from './sheets-client';

function makeApis(opts: { existingFileId?: string | null; existingTitles?: string[] }) {
  const driveCreate = vi.fn(() => Promise.resolve({ id: 'new-sheet' }));
  const drive: SheetsDriveApi = {
    filesList: vi.fn(() =>
      Promise.resolve({
        files: opts.existingFileId ? [{ id: opts.existingFileId, name: 'Mapa' }] : [],
      }),
    ),
    filesCreate: driveCreate,
  };
  const batchUpdate = vi.fn(
    (_args: { spreadsheetId: string; requests: Array<Record<string, unknown>> }) =>
      Promise.resolve({}),
  );
  const valuesBatchUpdate = vi.fn(
    (_args: { spreadsheetId: string; data: Array<{ range: string; values: unknown[][] }> }) =>
      Promise.resolve({}),
  );
  const valuesBatchClear = vi.fn((_args: { spreadsheetId: string; ranges: string[] }) =>
    Promise.resolve({}),
  );
  const valuesBatchGet = vi.fn((_args: { spreadsheetId: string; ranges: string[] }) =>
    Promise.resolve({ valueRanges: [] }),
  );
  const sheets: SheetsRawApi = {
    get: vi.fn(() =>
      Promise.resolve({
        sheets: (opts.existingTitles ?? ['Sheet1']).map((title, index) => ({
          properties: { sheetId: index, title },
        })),
      }),
    ),
    batchUpdate,
    valuesBatchClear,
    valuesBatchUpdate,
    valuesBatchGet,
  };
  return {
    drive,
    sheets,
    driveCreate,
    batchUpdate,
    valuesBatchUpdate,
    valuesBatchClear,
    valuesBatchGet,
  };
}

const tabs = [
  { title: '00_Portada', rows: [['x']] },
  { title: '01_Origenes', rows: [['ID']] },
];

describe('createSheetsClient', () => {
  it('crea el libro si no existe y escribe cada hoja', async () => {
    const apis = makeApis({ existingFileId: null });
    const client = createSheetsClient(apis.drive, apis.sheets);

    const result = await client.writeSpreadsheet({
      folderId: 'f1',
      name: 'Mapa',
      featureKey: 'property-management',
      schemaVersion: 1,
      tabs,
    });

    expect(result.spreadsheetId).toBe('new-sheet');
    expect(apis.driveCreate).toHaveBeenCalledTimes(1);
    // SPEC-0004 §26: una sola llamada batch con las 2 hojas (antes 2 valuesUpdate).
    expect(apis.valuesBatchClear).toHaveBeenCalledTimes(1);
    expect(apis.valuesBatchUpdate).toHaveBeenCalledTimes(1);
    const call = apis.valuesBatchUpdate.mock.calls[0]?.[0];
    expect(call?.data.map((d) => d.range)).toEqual(["'00_Portada'!A1", "'01_Origenes'!A1"]);
  });

  it('§22: findManaged y createManaged pasan supportsAllDrives (unidades compartidas)', async () => {
    const apis = makeApis({ existingFileId: null });
    const client = createSheetsClient(apis.drive, apis.sheets);
    await client.writeSpreadsheet({
      folderId: 'f1',
      name: 'Mapa',
      featureKey: 'property-management',
      schemaVersion: 1,
      tabs,
    });
    expect(apis.drive.filesList).toHaveBeenCalledWith(
      expect.objectContaining({ supportsAllDrives: true, includeItemsFromAllDrives: true }),
    );
    expect(apis.driveCreate).toHaveBeenCalledWith(
      expect.objectContaining({ supportsAllDrives: true }),
    );
  });

  it('reutiliza el libro existente, añade hojas que faltan y borra la hoja por defecto', async () => {
    const apis = makeApis({ existingFileId: 'existing', existingTitles: ['Sheet1'] });
    const client = createSheetsClient(apis.drive, apis.sheets);

    await client.writeSpreadsheet({
      folderId: 'f1',
      name: 'Mapa',
      featureKey: 'property-management',
      schemaVersion: 1,
      tabs,
    });

    expect(apis.driveCreate).not.toHaveBeenCalled();
    const requests = apis.batchUpdate.mock.calls[0]?.[0]?.requests as Array<
      Record<string, unknown>
    >;
    // Añade las 2 hojas pedidas y elimina la hoja por defecto 'Sheet1'.
    expect(requests.filter((r) => 'addSheet' in r)).toHaveLength(2);
    expect(requests.filter((r) => 'deleteSheet' in r)).toHaveLength(1);
  });
});
