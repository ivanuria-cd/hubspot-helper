/**
 * Identidad visual Cloud District compartida por los generadores de documentos de Drive
 * (Sheets y Docs) — SPEC-0012 §4. Fuente única de paleta y tipografía. El acento lima
 * (`accent`) solo se usa como fondo de badge con texto `navy` (SPEC-0000 §4), nunca como
 * color de elemento sobre fondo oscuro.
 */

export const CD = {
  navy: '#14072B',
  dark: '#090017',
  white: '#FFFFFF',
  accent: '#AFFC41',
  altRow: '#F3F3F3',
  secondary: '#C7C2D3',
  tertiary: '#7F7790',
} as const;

export const FONT_PRIMARY = 'Poppins';
export const FONT_ACCENT = 'Libre Baskerville';

export const TYPO = {
  bannerTitle: 16,
  sectionTitle: 11,
  body: 10,
} as const;

export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export function hexToRgb(hex: string): RgbColor {
  const n = parseInt(hex.slice(1), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}
