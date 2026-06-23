/**
 * Estilo corporativo (Cloud District) y bloqueo de contenido de los Sheets gestionados
 * (SPEC-0006 §19 + SPEC-0012). Genera los `requests` de `spreadsheets.batchUpdate`: banner de
 * portada a ancho completo, cabeceras con identidad de marca, congelado de fila/columna, notas por
 * columna, ajuste de texto, validación y formato condicional de la columna «Estado», anchos fijos y
 * rango protegido por hoja. Es puro y testeable; limpia protecciones/bandas previas para ser
 * idempotente.
 */
import type { SheetTab, CellValue } from './sheets-client';
import { CD as BRAND, FONT_PRIMARY, TYPO, hexToRgb, type RgbColor } from './brand';

export const CD = BRAND;

export const PORTADA_TITLE = '00_Portada';
const FONT = FONT_PRIMARY;
const PROTECTION_DESC = 'Gestionado por RevOps Assistant — no editar manualmente';
const STATUS_HEADER = 'Estado';
const FREEZE_HEADER = 'Nombre';
const HIDDEN_HEADERS = new Set(['ID', 'Objeto']);
const STATUS_COLORS: Record<string, string> = {
  exists: '#EDF7ED',
  divergent: '#FFF4E5',
  missing: '#FDECEA',
};

export interface SheetMeta {
  properties?: { sheetId?: number; title?: string; gridProperties?: { rowCount?: number; columnCount?: number } };
  protectedRanges?: Array<{ protectedRangeId?: number }>;
  bandedRanges?: Array<{ bandedRangeId?: number }>;
}

type Request = Record<string, unknown>;

function color(hex: string): RgbColor {
  return hexToRgb(hex);
}

function protect(sheetId: number): Request {
  return {
    addProtectedRange: {
      protectedRange: { range: { sheetId }, description: PROTECTION_DESC, warningOnly: false },
    },
  };
}

function distinct(values: CellValue[]): string[] {
  return [...new Set(values.map((value) => String(value)).filter((value) => value.length > 0))];
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
      // Banner de marca a ancho completo en la fila 1.
      if (columnCount > 1) {
        requests.push({
          mergeCells: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
            mergeType: 'MERGE_ROWS',
          },
        });
      }
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 40 },
          fields: 'pixelSize',
        },
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
          cell: {
            userEnteredFormat: {
              backgroundColor: color(CD.dark),
              verticalAlignment: 'MIDDLE',
              textFormat: { bold: true, fontSize: TYPO.bannerTitle, foregroundColor: color(CD.white), fontFamily: FONT },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,verticalAlignment,textFormat)',
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

    // Hoja de datos: congelado fila+columna, cabecera de marca, notas, bandas, wrap, anchos y protección.
    const header = tab.rows[0] ?? [];
    // Solo en las hojas «Campos»: congela hasta «Nombre» inclusive y oculta ID/Objeto (SPEC-0012 §3.1).
    const isCampos = tab.title.endsWith('_Campos');
    const freezeAt = header.findIndex((cell) => String(cell) === FREEZE_HEADER);
    const frozenColumnCount = isCampos && freezeAt !== -1 ? freezeAt + 1 : columnCount > 1 ? 1 : 0;
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount } },
        fields: 'gridProperties(frozenRowCount,frozenColumnCount)',
      },
    });
    // Oculta columnas técnicas (ID, Objeto) sin borrar sus datos, solo en «Campos» (SPEC-0012 §3.1).
    if (isCampos) {
      header.forEach((cell, index) => {
        if (HIDDEN_HEADERS.has(String(cell))) {
          requests.push({
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: index, endIndex: index + 1 },
              properties: { hiddenByUser: true },
              fields: 'hiddenByUser',
            },
          });
        }
      });
    }
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: color(CD.dark),
            textFormat: { bold: true, foregroundColor: color(CD.white), fontFamily: FONT },
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

    // Notas por celda de cabecera (qué es la columna; gestionada por la app).
    if (header.length > 0) {
      requests.push({
        updateCells: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: header.length },
          rows: [
            {
              values: header.map((cell) => ({
                note: `${String(cell)} — gestionado por la app; no editar manualmente.`,
              })),
            },
          ],
          fields: 'note',
        },
      });
    }

    requests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: columnCount },
          rowProperties: {
            headerColor: color(CD.dark),
            firstBandColor: color(CD.white),
            secondBandColor: color(CD.altRow),
          },
        },
      },
    });

    const rowCount = tab.rows.length;
    if (rowCount > 1) {
      // Ajuste de texto en el cuerpo de datos.
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: columnCount },
          cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
          fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)',
        },
      });

      // Columna «Estado»: validación (desplegable) + formato condicional por valor.
      const statusCol = header.findIndex((cell) => String(cell) === STATUS_HEADER);
      if (statusCol !== -1) {
        const values = distinct(tab.rows.slice(1).map((row) => row[statusCol] ?? ''));
        if (values.length > 0) {
          requests.push({
            setDataValidation: {
              range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: statusCol, endColumnIndex: statusCol + 1 },
              rule: {
                condition: { type: 'ONE_OF_LIST', values: values.map((value) => ({ userEnteredValue: value })) },
                showCustomUi: true,
                strict: false,
              },
            },
          });
        }
        for (const [value, hex] of Object.entries(STATUS_COLORS)) {
          if (!values.includes(value)) continue;
          requests.push({
            addConditionalFormatRule: {
              rule: {
                ranges: [
                  { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: statusCol, endColumnIndex: statusCol + 1 },
                ],
                booleanRule: {
                  condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: value }] },
                  format: { backgroundColor: color(hex), textFormat: { foregroundColor: color(CD.navy) } },
                },
              },
              index: 0,
            },
          });
        }
      }
    }

    // Anchos fijos por columna (con wrap) en lugar de autoajuste indiscriminado.
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: columnCount },
        properties: { pixelSize: 200 },
        fields: 'pixelSize',
      },
    });
    requests.push(protect(sheetId));
  }

  return requests;
}
