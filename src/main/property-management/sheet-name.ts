/**
 * Tipos y utilidades comunes de nombres de hoja, compartidos por el builder del Sheets de propiedades
 * (sheets-model), el del mapa editable (planning-model) y el import (planning-import). Fuente unica
 * (SPEC-0006 §53.8). ASCII intencionado (evita el truncado del espejo del sandbox).
 */
export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

export const SHEET_NAME_MAX = 100;
export const INVALID_SHEET_CHARS = /[:\\/?*[\]]/g;

/** Sanea un texto para usarlo como parte del titulo de una hoja (Google Sheets prohibe `: \ / ? * [ ]`). */
export function sanitizeSheetPart(raw: string): string {
  const cleaned = raw.replace(INVALID_SHEET_CHARS, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'objeto';
}
