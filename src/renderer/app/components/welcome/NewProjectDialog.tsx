import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { NewProjectInput } from '@shared/types/project';

export const PROJECT_NAME_MAX_LENGTH = 80;

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
}

/** Diálogo controlado de creación de proyecto con validación de nombre. */
export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps): JSX.Element {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = (): void => {
    setName('');
    setDescription('');
    setError(null);
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const handleSubmit = (): void => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError(t('dialog.errors.nameRequired'));
      return;
    }
    if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
      setError(t('dialog.errors.nameTooLong', { max: PROJECT_NAME_MAX_LENGTH }));
      return;
    }
    onCreate({ name: trimmed, description: description.trim() || undefined });
    reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dialog.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            required
            label={t('dialog.nameLabel')}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            error={Boolean(error)}
            helperText={error ?? ' '}
            inputProps={{ 'aria-label': t('dialog.nameLabel') }}
          />
          <TextField
            label={t('dialog.descriptionLabel')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={2}
            inputProps={{ 'aria-label': t('dialog.descriptionLabel') }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('dialog.cancel')}</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {t('dialog.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
