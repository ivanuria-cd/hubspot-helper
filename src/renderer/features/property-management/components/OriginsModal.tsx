import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { DataOrigin, OriginType } from '@shared/types/properties';

const ORIGIN_TYPES: OriginType[] = ['integration', 'migration', 'user', 'workflow'];

interface OriginsModalProps {
  open: boolean;
  origins: DataOrigin[];
  onClose: () => void;
  onCreate: (origin: { name: string; type: OriginType; description?: string }) => Promise<void>;
  onDelete: (originId: string) => Promise<void>;
}

export function OriginsModal({
  open,
  origins,
  onClose,
  onCreate,
  onDelete,
}: OriginsModalProps): JSX.Element {
  const { t } = useTranslation('common');
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('properties.originsModal.title')}</DialogTitle>
      <DialogContent>
        {origins.length === 0 ? (
          <Typography color="text.primary">{t('properties.originsModal.empty')}</Typography>
        ) : (
          <List dense>
            {origins.map((origin) => (
              <ListItem
                key={origin.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={t('properties.originsModal.delete')}
                    onClick={() => onDelete(origin.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={origin.name}
                  secondary={`${t(`properties.originsModal.types.${origin.type}`)}${
                    origin.description ? ` — ${origin.description}` : ''
                  }`}
                />
              </ListItem>
            ))}
          </List>
        )}

        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label={t('properties.originsModal.name')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label={t('properties.originsModal.type')}
            value={type}
            onChange={(event) => setType(event.target.value as OriginType)}
            fullWidth
          >
            {ORIGIN_TYPES.map((value) => (
              <MenuItem key={value} value={value}>
                {t(`properties.originsModal.types.${value}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('properties.originsModal.description')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            fullWidth
          />
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
