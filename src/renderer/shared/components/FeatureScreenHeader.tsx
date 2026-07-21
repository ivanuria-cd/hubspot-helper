import { Alert, Button, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { BusyButton } from '@shared/components/feedback';
import { syncSummaryVars } from '@shared/utils/sync-summary';

interface FeatureScreenHeaderProps {
  /** Raíz de las claves i18n de la feature, p. ej. 'properties' | 'customObjects' | 'forms'. */
  i18nPrefix: string;
  view: 'list' | 'changes';
  syncing: boolean;
  error: string | null;
  lastSync: object | null;
  onSync: () => void;
  onBack: () => void;
}

export function FeatureScreenHeader({
  i18nPrefix,
  view,
  syncing,
  error,
  lastSync,
  onSync,
  onBack,
}: FeatureScreenHeaderProps): JSX.Element {
  const { t } = useTranslation('common');
  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {view === 'list' ? t(`${i18nPrefix}.title`) : t(`${i18nPrefix}.changes.title`)}
        </Typography>
        {view === 'list' ? (
          <BusyButton variant="outlined" busy={syncing} startIcon={<SyncIcon />} onClick={onSync}>
            {t(`${i18nPrefix}.syncHs`)}
          </BusyButton>
        ) : (
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
            {t(`${i18nPrefix}.changes.back`)}
          </Button>
        )}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {lastSync && view === 'list' ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(`${i18nPrefix}.syncSummary`, syncSummaryVars(lastSync))}
        </Alert>
      ) : null}
    </>
  );
}
