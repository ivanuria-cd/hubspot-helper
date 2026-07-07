/**
 * Estilo del mapa de campos editable (SPEC-0016 incr. 5). Marca Cloud District en cabeceras +
 * desplegables (Custom/Origin como ONE_OF_LIST, Field name/Type como ONE_OF_RANGE/lista) + hoja
 * Listas oculta. A diferencia del export (sheets-style.ts) NO protege rangos: el documento es
 * editable por el cliente. Puro, idempotente (limpia bandas previas) y testeable. ASCII intencionado.
 */
import { CD, FONT_PRIMARY, hexToRgb, type RgbColor } from './brand';
import type { SheetMeta } from './sheets-style';
import type {
  PlanningValidation,
  PlanningWorkbook,
} from '../../property-management/planning-model';

type Request = Record<string, unknown>;

function color(hex: string): RgbColor {
  return hexToRgb(hex);
}

function validationRequest(sheetId: number, v: PlanningValidation): Request | null {
  const range = {
    sheetId,
    startRowIndex: v.firstRow,
    endRowIndex: v.lastRow + 1,
    startColumnIndex: v.column,
    endColumnIndex: v.column + 1,
  };
  if (v.oneOf && v.oneOf.length > 0) {
    return {
      setDataValidation: {
        range,
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: v.oneOf.map((value) => ({ userEnteredValue: value })),
          },
          showCustomUi: true,
          strict: false,
        },
      },
    };
  }
  if (v.listRange) {
    return {
      setDataValidation: {
        range,
        rule: {
          condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: `=${v.listRange}` }] },
          showCustomUi: true,
          strict: false,
        },
      },
    };
  }
  return null;
}

/** Requests de `batchUpdate` para el mapa editable: marca, desplegables, Listas oculta; sin proteccion. */
export function buildPlanningStyleRequests(
  sheets: SheetMeta[],
  workbook: PlanningWorkbook,
): Request[] {
  const requests: Request[] = [];

  // Idempotencia: limpia bandas (y protecciones heredadas de una version anterior del documento).
  for (const sheet of sheets) {
    for (const banded of sheet.bandedRanges ?? []) {
      if (banded.bandedRangeId !== undefined) {
        requests.push({ deleteBanding: { bandedRangeId: banded.bandedRangeId } });
      }
    }
    for (const protectedRange of sheet.protectedRanges ?? []) {
      if (protectedRange.protectedRangeId !== undefined) {
        requests.push({
          deleteProtectedRange: { protectedRangeId: protectedRange.protectedRangeId },
        });
      }
    }
  }

  const sheetIdByTitle = new Map(
    sheets.map((sheet) => [sheet.properties?.title, sheet.properties?.sheetId] as const),
  );
  const hidden = new Set(workbook.hiddenTabs);

  for (const tab of workbook.tabs) {
    const sheetId = sheetIdByTitle.get(tab.title);
    if (sheetId === undefined) continue;
    const columnCount = Math.max(1, ...tab.rows.map((row) => row.length));

    requests.push({
      repeatCell: {
        range: { sheetId },
        cell: { userEnteredFormat: { textFormat: { fontFamily: FONT_PRIMARY } } },
        fields: 'userEnteredFormat.textFormat.fontFamily',
      },
    });

    if (hidden.has(tab.title)) {
      requests.push({
        updateSheetProperties: { properties: { sheetId, hidden: true }, fields: 'hidden' },
      });
      continue;
    }

    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1, frozenColumnCount: columnCount > 1 ? 1 : 0 },
        },
        fields: 'gridProperties(frozenRowCount,frozenColumnCount)',
      },
    });
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: color(CD.dark),
            textFormat: { bold: true, foregroundColor: color(CD.white), fontFamily: FONT_PRIMARY },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
    requests.push({
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
        bottom: { style: 'SOLID', color: color(CD.navy) },
      },
    });
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
    if (tab.rows.length > 1) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: tab.rows.length,
            startColumnIndex: 0,
            endColumnIndex: columnCount,
          },
          cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
          fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)',
        },
      });
    }
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: columnCount },
        properties: { pixelSize: 200 },
        fields: 'pixelSize',
      },
    });
    // Sin addProtectedRange: el mapa de planificacion es editable (SPEC-0016 D1).
  }

  // Desplegables (Custom/Origin literales, Field name/Type por rango o lista).
  for (const v of workbook.validations) {
    const sheetId = sheetIdByTitle.get(v.tab);
    if (sheetId === undefined) continue;
    const request = validationRequest(sheetId, v);
    if (request) requests.push(request);
  }

  return requests;
}
