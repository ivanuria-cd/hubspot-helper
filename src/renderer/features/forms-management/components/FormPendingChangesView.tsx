import { Box, Button, Chip, List, ListItem, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { FormChange } from '@shared/types/forms';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

export interface FormPendingChangesViewProps {
  changes: FormChange[];
  busy: boolean;
  onApply: (changeId: string, environment: HubSpotEnvironment) => void;
  onDiscard: (changeId: string) => void;
}

export function FormPendingChangesView({
  changes,
  busy,
  onApply,
  onDiscard,
}: FormPendingChangesViewProps): JSX.Element {
  const { t } = useTranslation('common');

  if (changes.length === 0) {
    return <Typography color="text.primary">{t('forms.changes.empty')}</Typography>;
  }

  return (
    <List disablePadding>
      {changes.map((change) => (
        <ListItem
          key={change.id}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'block', py: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>{change.summary}</Typography>
            <Chip size="small" variant="outlined" label={change.operation} />
            <Chip
              size="small"
              color={change.appliedToSandbox ? 'primary' : 'default'}
              variant={change.appliedToSandbox ? 'filled' : 'outlined'}
              label={change.appliedToSandbox ? t('forms.changes.sandboxDone') : t('forms.changes.sandboxPending')}
            />
            <Chip
              size="small"
              color={change.appliedToProduction ? 'primary' : 'default'}
              variant={change.appliedToProduction ? 'filled' : 'outlined'}
              label={
                change.appliedToProduction
                  ? t('forms.changes.productionDone')
                  : t('forms.changes.productionPending')
              }
            />
          </Stack>
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                disabled={busy || change.appliedToSandbox}
                onClick={() => onApply(change.id, 'sandbox')}
              >
                {t('forms.changes.applySandbox')}
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={busy || change.appliedToProduction}
                onClick={() => onApply(change.id, 'production')}
              >
                {t('forms.changes.applyProduction')}
              </Button>
              <Button size="small" color="error" disabled={busy} onClick={() => onDiscard(change.id)}>
                {t('forms.changes.discard')}
              </Button>
            </Stack>
          </Box>
        </ListItem>
      ))}
    </List>
  );
}
