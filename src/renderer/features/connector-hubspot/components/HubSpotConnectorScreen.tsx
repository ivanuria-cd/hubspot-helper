import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { useSnackbar } from '@shared/components/feedback';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { useHubSpotConnector } from '../hooks/useHubSpotConnector';

const ENVIRONMENTS: HubSpotEnvironment[] = ['production', 'sandbox'];

export function HubSpotConnectorScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';
  const { status, loading, saving, saveToken, revoke, selectEnvironment } =
    useHubSpotConnector(projectId);

  const [environment, setEnvironment] = useState<HubSpotEnvironment>('production');
  const [token, setToken] = useState('');

  if (!activeProject) return null;

  const envConfig = status?.environments[environment];
  const isActive = status?.activeEnvironment === environment;

  const handleSave = async (): Promise<void> => {
    const result = await saveToken(environment, token.trim());
    if (result.success) {
      setToken('');
      notify({ message: t('hubspot.saveSuccess', { portal: result.portalName ?? '' }), severity: 'success' });
    } else {
      notify({ message: t('hubspot.saveError', { error: result.error ?? '' }), severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('hubspot.title')}
      </Typography>

      <Tabs
        value={environment}
        onChange={(_event, value: HubSpotEnvironment) => {
          setEnvironment(value);
        }}
        aria-label={t('hubspot.environmentTabs')}
        sx={{ mb: 3 }}
      >
        {ENVIRONMENTS.map((env) => (
          <Tab key={env} value={env} label={t(`environment.${env}`)} />
        ))}
      </Tabs>

      <Stack spacing={3} sx={{ maxWidth: 560 }}>
        <Box>
          <TextField
            type="password"
            fullWidth
            label={t('hubspot.tokenLabel')}
            helperText={t('hubspot.tokenHelp')}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            inputProps={{ 'aria-label': t('hubspot.tokenLabel') }}
          />
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => void handleSave()}
              disabled={saving || token.trim().length === 0}
            >
              {saving ? t('hubspot.saving') : t('hubspot.save')}
            </Button>
            {envConfig ? (
              <Button color="inherit" onClick={() => void revoke(environment)} disabled={saving}>
                {t('hubspot.revoke')}
              </Button>
            ) : null}
          </Stack>
        </Box>


        <Divider />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('hubspot.connectionStatus')}
          </Typography>
          {loading ? (
            <Typography color="text.primary">{t('hubspot.loading')}</Typography>
          ) : envConfig ? (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip color="secondary" size="small" label={t('hubspot.connected')} />
                {isActive ? (
                  <Chip color="primary" size="small" label={t('hubspot.activeBadge')} />
                ) : (
                  <Button size="small" onClick={() => void selectEnvironment(environment)}>
                    {t('hubspot.useAsActive')}
                  </Button>
                )}
              </Stack>
              <Typography color="text.primary">
                {t('hubspot.portal', { name: envConfig.portalName, id: envConfig.portalId })}
              </Typography>
              <Typography color="text.primary">
                {t('hubspot.apiVersion', { version: status?.apiVersion ?? 'v3' })}
              </Typography>
            </Stack>
          ) : (
            <Chip color="default" size="small" label={t('hubspot.notConfigured')} />
          )}
        </Box>
      </Stack>
    </Box>
  );
}
