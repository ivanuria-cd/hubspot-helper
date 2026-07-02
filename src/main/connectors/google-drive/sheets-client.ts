/**
 * Cliente de Google Sheets API v4 para volcar un libro gestionado con varias hojas.
 * Extiende el conector de Google Drive (SPEC-0004) para soportar Sheets además de Docs;
 * usado por la gestión de propiedades (SPEC-0006). Las APIs se inyectan para poder testear.
 */
import {
  APP_PROP_FEATURE,
  APP_PROP_MANAGED,
  APP_PROP_SCHEMA,
  MIME_SPREADSHEET,
} from './client';
import { buildStyleRequests, type SheetMeta } from './sheets-style';

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

export interface SpreadsheetWriteInput {
  folderId: string;
  name: string;
  featureKey: string;
  schemaVersion: number;
  tabs: SheetTab[];
}

/** Subconjunto de Drive Files API necesario para localizar/crear el libro. */
export interface SheetsDriveApi {
  filesList(args: {
    q: string;
    fields: string;
    spaces?: string;
    supportsAllDrives?: boolean;
    includeItemsFromAllDrives?: boolean;
  }): Promise<{
    files?: Array<{ id: string; name: string }>;
  }>;
  filesCreate(args: {
    requestBody: Record<string, unknown>;
    fields: string;
    supportsAllDrives?: boolean;
  }): Promise<{ id: string }>;
}

/** Subconjunto de Google Sheets API v4. */
export interface SheetsRawApi {
  get(args: { spreadsheetId: string }): Promise<{ sheets?: SheetMeta[] }>;
  batchUpdate(args: {
    spreadsheetId: string;
    requests: Array<Record<string, unknown>>;
  }): Promise<unknown>;
  valuesUpdate(args: {
    spreadsheetId: string;
    range: string;
    values: CellValue[][];
  }): Promise<unknown>;
  valuesClear(args: { spreadsheetId: string; range: string }): Promise<unknown>;
}

function quote(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function createSheetsClient(drive: SheetsDriveApi, sheets: SheetsRawApi) {
  async function findManaged(folderId: string, featureKey: string): Promise<string | null> {
    const result = await drive.filesList({
      q: `'${quote(folderId)}' in parents and mimeType = '${MIME_SPREADSHEET}' and appProperties has { key='${APP_PROP_FEATURE}' and value='${quote(featureKey)}' } and trashed = false`,
      fields: 'files(id,name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    return result.files?.[0]?.id ?? null;
  }

  async function createManaged(input: SpreadsheetWriteInput): Promise<string> {
    const file = await drive.filesCreate({
      requestBody: {
        name: input.name,
        mimeType: MIME_SPREADSHEET,
        parents: [input.folderId],
        appProperties: {
          [APP_PROP_MANAGED]: 'true',
          [APP_PROP_FEATURE]: input.featureKey,
          [APP_PROP_SCHEMA]: String(input.schemaVersion),
        },
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    return file.id;
  }

  /** Asegura que existan exactamente las hojas pedidas, en orden, y elimina el resto. */
  async function syncTabs(spreadsheetId: string, titles: string[]): Promise<void> {
    const current = await sheets.get({ spreadsheetId });
    const existing = current.sheets ?? [];
    const existingTitles = new Set(
      existing.map((sheet) => sheet.properties?.title).filter((t): t is string => Boolean(t)),
    );

    const requests: Array<Record<string, unknown>> = [];
    // Crea hojas que faltan.
    titles.forEach((title, index) => {
      if (!existingTitles.has(title)) {
        requests.push({ addSheet: { properties: { title, index } } });
      }
    });
    // Elimina hojas gestionadas que ya no corresponden (p. ej. la hoja por defecto).
    existing.forEach((sheet) => {
      const title = sheet.properties?.title;
      const sheetId = sheet.properties?.sheetId;
      if (title && !titles.includes(title) && sheetId !== undefined) {
        requests.push({ deleteSheet: { sheetId } });
      }
    });

    if (requests.length > 0) {
      await sheets.batchUpdate({ spreadsheetId, requests });
    }
  }

  async function writeSpreadsheet(
    input: SpreadsheetWriteInput,
  ): Promise<{ spreadsheetId: string }> {
    let spreadsheetId = await findManaged(input.folderId, input.featureKey);
    if (!spreadsheetId) spreadsheetId = await createManaged(input);

    await syncTabs(spreadsheetId, input.tabs.map((tab) => tab.title));

    for (const tab of input.tabs) {
      await sheets.valuesClear({ spreadsheetId, range: `'${quote(tab.title)}'` });
      if (tab.rows.length > 0) {
        await sheets.valuesUpdate({
          spreadsheetId,
          range: `'${quote(tab.title)}'!A1`,
          values: tab.rows,
        });
      }
    }

    // Estilo corporativo + bloqueo de contenido (§19).
    const meta = await sheets.get({ spreadsheetId });
    const styleRequests = buildStyleRequests(meta.sheets ?? [], input.tabs);
    if (styleRequests.length > 0) {
      await sheets.batchUpdate({ spreadsheetId, requests: styleRequests });
    }

    return { spreadsheetId };
  }

  return { writeSpreadsheet };
}

export type SheetsClient = ReturnType<typeof createSheetsClient>;
