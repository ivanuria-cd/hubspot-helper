import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { HsPropertyStatus } from '@shared/types/properties';

/** Badges de estado con identidad CD: lima solo como fondo con texto deepNavy (#14072B). */
const STYLES: Record<HsPropertyStatus, { bg: string; color: string; symbol: string }> = {
  exists: { bg: '#AFFC41', color: '#14072B', symbol: '●' },
  divergent: { bg: '#C7C2D3', color: '#14072B', symbol: '⚠' },
  missing: { bg: '#14072B', color: '#FFFFFF', symbol: '✕' },
};

export function StatusBadge({ status }: { status: HsPropertyStatus }): JSX.Element {
  const { t } = useTranslation('common');
  const style = STYLES[status];
  return (
    <Chip
      size="small"
      label={`${style.symbol} ${t(`properties.status.${status}`)}`}
      sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600 }}
    />
  );
}
