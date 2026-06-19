import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useShellStore } from '@renderer/app/store/shell-store';
import { useDashboardStatus } from '../hooks/useDashboardStatus';

const GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
  gap: 2,
};

export function DashboardScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';
  const status = useDashboardStatus(projectId);

  const connectorCards = useMemo(
    () => [
      {
        key: 'hubspot',
        title: t('dashboard.hubspot'),
        connected: status.hubspot.connected,
        detail: status.hubspot.connected && status.hubspot.activeEnvironment
          ? t('dashboard.envActive', { environment: t('environment.' + status.hubspot.activeEnvironment) })
          : undefined,
        to: 'config/connectors/hubspot',
      },
      {
        key: 'drive',
        title: t('dashboard.drive'),
        connected: status.drive.connected,
        detail: status.drive.connected
          ? t('dashboard.driveFolder', { name: status.drive.folderName })
          : t('dashboard.driveNoFolder'),
        to: 'config/connectors/google-drive',
      },
      {
        key: 'mcp',
        title: t('dashboard.mcp'),
        connected: status.mcp.running,
        connectedLabel: t('dashboard.mcpActive'),
        idleLabel: t('dashboard.mcpInactive'),
        detail: status.mcp.running
          ? t('dashboard.mcpTools', { count: status.mcp.toolCount, port: status.mcp.port })
          : undefined,
        to: 'config/api-mcp',
      },
    ],
    [t, status],
  );

  const pendingCards = useMemo(
    () => [
      { key: 'properties', title: t('dashboard.properties'), count: status.pending.properties, to: 'crm/properties' },
      { key: 'objects', title: t('dashboard.objects'), count: status.pending.objects, to: 'crm/objects' },
      { key: 'forms', title: t('dashboard.forms'), count: status.pending.forms, to: 'crm/forms' },
    ],
    [t, status],
  );

  if (!activeProject) return null;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('dashboard.title')}
      </Typography>

      {status.loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={20} />
          <Typography color="text.primary">{t('dashboard.loading')}</Typography>
        </Stack>
      ) : status.error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('dashboard.error')}
        </Alert>
      ) : !status.anyConnector ? (
        <Card variant="outlined" sx={{ mt: 2, maxWidth: 560 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              {t('dashboard.onboardingTitle')}
            </Typography>
            <Typography color="text.primary" sx={{ mb: 2 }}>
              {t('dashboard.onboardingIntro')}
            </Typography>
            <Stack spacing={1} alignItems="flex-start">
              <Button onClick={() => navigate('config/connectors/hubspot')}>
                {t('dashboard.stepHubspot')}
              </Button>
              <Button onClick={() => navigate('config/connectors/google-drive')}>
                {t('dashboard.stepDrive')}
              </Button>
              <Button onClick={() => navigate('config/api-mcp')}>{t('dashboard.stepMcp')}</Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <>
          <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
            {t('dashboard.connectorsTitle')}
          </Typography>
          <Box sx={GRID}>
            {connectorCards.map((card) => (
              <Card key={card.key} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" component="h3">
                      {card.title}
                    </Typography>
                    <Chip
                      size="small"
                      color={card.connected ? 'success' : 'default'}
                      label={
                        card.connected
                          ? (card.connectedLabel ?? t('dashboard.connected'))
                          : (card.idleLabel ?? t('dashboard.notConfigured'))
                      }
                    />
                  </Stack>
                  <Typography variant="body2" color="text.primary" sx={{ minHeight: 20 }}>
                    {card.detail ?? ''}
                  </Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(card.to)}>
                    {t('dashboard.configure')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Typography variant="h6" component="h2" sx={{ mt: 3, mb: 1 }}>
            {t('dashboard.pendingTitle')}
          </Typography>
          <Box sx={GRID}>
            {pendingCards.map((card) => (
              <Card key={card.key} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" component="h3">
                    {card.title}
                  </Typography>
                  <Typography variant="h3" component="p" sx={{ my: 1 }}>
                    {card.count}
                  </Typography>
                  {card.count > 0 ? (
                    <Button size="small" onClick={() => navigate(card.to)}>
                      {t('dashboard.review')}
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.primary">
                      {t('dashboard.upToDate')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
