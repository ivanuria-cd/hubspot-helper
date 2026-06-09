import type { TypographyOptions } from '@mui/material/styles';

const POPPINS = '"Poppins", "Helvetica", "Arial", sans-serif';

/**
 * Tipografía Cloud District: Poppins en light (300) para títulos grandes
 * y semibold (600) para énfasis. Libre Baskerville Italic se reserva para
 * grupos semánticos puntuales y se aplica de forma manual donde corresponda.
 */
export const muiTypography: TypographyOptions = {
  fontFamily: POPPINS,
  h1: { fontFamily: POPPINS, fontWeight: 300, fontSize: '3rem', lineHeight: 1.1 },
  h2: { fontFamily: POPPINS, fontWeight: 300, fontSize: '2.25rem', lineHeight: 1.15 },
  h3: { fontFamily: POPPINS, fontWeight: 300, fontSize: '1.75rem', lineHeight: 1.2 },
  h4: { fontFamily: POPPINS, fontWeight: 600, fontSize: '1.375rem' },
  h5: { fontFamily: POPPINS, fontWeight: 600, fontSize: '1.125rem' },
  h6: { fontFamily: POPPINS, fontWeight: 600, fontSize: '1rem' },
  button: { fontFamily: POPPINS, fontWeight: 600, textTransform: 'none' },
  body1: { fontFamily: POPPINS, fontWeight: 400 },
  body2: { fontFamily: POPPINS, fontWeight: 400 },
};
