import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Sección de configuración del proyecto. El idioma se gestiona ahora desde el
 * selector global del header; esta sección queda como placeholder hasta su SPEC.
 */
export function ConfigSection(): JSX.Element {
  const { t } = useTranslation('common');
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('sidebar.config')}
      </Typography>
      <Typography variant="body1" color="text.primary">
        {t('sections.placeholder')}
      </Typography>
    </Box>
  );
}
