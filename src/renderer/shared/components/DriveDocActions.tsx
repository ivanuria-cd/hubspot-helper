/**
 * Botones unificados del documento Drive de una característica (SPEC-0004 §15.3): «Actualizar archivo
 * en Drive» (crear-o-actualizar) y «Cargar desde Drive» (reimportar, con confirmación por ser
 * destructivo). Presentacional: recibe el controlador de `useDriveDoc`.
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DriveDocController } from '@shared/hooks/useDriveDoc';

interface DriveDocActionsProps {
  doc: DriveDocController;
  updateDisabled?: boolean;
  loadDisabled?: boolean;
}

export function DriveDocActions({
  doc,
  updateDisabled = false,
  loadDisabled = false,
}: DriveDocActionsProps): JSX.Element {
  const { t } = useTranslation();
  const [confirmLoad, setConfirmLoad] = useState(false);

  const runLoad = (): void => {
    setConfirmLoad(false);
    void doc.load();
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          disabled={updateDisabled || doc.updating}
          onClick={() => void doc.update()}
        >
          {doc.updating ? t('drive.doc.updating') : t('drive.doc.update')}
        </Button>
        <Button
          variant="text"
          disabled={loadDisabled || doc.loading}
          onClick={() => setConfirmLoad(true)}
        >
          {doc.loading ? t('drive.doc.loading') : t('drive.doc.load')}
        </Button>
      </Stack>
      {doc.message ? (
        <Alert severity={doc.message.kind} onClose={doc.clearMessage}>
          {doc.message.text}
        </Alert>
      ) : null}
      <Dialog open={confirmLoad} onClose={() => setConfirmLoad(false)}>
        <DialogTitle>{t('drive.doc.loadConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('drive.doc.loadConfirmBody')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmLoad(false)}>{t('drive.doc.cancel')}</Button>
          <Button variant="contained" onClick={runLoad}>
            {t('drive.doc.load')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
