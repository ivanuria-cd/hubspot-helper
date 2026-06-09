import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';

/** Sección de configuración del proyecto. De momento solo expone el idioma. */
export function ConfigSection(): JSX.Element {
  const { t } = useTranslation('common');
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('sidebar.config')}
      </Typography>
      <Stack spacing={2} sx={{ maxWidth: 320, mt: 2 }}>
        <LanguageSwitcher />
      </Stack>
    </Box>
  );
}
