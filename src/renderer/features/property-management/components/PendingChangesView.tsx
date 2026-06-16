import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { PropertyEntry } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface PendingChangesViewProps {
  entries: PropertyEntry[];
  busy: boolean;
  onApply: (changeId: string, environment: HubSpotEnvironment) => Promise<void>;
  onDiscard: (changeId: string) => Promise<void>;
}

export function PendingChangesView({
  entries,
  busy,
  onApply,
  onDiscard,
}: PendingChangesViewProps): JSX.Element {
  const { t } = useTranslation('common');
  const changes = entries.flatMap((entry) =>
    (entry.pendingChanges ?? []).map((change) => ({ entry, change })),
  );

  if (changes.length === 0) {
    return <Typography color="text.primary">{t('properties.changes.empty')}</Typography>;
  }

  return (
    <Stack spacing={2}>
      {changes.map(({ entry, change }, index) => (
        <Paper key={change.id} variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>
            [{String(index + 1).padStart(2, '0')}] {entry.name} — {change.summary}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              disabled={busy || change.appliedToSandbox}
              onClick={() => onApply(change.id, 'sandbox')}
            >
              {t('properties.changes.applySandbox')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={busy || change.appliedToProduction}
              onClick={() => onApply(change.id, 'production')}
            >
              {t('properties.changes.applyProduction')}
            </Button>
            <Button size="small" color="inherit" disabled={busy} onClick={() => onDiscard(change.id)}>
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
