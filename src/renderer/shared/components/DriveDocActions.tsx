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
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import type { DriveDocController } from '@shared/hooks/useDriveDoc';

interface DriveDocActionsProps {
  doc: DriveDocController;
  updateDisabled?: boolean;
  loadDisabled?: boolean;
  /** Oculta «Actualizar archivo en Drive» (SPEC-0016 §2.7: en Propiedades el estado se escribe solo). */
  hideUpdate?: boolean;
  /** Oculta «Abrir en Drive» (SPEC-0016: en Propiedades lo aporta PlanningMapActions, apuntando al mapa editable). */
  hideOpen?: boolean;
}

export function DriveDocActions({
  doc,
  updateDisabled = false,
  loadDisabled = false,
  hideUpdate = false,
  hideOpen = false,
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
        {hideUpdate ? null : (
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            disabled={updateDisabled || doc.updating}
            onClick={() => void doc.update()}
          >
            {doc.updating ? t('drive.doc.updating') : t('drive.doc.update')}
          </Button>
        )}
        <Button
          variant="text"
          startIcon={<FileDownloadOutlinedIcon />}
          disabled={loadDisabled || doc.loading}
          onClick={() => setConfirmLoad(true)}
        >
          {doc.loading ? t('drive.doc.loading') : t('drive.doc.load')}
        </Button>
        {!hideOpen && doc.fileUrl ? (
          <Button
            variant="text"
            startIcon={<OpenInNewIcon />}
            component="a"
            href={doc.fileUrl}
            target="_blank"
            rel="noopener"
            aria-label={t('drive.doc.open')}
          >
            {t('drive.doc.open')}
          </Button>
        ) : null}
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
          <Button startIcon={<CloseIcon />} onClick={() => setConfirmLoad(false)}>
            {t('drive.doc.cancel')}
          </Button>
          <Button variant="contained" startIcon={<FileDownloadOutlinedIcon />} onClick={runLoad}>
            {t('drive.doc.load')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
