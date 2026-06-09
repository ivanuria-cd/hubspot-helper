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
  tableAlt: '#F3F3F3',
} as const;

/** Mapeo de los tokens CD a los slots semánticos de MUI. */
export const muiPalette: PaletteOptions = {
  mode: 'light',
  primary: { main: cdPalette.deepNavy, contrastText: cdPalette.textOnDark },
  secondary: { main: cdPalette.accent, contrastText: cdPalette.deepNavy },
  background: { default: cdPalette.bgLight, paper: cdPalette.tableAlt },
  text: { primary: cdPalette.textOnLight, secondary: cdPalette.tertiary },
};
