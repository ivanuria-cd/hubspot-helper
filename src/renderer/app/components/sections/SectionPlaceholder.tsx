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
<<<<<<< HEAD
      <Typography variant="body1" color="text.primary">
=======
      <Typography variant="body1" color="text.secondary">
>>>>>>> 17940ea55cdc1fa46bc12fdc89972681cd549711
        {t('sections.placeholder')}
      </Typography>
    </Box>
  );
}
