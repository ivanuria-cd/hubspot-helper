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
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { DataOrigin, OriginType } from '@shared/types/properties';
import { useConfirm, useFieldHelp } from '@shared/components/feedback';

const ORIGIN_TYPES: OriginType[] = ['integration', 'migration', 'user', 'workflow'];

interface OriginsModalProps {
  open: boolean;
  origins: DataOrigin[];
  onClose: () => void;
  onCreate: (origin: { name: string; type: OriginType; description?: string }) => Promise<void>;
  onUpdate: (origin: DataOrigin) => Promise<void>;
  onDelete: (originId: string) => Promise<void>;
}

/**
 * Editor del catálogo de campos de un objeto de origen (SPEC-0016 D2): alimenta el desplegable
 * «Field name» del mapa editable. Un campo por línea; se normaliza (trim/dedupe/sin vacíos) y se
 * persiste con el mismo `onUpdate` que el resto del origen.
 */
function ObjectFieldsEditor({
  origin,
  objectId,
  fields,
  onUpdate,
}: {
  origin: DataOrigin;
  objectId: string;
  fields: string[];
  onUpdate: (origin: DataOrigin) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation('common');
  const fieldsHelp = useFieldHelp('properties.originsModal.fieldHelp.fields');
  const [text, setText] = useState(fields.join('\n'));
  const [saving, setSaving] = useState(false);

  const save = async (): Promise<void> => {
    const next = [
      ...new Set(
        text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    ];
    setSaving(true);
    try {
      await onUpdate({
        ...origin,
        objects: (origin.objects ?? []).map((object) =>
          object.id === objectId ? { ...object, fields: next } : object,
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
      <TextField
        size="small"
        multiline
        minRows={2}
        label={t('properties.originsModal.fields')}
        placeholder={t('properties.originsModal.fieldsPlaceholder')}
        value={text}
        onChange={(event) => setText(event.target.value)}
        inputProps={{ 'aria-describedby': fieldsHelp.describedById }}
      />
      <Stack direction="row" spacing={1} alignItems="center">
        <Button size="small" variant="outlined" onClick={() => void save()} disabled={saving}>
          {t('properties.originsModal.saveFields')}
        </Button>
        {fieldsHelp.tooltip}
      </Stack>
    </Stack>
  );
}

function OriginObjects({
  origin,
  onUpdate,
}: {
  origin: DataOrigin;
  onUpdate: (origin: DataOrigin) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation('common');
  const objectNameHelp = useFieldHelp('properties.originsModal.fieldHelp.objectName');
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
      <Stack spacing={1} sx={{ mt: 0.5, mb: 1 }}>
        {objects.length === 0 ? (
          <Typography variant="body2" color="text.primary">
            {t('properties.originsModal.noObjects')}
          </Typography>
        ) : (
          objects.map((object) => (
            <Box
              key={object.id}
              sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <Chip
                label={object.name}
                onDelete={() => void removeObject(object.id)}
                size="small"
              />
              <ObjectFieldsEditor
                origin={origin}
                objectId={object.id}
                fields={object.fields ?? []}
                onUpdate={onUpdate}
              />
            </Box>
          ))
        )}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label={t('properties.originsModal.objectName')}
          value={objectName}
          onChange={(event) => setObjectName(event.target.value)}
          inputProps={{ 'aria-describedby': objectNameHelp.describedById }}
          InputProps={{
            endAdornment: <InputAdornment position="end">{objectNameHelp.tooltip}</InputAdornment>,
          }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addObject}
          disabled={!objectName.trim()}
        >
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
  const nameHelp = useFieldHelp('properties.originsModal.fieldHelp.name');
  const typeHelp = useFieldHelp('properties.originsModal.fieldHelp.type');
  const descriptionHelp = useFieldHelp('properties.originsModal.fieldHelp.description');
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
              <Box
                key={origin.id}
                sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Stack direction="row" alignItems="center">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{origin.name}</Typography>
                    <Typography variant="body2" color="text.primary">
                      {t(`properties.originsModal.types.${origin.type}`)}
                      {origin.description ? ` — ${origin.description}` : ''}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={t('properties.originsModal.delete')}
                    onClick={() => void handleDelete(origin.id)}
                  >
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
          <TextField
            label={t('properties.originsModal.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            inputProps={{ 'aria-describedby': nameHelp.describedById }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{nameHelp.tooltip}</InputAdornment>,
            }}
          />
          <TextField
            select
            label={t('properties.originsModal.type')}
            value={type}
            onChange={(e) => setType(e.target.value as OriginType)}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end" sx={{ mr: 2 }}>
                  {typeHelp.tooltip}
                </InputAdornment>
              ),
            }}
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
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            inputProps={{ 'aria-describedby': descriptionHelp.describedById }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{descriptionHelp.tooltip}</InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={!name.trim()}
          >
            {t('properties.originsModal.add')}
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          {t('properties.originsModal.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
