import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { driveFileUrl } from '@shared/utils/driveFileUrl';
import FolderIcon from '@mui/icons-material/Folder';
import { useTranslation } from 'react-i18next';
import { useShellStore } from '@renderer/app/store/shell-store';
import { BusyButton, LoadingState, useSnackbar } from '@shared/components/feedback';
import { useGoogleDriveConnector } from '../hooks/useGoogleDriveConnector';
import { GoogleCredentialsCard } from './GoogleCredentialsCard';
import { FolderPickerDialog } from './FolderPickerDialog';

export function GoogleDriveConnectorScreen(): JSX.Element | null {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const activeProject = useShellStore((state) => state.activeProject);
  const projectId = activeProject?.id ?? '';
  const {
    status,
    authStatus,
    credentials,
    loading,
    working,
    lastSync,
    connect,
    listFolders,
    searchFolders,
    setFolder,
    saveCredentials,
    clearCredentials,
    sync,
    disconnect,
  } = useGoogleDriveConnector(projectId);

  const handleSync = async (): Promise<void> => {
    try {
      await sync();
      notify({ message: t('gdrive.syncDone'), severity: 'success' });
    } catch (error) {
      notify({ message: t('gdrive.authError', { error: error instanceof Error ? error.message : '' }), severity: 'error' });
    }
  };
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!activeProject) return null;

  const connected = authStatus.state === 'connected' || Boolean(status?.accountEmail);
  const email = status?.accountEmail ?? (authStatus.state === 'connected' ? authStatus.email : '');

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('gdrive.title')}
      </Typography>

      <Stack spacing={3} sx={{ maxWidth: 600 }}>
        <GoogleCredentialsCard
          credentials={credentials}
          working={working}
          onSave={saveCredentials}
          onClear={clearCredentials}
        />

        <Divider />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('gdrive.account')}
          </Typography>
          {loading ? (
            <LoadingState variant="text" rows={2} label={t('gdrive.loading')} />
          ) : connected ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip color="secondary" size="small" label={t('gdrive.connected')} />
              <Typography color="text.primary">{t('gdrive.connectedAs', { email })}</Typography>
              <Button color="inherit" onClick={() => void disconnect()} disabled={working}>
                {t('gdrive.disconnect')}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              onClick={() => void connect()}
              disabled={working || authStatus.state === 'authorizing'}
            >
              {authStatus.state === 'authorizing' ? t('gdrive.authorizing') : t('gdrive.connect')}
            </Button>
          )}
          {authStatus.state === 'error' ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t('gdrive.authError', { error: authStatus.message })}
            </Alert>
          ) : null}
        </Box>

        {connected ? (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('gdrive.folder')}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <FolderIcon aria-hidden color="action" />
                <Typography color="text.primary">
                  {status?.folderName || t('gdrive.noFolder')}
                </Typography>
                <Button onClick={() => setPickerOpen(true)} disabled={working}>
                  {status?.folderId ? t('gdrive.changeFolder') : t('gdrive.selectFolder')}
                </Button>
              </Stack>
            </Box>
          </>
        ) : null}

        {connected && status?.folderId ? (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('gdrive.synchronization')}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography color="text.primary">
                  {status.lastSyncAt
                    ? t('gdrive.lastSync', { date: new Date(status.lastSyncAt).toLocaleString() })
                    : t('gdrive.neverSynced')}
                </Typography>
                <BusyButton variant="outlined" busy={working} onClick={() => void handleSync()}>
                  {t('gdrive.sync')}
                </BusyButton>
              </Stack>
              {lastSync && lastSync.conflicts.length > 0 ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {t('gdrive.conflicts', { count: lastSync.conflicts.length })}
                </Alert>
              ) : null}

              <Typography variant="subtitle2" sx={{ mt: 3 }}>
                {t('gdrive.managedFiles', { count: status.files?.length ?? 0 })}
              </Typography>
              <List dense>
                {(status.files ?? []).map((file) => (
                  <ListItem key={file.driveId} disableGutters>
                    <ListItemText
                      primary={
                        file.mimeType === 'application/vnd.google-apps.spreadsheet' ? (
                          <Link
                            href={driveFileUrl(file.driveId, file.mimeType)}
                            target="_blank"
                            rel="noopener"
                            aria-label={t('gdrive.openFile', { name: file.name })}
                          >
                            {file.name}
                          </Link>
                        ) : (
                          file.name
                        )
                      }
                      secondary={t(`gdrive.status.${file.syncStatus}`)}
                      secondaryTypographyProps={{ color: 'text.primary' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </>
        ) : null}
      </Stack>

      <FolderPickerDialog
        open={pickerOpen}
        working={working}
        listFolders={listFolders}
        searchFolders={searchFolders}
        onSelect={setFolder}
        onClose={() => setPickerOpen(false)}
      />
    </Box>
  );
}
