import { describe, it, expect } from 'vitest';
import { buildStyleRequests, CD, type SheetMeta } from './sheets-style';
import type { SheetTab } from './sheets-client';

const tabs: SheetTab[] = [
  { title: '00_Portada', rows: [['RevOps Assistant'], ['schema_version', 2]] },
  { title: '02_Entradas', rows: [['ID', 'Nombre'], ['e1', 'Grado']] },
];

function navy() {
  const n = parseInt(CD.navy.slice(1), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

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

  it('cabecera negrita + navy + borde inferior + congelado', () => {
    const reqs = buildStyleRequests(freshMeta, tabs);
    expect(reqs.find((r) => 'updateSheetProperties' in r)).toBeTruthy();
    expect(
      reqs.find(
        (r) =>
          'repeatCell' in r &&
          (r as { repeatCell: { cell: { userEnteredFormat?: { textFormat?: { bold?: boolean } } } } }).repeatCell.cell
            .userEnteredFormat?.textFormat?.bold === true,
      ),
    ).toBeTruthy();
    const border = reqs.find((r) => 'updateBorders' in r) as { updateBorders: { bottom: { color: unknown } } } | undefined;
    expect(border?.updateBorders.bottom.color).toEqual(navy());
    expect(reqs.find((r) => 'addBanding' in r)).toBeTruthy();
  });

  it('portada con acento lima y sin banding', () => {
    const reqs = buildStyleRequests([{ properties: { sheetId: 0, title: '00_Portada' } }], [tabs[0]]);
    expect(reqs.some((r) => 'addBanding' in r)).toBe(false);
    const lime = parseInt(CD.accent.slice(1), 16);
    const limeColor = { red: ((lime >> 16) & 255) / 255, green: ((lime >> 8) & 255) / 255, blue: (lime & 255) / 255 };
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
