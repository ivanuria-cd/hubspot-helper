import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { HubSpotProperty } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface PendingChange {
  property: HubSpotProperty;
  changeId: string;
  summary: string;
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
}

interface PendingChangesViewProps {
  properties: HubSpotProperty[];
  busy: boolean;
  onApply: (changeId: string, environment: HubSpotEnvironment) => Promise<void>;
  onDiscard: (changeId: string) => Promise<void>;
}

export function PendingChangesView({
  properties,
  busy,
  onApply,
  onDiscard,
}: PendingChangesViewProps): JSX.Element {
  const { t } = useTranslation('common');
  const changes: PendingChange[] = properties.flatMap((property) =>
    (property.pendingChanges ?? []).map((change) => ({
      property,
      changeId: change.id,
      summary: change.summary,
      appliedToSandbox: change.appliedToSandbox,
      appliedToProduction: change.appliedToProduction,
    })),
  );

  if (changes.length === 0) {
    return <Typography color="text.primary">{t('properties.changes.empty')}</Typography>;
  }

  return (
    <Stack spacing={2}>
      {changes.map((change, index) => (
        <Paper key={change.changeId} variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>
            [{String(index + 1).padStart(2, '0')}] {change.property.hubspotName} — {change.summary}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              disabled={busy || change.appliedToSandbox}
              onClick={() => onApply(change.changeId, 'sandbox')}
            >
              {t('properties.changes.applySandbox')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={busy || change.appliedToProduction}
              onClick={() => onApply(change.changeId, 'production')}
            >
              {t('properties.changes.applyProduction')}
            </Button>
            <Button size="small" color="inherit" disabled={busy} onClick={() => onDiscard(change.changeId)}>
              {t('properties.changes.discard')}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.primary" sx={{ alignSelf: 'center' }}>
              {t('properties.changes.state')}:{' '}
              {change.appliedToSandbox
                ? t('properties.changes.sandboxDone')
                : t('properties.changes.sandboxPending')}{' '}
              ·{' '}
              {change.appliedToProduction
                ? t('properties.changes.productionDone')
                : t('properties.changes.productionPending')}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
