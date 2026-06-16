import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { HubSpotForm, FormOriginLink } from '@shared/types/forms';
import type { DataOrigin, HubSpotObject } from '@shared/types/properties';

export interface LinkOriginModalProps {
  open: boolean;
  form: HubSpotForm | null;
  link: FormOriginLink | null;
  origins: DataOrigin[];
  objects: HubSpotObject[];
  onClose: () => void;
  onSubmit: (link: {
    id?: string;
    formId: string;
    originIds: string[];
    objectType: string;
  }) => void;
}

export function LinkOriginModal({
  open,
  form,
  link,
  origins,
  objects,
  onClose,
  onSubmit,
}: LinkOriginModalProps): JSX.Element {
  const { t } = useTranslation('common');
  const [objectType, setObjectType] = useState('contacts');
  const [originIds, setOriginIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setObjectType(link?.objectType ?? form?.objectTypes[0] ?? 'contacts');
    setOriginIds(link?.originIds ?? []);
  }, [open, link, form]);

  const toggleOrigin = (id: string): void => {
    setOriginIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = (): void => {
    if (!form || originIds.length === 0) return;
    onSubmit({ id: link?.id, formId: form.id, originIds, objectType });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('forms.linkModal.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label={t('forms.linkModal.object')}
            value={objectType}
            onChange={(event) => setObjectType(event.target.value)}
            size="small"
          >
            {objects.map((object) => (
              <MenuItem key={object.objectType} value={object.objectType}>
                {object.label}
                {object.custom ? ' ★' : ''}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="subtitle2">{t('forms.linkModal.origins')}</Typography>
          {origins.length === 0 ? (
            <Typography color="text.primary">{t('forms.linkModal.noOrigins')}</Typography>
          ) : (
            origins.map((origin) => (
              <FormControlLabel
                key={origin.id}
                control={
                  <Checkbox
                    checked={originIds.includes(origin.id)}
                    onChange={() => toggleOrigin(origin.id)}
                  />
                }
                label={origin.name}
              />
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('forms.linkModal.cancel')}</Button>
        <Button variant="contained" disabled={originIds.length === 0} onClick={handleSubmit}>
          {t('forms.linkModal.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
