import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { DataOrigin, OriginType } from '@shared/types/properties';
import { useConfirm } from '@shared/components/feedback';

const ORIGIN_TYPES: OriginType[] = ['integration', 'migration', 'user', 'workflow'];

interface OriginsModalProps {
  open: boolean;
  origins: DataOrigin[];
  onClose: () => void;
  onCreate: (origin: { name: string; type: OriginType; description?: string }) => Promise<void>;
  onUpdate: (origin: DataOrigin) => Promise<void>;
  onDelete: (originId: string) => Promise<void>;
}

function OriginObjects({
  origin,
  onUpdate,
}: {
  origin: DataOrigin;
  onUpdate: (origin: DataOrigin) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation('common');
  const [objectName, setObjectName] = useState('');
  const objects = origin.objects ?? [];

  const addObject = async (): Promise<void> => {
    if (!objectName.trim()) return;
    const next: DataOrigin = {
      ...origin,
      objects: [...objects, { id: `o-${Date.now()}`, name: objectName.trim() }],
    };
    await onUpdate(next);
    setObjectName('');
  };

  const removeObject = async (id: string): Promise<void> => {
    await onUpdate({ ...origin, objects: objects.filter((o) => o.id !== id) });
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.primary">
        {t('properties.originsModal.objects')}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 1 }}>
        {objects.length === 0 ? (
          <Typography variant="body2" color="text.primary">
            {t('properties.originsModal.noObjects')}
          </Typography>
        ) : (
          objects.map((object) => (
            <Chip key={object.id} label={object.name} onDelete={() => void removeObject(object.id)} size="small" />
          ))
        )}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label={t('properties.originsModal.objectName')}
          value={objectName}
          onChange={(event) => setObjectName(event.target.value)}
        />
        <Button size="small" variant="outlined" onClick={addObject} disabled={!objectName.trim()}>
          {t('properties.originsModal.addObject')}
        </Button>
      </Stack>
    </Box>
  );
}

export function OriginsModal({
  open,
  origins,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: OriginsModalProps): JSX.Element {
  const { t } = useTranslation('common');
  const askConfirm = useConfirm();
  const [name, setName] = useState('');
  const [type, setType] = useState<OriginType>('integration');
  const [description, setDescription] = useState('');

  const handleAdd = async (): Promise<void> => {
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), type, description: description.trim() || undefined });
    setName('');
    setDescription('');
    setType('integration');
  };

  const handleDelete = async (originId: string): Promise<void> => {
    const ok = await askConfirm({
      tone: 'danger',
      title: t('properties.deleteOriginTitle'),
      body: t('properties.deleteOriginBody'),
    });
    if (ok) await onDelete(originId);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('properties.originsModal.title')}</DialogTitle>
      <DialogContent>
        {origins.length === 0 ? (
          <Typography color="text.primary">{t('properties.originsModal.empty')}</Typography>
        ) : (
          <Stack spacing={1.5}>
            {origins.map((origin) => (
              <Box key={origin.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" alignItems="center">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{origin.name}</Typography>
                    <Typography variant="body2" color="text.primary">
                      {t(`properties.originsModal.types.${origin.type}`)}
                      {origin.description ? ` — ${origin.description}` : ''}
                    </Typography>
                  </Box>
                  <IconButton aria-label={t('properties.originsModal.delete')} onClick={() => void handleDelete(origin.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
                <OriginObjects origin={origin} onUpdate={onUpdate} />
              </Box>
            ))}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          {t('properties.originsModal.add')}
        </Typography>
        <Stack spacing={2}>
          <TextField label={t('properties.originsModal.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField select label={t('properties.originsModal.type')} value={type} onChange={(e) => setType(e.target.value as OriginType)} fullWidth>
            {ORIGIN_TYPES.map((value) => (
              <MenuItem key={value} value={value}>
                {t(`properties.originsModal.types.${value}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField label={t('properties.originsModal.description')} value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
          <Button variant="outlined" onClick={handleAdd} disabled={!name.trim()}>
            {t('properties.originsModal.add')}
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('properties.originsModal.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
