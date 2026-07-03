import type { PaletteOptions } from '@mui/material';

/** Tokens de color de la guía de marca Cloud District. */
export const cdPalette = {
  bgDark: '#090017',
  bgLight: '#FFFFFF',
  deepNavy: '#14072B',
  textOnDark: '#FFFFFF',
  textOnLight: '#14072B',
  accent: '#AFFC41',
  secondary: '#C7C2D3',
  tertiary: '#7F7790',
  /**
   * Variante AA del tertiary para TEXTO sobre blanco (informe e2e 2026-07-03): #7F7790 da
   * 4.24:1 (< 4.5:1 WCAG AA); #736B84 da 5.04:1 manteniendo la familia cromática. El tertiary
   * original sigue disponible para usos no textuales (bordes, iconos decorativos, Sheets).
   */
  tertiaryText: '#736B84',
  tableAlt: '#F3F3F3',
} as const;

/** Mapeo de los tokens CD a los slots semánticos de MUI. */
export const muiPalette: PaletteOptions = {
  mode: 'light',
  primary: { main: cdPalette.deepNavy, contrastText: cdPalette.textOnDark },
  secondary: { main: cdPalette.accent, contrastText: cdPalette.deepNavy },
  background: { default: cdPalette.bgLight, paper: cdPalette.tableAlt },
  text: { primary: cdPalette.textOnLight, secondary: cdPalette.tertiaryText },
};
