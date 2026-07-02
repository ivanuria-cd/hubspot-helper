import { Box, Skeleton, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

export type LoadingVariant = 'list' | 'table' | 'form' | 'cards' | 'text';

interface LoadingStateProps {
  variant?: LoadingVariant;
  rows?: number;
  label?: string;
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

/**
 * Placeholders de carga estandarizados (SPEC-0002 §17). Marca la región como ocupada
 * (`aria-busy`) y anuncia el estado a lectores de pantalla (`role="status"` + live region).
 */
export function LoadingState({ variant = 'text', rows = 3, label }: LoadingStateProps): JSX.Element {
  const { t } = useTranslation('common');
  const text = label ?? t('common.loading');

  const body = (): JSX.Element => {
    switch (variant) {
      case 'cards':
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Box>
        );
      case 'table':
      case 'list':
        return (
          <Stack spacing={1}>
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={variant === 'table' ? 40 : 56} />
            ))}
          </Stack>
        );
      case 'form':
        return (
          <Stack spacing={2}>
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        );
      default:
        return (
          <Stack spacing={1}>
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} variant="text" />
            ))}
          </Stack>
        );
    }
  };

  return (
    <Box role="status" aria-busy="true" aria-live="polite">
      <Box component="span" sx={visuallyHidden}>{text}</Box>
      {body()}
    </Box>
  );
}
