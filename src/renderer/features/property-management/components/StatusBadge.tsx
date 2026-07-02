import { Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { HsPropertyStatus } from '@shared/types/properties';
import { StatusBadge as SharedStatusBadge, type StatusTone } from '@shared/components/StatusBadge';

const TONE: Record<HsPropertyStatus, StatusTone> = {
  exists: 'positive',
  divergent: 'warning',
  missing: 'negative',
};

export function StatusBadge({
  status,
  blocked,
}: {
  status: HsPropertyStatus;
  blocked?: boolean;
}): JSX.Element {
  const { t } = useTranslation('common');
  const badge = <SharedStatusBadge tone={TONE[status]} label={t(`properties.status.${status}`)} />;
  if (status === 'missing' && blocked) {
    return (
      <Tooltip title={t('properties.status.missingTooltip')}>
        <span>{badge}</span>
      </Tooltip>
    );
  }
  return badge;
}
