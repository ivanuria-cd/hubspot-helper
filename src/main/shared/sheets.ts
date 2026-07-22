/**
 * Tipo compartido del modelo de hojas de cálculo (SPEC-0002 §34): un tab con título y filas de
 * celdas. Fuente única para el conector de Drive y los builders de Sheets de cada feature.
 */
export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}
