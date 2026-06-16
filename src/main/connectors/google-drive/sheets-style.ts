/**
 * Estilo corporativo (Cloud District) y bloqueo de contenido del Sheets del mapa de propiedades
 * (SPEC-0006 §19). Genera los `requests` de `spreadsheets.batchUpdate`: formato de cabecera,
 * bandas alternas, fuente Poppins, autoajuste, portada oscura con acento lima y rango protegido por
 * hoja. Es puro y testeable; limpia protecciones/bandas previas para ser idempotente.
 */
import type { SheetTab } from './sheets-client';

export const CD = {
  navy: '#14072B',
  dark: '#090017',
  white: '#FFFFFF',
  accent: '#AFFC41',
  altRow: '#F3F3F3',
} as const;

export const PORTADA_TITLE = '00_Portada';
const FONT = 'Poppins';
const PROTECTION_DESC = 'Gestionado por RevOps Assistant — no editar manualmente';

interface GoogleColor {
  red: number;
  green: number;
  blue: number;
}

export interface SheetMeta {
  properties?: { sheetId?: number; title?: string; gridProperties?: { rowCount?: number; columnCount?: number } };
  protectedRanges?: Array<{ protectedRangeId?: number }>;
  bandedRanges?: Array<{ bandedRangeId?: number }>;
}

type Request = Record<string, unknown>;

function color(hex: string): GoogleColor {
  const n = parseInt(hex.slice(1), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

function protect(sheetId: number): Request {
  return {
    addProtectedRange: {
      protectedRange: { range: { sheetId }, description: PROTECTION_DESC, warningOnly: false },
    },
  };
}

/** Construye los requests de estilo + protección para `batchUpdate`. */
export function buildStyleRequests(sheets: SheetMeta[], tabs: SheetTab[]): Request[] {
  const requests: Request[] = [];

  // Limpieza previa (idempotencia): borra protecciones y bandas existentes.
  for (const sheet of sheets) {
    for (const protectedRange of sheet.protectedRanges ?? []) {
      if (protectedRange.protectedRangeId !== undefined) {
        requests.push({ deleteProtectedRange: { protectedRangeId: protectedRange.protectedRangeId } });
      }
    }
    for (const banded of sheet.bandedRanges ?? []) {
      if (banded.bandedRangeId !== undefined) {
        requests.push({ deleteBanding: { bandedRangeId: banded.bandedRangeId } });
      }
    }
  }

  const sheetIdByTitle = new Map(
    sheets.map((sheet) => [sheet.properties?.title, sheet.properties?.sheetId] as const),
  );

  for (const tab of tabs) {
    const sheetId = sheetIdByTitle.get(tab.title);
    if (sheetId === undefined) continue;
    const columnCount = Math.max(1, ...tab.rows.map((row) => row.length));

    // Fuente Poppins en toda la hoja.
    requests.push({
      repeatCell: {
        range: { sheetId },
        cell: { userEnteredFormat: { textFormat: { fontFamily: FONT } } },
        fields: 'userEnteredFormat.textFormat.fontFamily',
      },
    });

    if (tab.title === PORTADA_TITLE) {
      // Bloque oscuro de marca en el título (A1).
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: color(CD.dark),
              textFormat: { bold: true, fontSize: 14, foregroundColor: color(CD.white), fontFamily: FONT },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
      // Acento lima (único) en el valor de schema_version (B2).
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 2 },
          cell: {
            userEnteredFormat: {
              backgroundColor: color(CD.accent),
              textFormat: { bold: true, foregroundColor: color(CD.navy), fontFamily: FONT },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
      requests.push(protect(sheetId));
      continue;
    }

    // Hoja de datos: cabecera congelada + formato + borde inferior + bandas + autoajuste.
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    });
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: color(CD.altRow),
            textFormat: { bold: true, foregroundColor: color(CD.navy), fontFamily: FONT },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
    requests.push({
      updateBorders: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        bottom: { style: 'SOLID', color: color(CD.navy) },
      },
    });
    requests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: columnCount },
          rowProperties: {
            headerColor: color(CD.altRow),
            firstBandColor: color(CD.white),
            secondBandColor: color(CD.altRow),
          },
        },
      },
    });
    requests.push({
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: columnCount },
      },
    });
    requests.push(protect(sheetId));
  }

  return requests;
}
