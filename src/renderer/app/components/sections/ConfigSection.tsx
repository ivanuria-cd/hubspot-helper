<<<<<<< HEAD
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Sección de configuración del proyecto. El idioma se gestiona ahora desde el
 * selector global del header; esta sección queda como placeholder hasta su SPEC.
 */
=======
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';

/** Sección de configuración del proyecto. De momento solo expone el idioma. */
>>>>>>> 17940ea55cdc1fa46bc12fdc89972681cd549711
export function ConfigSection(): JSX.Element {
  const { t } = useTranslation('common');
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('sidebar.config')}
      </Typography>
<<<<<<< HEAD
      <Typography variant="body1" color="text.primary">
        {t('sections.placeholder')}
      </Typography>
=======
      <Stack spacing={2} sx={{ maxWidth: 320, mt: 2 }}>
        <LanguageSwitcher />
      </Stack>
>>>>>>> 17940ea55cdc1fa46bc12fdc89972681cd549711
    </Box>
  );
}
