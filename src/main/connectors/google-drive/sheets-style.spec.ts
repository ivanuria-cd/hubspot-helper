import { describe, it, expect } from 'vitest';
import { buildStyleRequests, CD, type SheetMeta } from './sheets-style';
import { hexToRgb } from './brand';
import type { SheetTab } from './sheets-client';

const tabs: SheetTab[] = [
  { title: '00_Portada', rows: [['RevOps Assistant'], ['schema_version', 2]] },
  { title: '02_Entradas', rows: [['ID', 'Nombre'], ['e1', 'Grado']] },
];

const navy = () => hexToRgb(CD.navy);

describe('buildStyleRequests', () => {
  const freshMeta: SheetMeta[] = [
    { properties: { sheetId: 0, title: '00_Portada' } },
    { properties: { sheetId: 1, title: '02_Entradas' } },
  ];

  it('protege cada hoja con warningOnly=false', () => {
    const reqs = buildStyleRequests(freshMeta, tabs);
    const protections = reqs.filter((r) => 'addProtectedRange' in r);
    expect(protections).toHaveLength(2);
    protections.forEach((p) => {
      const pr = (p as { addProtectedRange: { protectedRange: { warningOnly: boolean } } }).addProtectedRange;
      expect(pr.protectedRange.warningOnly).toBe(false);
    });
  });

  it('cabecera de marca (fondo dark + texto blanco) + borde + congelado fila/columna', () => {
    const reqs = buildStyleRequests(freshMeta, tabs);
    const props = reqs.find((r) => 'updateSheetProperties' in r) as
      | { updateSheetProperties: { properties: { gridProperties: { frozenRowCount: number; frozenColumnCount: number } } } }
      | undefined;
    expect(props?.updateSheetProperties.properties.gridProperties.frozenRowCount).toBe(1);
    expect(props?.updateSheetProperties.properties.gridProperties.frozenColumnCount).toBe(1);

    const header = reqs.find(
      (r) =>
        'repeatCell' in r &&
        JSON.stringify(
          (r as { repeatCell: { cell: { userEnteredFormat?: { backgroundColor?: unknown } } } }).repeatCell.cell
            .userEnteredFormat?.backgroundColor,
        ) === JSON.stringify(hexToRgb(CD.dark)) &&
        (r as { repeatCell: { cell: { userEnteredFormat?: { textFormat?: { foregroundColor?: unknown } } } } }).repeatCell
          .cell.userEnteredFormat?.textFormat?.foregroundColor !== undefined,
    );
    expect(header).toBeTruthy();

    const border = reqs.find((r) => 'updateBorders' in r) as { updateBorders: { bottom: { color: unknown } } } | undefined;
    expect(border?.updateBorders.bottom.color).toEqual(navy());
    expect(reqs.find((r) => 'addBanding' in r)).toBeTruthy();
  });

  it('oculta las columnas ID y Objeto y congela hasta Nombre', () => {
    const tab: SheetTab = {
      title: '03_contacts_Campos',
      rows: [
        ['ID', 'Objeto', 'Nombre', 'Propiedad HubSpot'],
        ['e1', 'contacts', 'Grado', 'degree'],
      ],
    };
    const reqs = buildStyleRequests([{ properties: { sheetId: 5, title: tab.title } }], [tab]);
    const props = reqs.find((r) => 'updateSheetProperties' in r) as
      | { updateSheetProperties: { properties: { gridProperties: { frozenColumnCount: number } } } }
      | undefined;
    expect(props?.updateSheetProperties.properties.gridProperties.frozenColumnCount).toBe(3);

    const hidden = reqs.filter(
      (r) =>
        'updateDimensionProperties' in r &&
        (r as { updateDimensionProperties: { properties: { hiddenByUser?: boolean } } }).updateDimensionProperties
          .properties.hiddenByUser === true,
    ) as Array<{ updateDimensionProperties: { range: { startIndex: number } } }>;
    expect(hidden.map((h) => h.updateDimensionProperties.range.startIndex).sort()).toEqual([0, 1]);
  });

  it('añade notas por columna en la cabecera de datos', () => {
    const reqs = buildStyleRequests(freshMeta, tabs);
    const cells = reqs.find((r) => 'updateCells' in r) as
      | { updateCells: { fields: string; rows: Array<{ values: Array<{ note: string }> }> } }
      | undefined;
    expect(cells?.updateCells.fields).toBe('note');
    expect(cells?.updateCells.rows[0].values[0].note).toContain('ID');
  });

  it('aplica ajuste de texto y ancho fijo a las hojas de datos', () => {
    const reqs = buildStyleRequests(freshMeta, tabs);
    expect(
      reqs.some(
        (r) =>
          'repeatCell' in r &&
          (r as { repeatCell: { cell: { userEnteredFormat?: { wrapStrategy?: string } } } }).repeatCell.cell
            .userEnteredFormat?.wrapStrategy === 'WRAP',
      ),
    ).toBe(true);
    expect(
      reqs.some(
        (r) =>
          'updateDimensionProperties' in r &&
          (r as { updateDimensionProperties: { range: { dimension: string }; properties: { pixelSize: number } } })
            .updateDimensionProperties.range.dimension === 'COLUMNS',
      ),
    ).toBe(true);
  });

  it('columna Estado: validación (desplegable) + formato condicional por valor', () => {
    const estadoTab: SheetTab = {
      title: '03_contacts_Entradas',
      rows: [
        ['ID', 'Estado'],
        ['e1', 'exists'],
        ['e2', 'missing'],
      ],
    };
    const reqs = buildStyleRequests([{ properties: { sheetId: 2, title: estadoTab.title } }], [estadoTab]);
    const validation = reqs.find((r) => 'setDataValidation' in r) as
      | { setDataValidation: { rule: { condition: { type: string; values: Array<{ userEnteredValue: string }> } } } }
      | undefined;
    expect(validation?.setDataValidation.rule.condition.type).toBe('ONE_OF_LIST');
    expect(validation?.setDataValidation.rule.condition.values.map((v) => v.userEnteredValue)).toEqual(['exists', 'missing']);
    const conditional = reqs.filter((r) => 'addConditionalFormatRule' in r);
    expect(conditional.length).toBe(2);
  });

  it('portada: banner a ancho completo (merge), acento lima y sin banding', () => {
    const reqs = buildStyleRequests([{ properties: { sheetId: 0, title: '00_Portada' } }], [tabs[0]]);
    expect(reqs.some((r) => 'addBanding' in r)).toBe(false);
    expect(reqs.some((r) => 'mergeCells' in r)).toBe(true);
    const limeColor = hexToRgb(CD.accent);
    const hasLime = reqs.some(
      (r) =>
        'repeatCell' in r &&
        JSON.stringify(
          (r as { repeatCell: { cell: { userEnteredFormat?: { backgroundColor?: unknown } } } }).repeatCell.cell
            .userEnteredFormat?.backgroundColor,
        ) === JSON.stringify(limeColor),
    );
    expect(hasLime).toBe(true);
  });

  it('idempotente: borra protecciones y bandas previas', () => {
    const meta: SheetMeta[] = [
      { properties: { sheetId: 1, title: '02_Entradas' }, protectedRanges: [{ protectedRangeId: 99 }], bandedRanges: [{ bandedRangeId: 77 }] },
    ];
    const reqs = buildStyleRequests(meta, [tabs[1]]);
    expect(reqs).toContainEqual({ deleteProtectedRange: { protectedRangeId: 99 } });
    expect(reqs).toContainEqual({ deleteBanding: { bandedRangeId: 77 } });
  });
});
