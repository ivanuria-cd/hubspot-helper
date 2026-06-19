import { useTranslation } from 'react-i18next';
import type { CustomObjectStatus } from '@shared/types/custom-objects';
import { StatusBadge as SharedStatusBadge, type StatusTone } from '@shared/components/StatusBadge';

const TONE: Record<CustomObjectStatus, StatusTone> = {
  created: 'positive',
  divergent: 'warning',
  draft: 'negative',
  archived: 'neutral',
};

export function ObjectStatusBadge({ status }: { status: CustomObjectStatus }): JSX.Element {
  const { t } = useTranslation('common');
  return <SharedStatusBadge tone={TONE[status]} label={t(`customObjects.status.${status}`)} />;
}
