import type { Components, Theme } from '@mui/material';
import { cdPalette } from './palette';

/** Overrides de componentes MUI para respetar la marca Cloud District sin colores por defecto. */
export const muiComponents: Components<Omit<Theme, 'components'>> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: { backgroundColor: cdPalette.bgLight, color: cdPalette.textOnLight },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: { borderRadius: 8 },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { backgroundImage: 'none' },
    },
  },
  MuiChip: {
    styleOverrides: {
      // Badge lima sobre texto deep navy — único uso permitido del acento.
      colorSecondary: { backgroundColor: cdPalette.accent, color: cdPalette.deepNavy },
    },
  },
};
