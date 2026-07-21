import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

export interface PendingChangeRow {
  id: string;
  name: string;
  summary: string;
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
}

interface PendingChangesViewProps {
  rows: PendingChangeRow[];
  busy: boolean;
  /** Prefijo de las claves i18n de cada feature, p. ej. 'properties.changes' o 'customObjects.changes'. */
  i18nPrefix: string;
  onApply: (id: string, environment: HubSpotEnvironment) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}

export function PendingChangesView({
  rows,
  busy,
  i18nPrefix,
  onApply,
  onDiscard,
}: PendingChangesViewProps): JSX.Element {
  const { t } = useTranslation('common');

  if (rows.length === 0) {
    return <Typography color="text.primary">{t(`${i18nPrefix}.empty`)}</Typography>;
  }

  return (
    <Stack spacing={2}>
      {rows.map((row, index) => (
        <Paper key={row.id} variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>
            [{String(index + 1).padStart(2, '0')}] {row.name} — {row.summary}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CheckCircleIcon />}
              disabled={busy || row.appliedToSandbox}
              onClick={() => onApply(row.id, 'sandbox')}
            >
              {t(`${i18nPrefix}.applySandbox`)}
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckCircleIcon />}
              disabled={busy || row.appliedToProduction}
              onClick={() => onApply(row.id, 'production')}
            >
              {t(`${i18nPrefix}.applyProduction`)}
            </Button>
            <Button
              size="small"
              color="inherit"
              startIcon={<DeleteIcon />}
              disabled={busy}
              onClick={() => onDiscard(row.id)}
            >
              {t(`${i18nPrefix}.discard`)}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.primary" sx={{ alignSelf: 'center' }}>
              {t(`${i18nPrefix}.state`)}:{' '}
              {row.appliedToSandbox
                ? t(`${i18nPrefix}.sandboxDone`)
                : t(`${i18nPrefix}.sandboxPending`)}{' '}
              ·{' '}
              {row.appliedToProduction
                ? t(`${i18nPrefix}.productionDone`)
                : t(`${i18nPrefix}.productionPending`)}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
