import { Chip } from '@mui/material';
import { cdPalette } from '@renderer/theme';

export type StatusTone = 'positive' | 'warning' | 'negative' | 'neutral';

const TONE: Record<StatusTone, { bg: string; color: string; symbol: string }> = {
  positive: { bg: cdPalette.accent, color: cdPalette.deepNavy, symbol: '●' },
  warning: { bg: cdPalette.secondary, color: cdPalette.deepNavy, symbol: '⚠' },
  negative: { bg: cdPalette.deepNavy, color: cdPalette.textOnDark, symbol: '✕' },
  neutral: { bg: cdPalette.tertiary, color: cdPalette.textOnDark, symbol: '▢' },
};

export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }): JSX.Element {
  const s = TONE[tone];
  return (
    <Chip
      size="small"
      label={`${s.symbol} ${label}`}
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }}
    />
  );
}
