import { createTheme, type Theme } from '@mui/material';
import { muiPalette } from './palette';
import { muiTypography } from './typography';
import { muiComponents } from './components';

export const cdTheme: Theme = createTheme({
  palette: muiPalette,
  typography: muiTypography,
  shape: { borderRadius: 8 },
  components: muiComponents,
});

export { cdPalette } from './palette';
