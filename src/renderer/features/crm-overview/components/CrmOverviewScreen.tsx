import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useShellStore } from '@renderer/app/store/shell-store';
import { LoadingState } from '@shared/components/feedback';
import { useCrmOverview } from '../hooks/useCrmOverview';

const GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
  gap: 2,
};

export function CrmOverviewScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';
  const overview = useCrmOverview(projectId);

  const cards = useMemo(
    () => [
      { key: 'properties', title: t('crm.properties'), data: overview.areas.properties, to: 'properties' },
      { key: 'objects', title: t('crm.objects'), data: overview.areas.objects, to: 'objects' },
      { key: 'forms', title: t('crm.forms'), data: overview.areas.forms, to: 'forms' },
    ],
    [t, overview],
  );

  if (!activeProject) return null;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('crm.title')}
      </Typography>

      {overview.loading ? (
        <Box sx={{ mt: 2 }}>
          <LoadingState variant="cards" rows={3} label={t('crm.loading')} />
        </Box>
      ) : overview.error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('crm.error')}
        </Alert>
      ) : (
        <>
          {!overview.hubspotConnected ? (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => navigate('config/connectors/hubspot')}>
                  {t('crm.configure')}
                </Button>
              }
            >
              {t('crm.notConnected')}
            </Alert>
          ) : null}
          <Box sx={GRID}>
            {cards.map((card) => (
              <Card key={card.key} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" component="h2" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="h4" component="p">
                    {card.data.total}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                    {t('crm.totalItems', { count: card.data.total })}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ minHeight: 20 }}>
                    {card.data.pending > 0
                      ? t('crm.pending', { count: card.data.pending })
                      : t('crm.upToDate')}
                  </Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(card.to)}>
                    {t('crm.open')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
