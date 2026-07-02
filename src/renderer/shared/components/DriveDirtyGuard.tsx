/**
 * Modal recordatorio al salir de la pantalla con cambios sin actualizar en Drive (SPEC-0004 §15.3).
 * Bloquea la navegación in-app (react-router) cuando hay estado «dirty» y ofrece actualizar antes de
 * salir. La preferencia «no volver a preguntar» se persiste por proyecto + característica.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import { useBlocker, type BlockerFunction } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from './feedback';

interface DriveDirtyGuardProps {
  dirty: boolean;
  projectId: string;
  featureKey: string;
  /** Acción de actualizar el archivo (mismo `update` del controlador useDriveDoc). */
  onUpdate: () => Promise<{ success: boolean; error?: string }>;
}

function skipKey(projectId: string, featureKey: string): string {
  return `revops:driveGuardSkip:${projectId}:${featureKey}`;
}

export function DriveDirtyGuard({
  dirty,
  projectId,
  featureKey,
  onUpdate,
}: DriveDirtyGuardProps): JSX.Element | null {
  const { t } = useTranslation();
  const { notify } = useSnackbar();
  const [skip, setSkip] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);

  useEffect(() => {
    setSkip(localStorage.getItem(skipKey(projectId, featureKey)) === 'true');
  }, [projectId, featureKey]);

  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        dirty && !skip && currentLocation.pathname !== nextLocation.pathname,
      [dirty, skip],
    ),
  );

  const persistDontAsk = useCallback(() => {
    if (dontAsk) {
      localStorage.setItem(skipKey(projectId, featureKey), 'true');
      setSkip(true);
    }
  }, [dontAsk, projectId, featureKey]);

  if (blocker.state !== 'blocked') return null;

  const leaveWithout = (): void => {
    persistDontAsk();
    blocker.proceed();
  };

  const updateAndLeave = async (): Promise<void> => {
    // SPEC-0004 §27: si la actualización falla, el diálogo permanece y se notifica el motivo
    // (antes se quedaba abierto sin ningún feedback).
    try {
      const result = await onUpdate();
      if (result.success) {
        persistDontAsk();
        blocker.proceed();
        return;
      }
      notify({ message: result.error ?? t('common.loadError'), severity: 'error' });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t('common.loadError'),
        severity: 'error',
      });
    }
  };

  return (
    <Dialog open onClose={() => blocker.reset()}>
      <DialogTitle>{t('drive.dirtyGuard.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('drive.dirtyGuard.body')}</DialogContentText>
        <FormControlLabel
          control={<Checkbox checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />}
          label={t('drive.dirtyGuard.dontAsk')}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={() => blocker.reset()}>
          {t('drive.dirtyGuard.cancel')}
        </Button>
        <Button startIcon={<LogoutIcon />} onClick={leaveWithout}>
          {t('drive.dirtyGuard.leave')}
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={() => void updateAndLeave()}>
          {t('drive.dirtyGuard.updateAndLeave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
