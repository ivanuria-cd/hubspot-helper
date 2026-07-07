import { describe, expect, it } from 'vitest';
import type { SheetMeta } from './sheets-style';
import type { PlanningWorkbook } from '../../property-management/planning-model';
import { buildPlanningStyleRequests } from './planning-style';

const workbook: PlanningWorkbook = {
  tabs: [
    {
      title: 'contacts',
      rows: [
        [
          'Custom',
          'Name',
          'Internal name',
          'Type',
          'U',
          'O',
          'G',
          'D',
          'R',
          'Pipedrive Field name',
        ],
        ['No', 'Correo', 'email', 'string (text)', '', '', '', '', '', 'email'],
      ],
    },
    { title: 'Listas', rows: [['contacts|Pipedrive'], ['email']] },
  ],
  hiddenTabs: ['Listas'],
  validations: [
    {
      tab: 'contacts',
      column: 0,
      firstRow: 1,
      lastRow: 1,
      oneOf: ['No', 'Yes (Pending)', 'Yes (Created)'],
    },
    { tab: 'contacts', column: 9, firstRow: 1, lastRow: 1, listRange: 'Listas!$A$2:$A$2' },
  ],
  formulaTabs: [],
};

const sheets: SheetMeta[] = [
  { properties: { sheetId: 1, title: 'contacts' } },
  { properties: { sheetId: 2, title: 'Listas' }, bandedRanges: [{ bandedRangeId: 7 }] },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReq = any;

describe('buildPlanningStyleRequests (SPEC-0016 incremento 5)', () => {
  const reqs = buildPlanningStyleRequests(sheets, workbook) as AnyReq[];

  it('oculta la hoja Listas', () => {
    const hide = reqs.find((r) => r.updateSheetProperties?.properties?.hidden === true);
    expect(hide?.updateSheetProperties?.properties?.sheetId).toBe(2);
  });

  it('NO protege rangos (documento editable)', () => {
    expect(reqs.some((r) => r.addProtectedRange)).toBe(false);
  });

  it('limpia bandas previas (idempotencia)', () => {
    expect(reqs.some((r) => r.deleteBanding?.bandedRangeId === 7)).toBe(true);
  });

  it('Custom como ONE_OF_LIST con sus tres valores', () => {
    const dv = reqs.find(
      (r) =>
        r.setDataValidation?.rule?.condition?.type === 'ONE_OF_LIST' &&
        r.setDataValidation?.range?.startColumnIndex === 0,
    );
    const values = dv?.setDataValidation?.rule?.condition?.values?.map(
      (v: AnyReq) => v.userEnteredValue,
    );
    expect(values).toEqual(['No', 'Yes (Pending)', 'Yes (Created)']);
  });

  it('Field name como ONE_OF_RANGE apuntando a Listas', () => {
    const dv = reqs.find((r) => r.setDataValidation?.rule?.condition?.type === 'ONE_OF_RANGE');
    expect(dv?.setDataValidation?.rule?.condition?.values?.[0]?.userEnteredValue).toBe(
      '=Listas!$A$2:$A$2',
    );
  });

  it('cabecera de marca en la fila 0 del objeto', () => {
    const header = reqs.find(
      (r) =>
        r.repeatCell?.range?.sheetId === 1 &&
        r.repeatCell?.range?.startRowIndex === 0 &&
        r.repeatCell?.cell?.userEnteredFormat?.backgroundColor,
    );
    expect(header).toBeTruthy();
  });
});
