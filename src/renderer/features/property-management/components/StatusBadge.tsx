import { useTranslation } from 'react-i18next';
import type { HsPropertyStatus } from '@shared/types/properties';
import { StatusBadge as SharedStatusBadge, type StatusTone } from '@shared/components/StatusBadge';

const TONE: Record<HsPropertyStatus, StatusTone> = {
  exists: 'positive',
  divergent: 'warning',
  missing: 'negative',
};

export function StatusBadge({ status }: { status: HsPropertyStatus }): JSX.Element {
  const { t } = useTranslation('common');
  return <SharedStatusBadge tone={TONE[status]} label={t(`properties.status.${status}`)} />;
}
