import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface SectionPlaceholderProps {
  titleKey: string;
}

/** Página de sección vacía. Cada SPEC de característica sustituye su contenido. */
export function SectionPlaceholder({ titleKey }: SectionPlaceholderProps): JSX.Element {
  const { t } = useTranslation('common');
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t(titleKey)}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t('sections.placeholder')}
      </Typography>
    </Box>
  );
}
