import { useState } from 'react';
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { GoogleCredentialsStatus, GoogleCredentialSource } from '@shared/types/gdrive';
import { useSnackbar } from '@shared/components/feedback';

interface Props {
  credentials: GoogleCredentialsStatus | null;
  working: boolean;
  onSave: (input: { clientId?: string; clientSecret?: string }) => Promise<{ success: boolean; error?: string }>;
  onClear: () => Promise<void>;
}

function SourceChip({ source }: { source: GoogleCredentialSource }): JSX.Element | null {
  const { t } = useTranslation('common');
  if (source === 'none') return null;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={source === 'app' ? 'secondary' : 'default'}
      label={t(`gdrive.credentials.source.${source}`)}
    />
  );
}

export function GoogleCredentialsCard({ credentials, working, onSave, onClear }: Props): JSX.Element {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const handleSave = async (): Promise<void> => {
    const input: { clientId?: string; clientSecret?: string } = {};
    if (clientId.trim()) input.clientId = clientId.trim();
    if (clientSecret.trim()) input.clientSecret = clientSecret.trim();
    if (!input.clientId && !input.clientSecret) return;
    const result = await onSave(input);
    if (result.success) {
      setClientId('');
      setClientSecret('');
      notify({ message: t('gdrive.credentials.saved'), severity: 'success' });
    } else {
      notify({ message: result.error ?? t('gdrive.credentials.error'), severity: 'error' });
    }
  };

  const handleClear = async (): Promise<void> => {
    await onClear();
    setClientId('');
    setClientSecret('');
    notify({ message: t('gdrive.credentials.cleared'), severity: 'success' });
  };

  const idPlaceholder = credentials?.clientId.set
    ? t('gdrive.credentials.alreadySet', { preview: credentials.clientId.preview })
    : t('gdrive.credentials.clientIdPlaceholder');
  const secretPlaceholder = credentials?.clientSecret.set
    ? t('gdrive.credentials.alreadySetSecret')
    : t('gdrive.credentials.clientSecretPlaceholder');

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {t('gdrive.credentials.title')}
      </Typography>
      <Stack spacing={2}>
        <TextField
          size="small"
          label={t('gdrive.credentials.clientId')}
          placeholder={idPlaceholder}
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          InputProps={{ endAdornment: <SourceChip source={credentials?.clientId.source ?? 'none'} /> }}
          fullWidth
        />
        <TextField
          size="small"
          type="password"
          label={t('gdrive.credentials.clientSecret')}
          placeholder={secretPlaceholder}
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
          InputProps={{ endAdornment: <SourceChip source={credentials?.clientSecret.source ?? 'none'} /> }}
          helperText={t('gdrive.credentials.help')}
          fullWidth
        />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button color="inherit" onClick={() => void handleClear()} disabled={working}>
            {t('gdrive.credentials.clear')}
          </Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={working}>
            {t('gdrive.credentials.save')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
