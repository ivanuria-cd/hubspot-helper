import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface PendingObjectChangesViewProps {
  definitions: CustomObjectDefinition[];
  busy: boolean;
  onApply: (changeId: string, environment: HubSpotEnvironment) => Promise<void>;
  onDiscard: (changeId: string) => Promise<void>;
}

export function PendingObjectChangesView({
  definitions,
  busy,
  onApply,
  onDiscard,
}: PendingObjectChangesViewProps): JSX.Element {
  const { t } = useTranslation('common');
  const changes = definitions.flatMap((def) =>
    (def.pendingChanges ?? []).map((change) => ({ def, change })),
  );

  if (changes.length === 0) {
    return <Typography color="text.primary">{t('customObjects.changes.empty')}</Typography>;
  }

  return (
    <Stack spacing={2}>
      {changes.map(({ def, change }, index) => (
        <Paper key={change.id} variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>
            [{String(index + 1).padStart(2, '0')}] {def.labels.singular} — {change.summary}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              disabled={busy || change.appliedToSandbox}
              onClick={() => onApply(change.id, 'sandbox')}
            >
              {t('customObjects.changes.applySandbox')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={busy || change.appliedToProduction}
              onClick={() => onApply(change.id, 'production')}
            >
              {t('customObjects.changes.applyProduction')}
            </Button>
            <Button size="small" color="inherit" disabled={busy} onClick={() => onDiscard(change.id)}>
              {t('customObjects.changes.discard')}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.primary" sx={{ alignSelf: 'center' }}>
              {t('customObjects.changes.state')}:{' '}
              {change.appliedToSandbox
                ? t('customObjects.changes.sandboxDone')
                : t('customObjects.changes.sandboxPending')}{' '}
              ·{' '}
              {change.appliedToProduction
                ? t('customObjects.changes.productionDone')
                : t('customObjects.changes.productionPending')}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
