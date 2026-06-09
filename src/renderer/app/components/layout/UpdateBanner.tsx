import { Alert, Collapse } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';

/** Banner no intrusivo que aparece cuando el updater anuncia una versión nueva. */
export function UpdateBanner(): JSX.Element | null {
  const { t } = useTranslation('common');
  const updateStatus = useShellStore((state) => state.updateStatus);
  const [dismissed, setDismissed] = useState(false);

  const version =
    updateStatus?.state === 'available' || updateStatus?.state === 'downloaded'
      ? updateStatus.version
      : null;

  if (!version) return null;

  const messageKey =
    updateStatus?.state === 'downloaded' ? 'update.downloaded' : 'update.available';

  return (
    <Collapse in={!dismissed}>
      <Alert
        severity="info"
        onClose={() => setDismissed(true)}
        sx={{ borderRadius: 0 }}
        role="status"
      >
        {t(messageKey, { version })}
      </Alert>
    </Collapse>
  );
}
