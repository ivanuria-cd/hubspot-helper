import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CustomObjectStatus } from '@shared/types/custom-objects';

/** Badges de estado con identidad CD: lima solo como fondo con texto deepNavy (#14072B). */
const STYLES: Record<CustomObjectStatus, { bg: string; color: string; symbol: string }> = {
  created: { bg: '#AFFC41', color: '#14072B', symbol: '●' },
  divergent: { bg: '#C7C2D3', color: '#14072B', symbol: '⚠' },
  draft: { bg: '#14072B', color: '#FFFFFF', symbol: '✕' },
  archived: { bg: '#7F7790', color: '#FFFFFF', symbol: '▢' },
};

export function ObjectStatusBadge({ status }: { status: CustomObjectStatus }): JSX.Element {
  const { t } = useTranslation('common');
  const style = STYLES[status];
  return (
    <Chip
      size="small"
      label={`${style.symbol} ${t(`customObjects.status.${status}`)}`}
      sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600 }}
    />
  );
}
