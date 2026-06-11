import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { DataOrigin, PropertyOriginMapping, TransformationRule } from '@shared/types/properties';

interface MappingDialogProps {
  open: boolean;
  propertyId: string;
  origins: DataOrigin[];
  mapping?: PropertyOriginMapping | null;
  onClose: () => void;
  onSubmit: (mapping: Omit<PropertyOriginMapping, 'id'> & { id?: string }) => Promise<void>;
}

export function MappingDialog({
  open,
  propertyId,
  origins,
  mapping,
  onClose,
  onSubmit,
}: MappingDialogProps): JSX.Element {
  const { t } = useTranslation('common');
  const [originId, setOriginId] = useState(mapping?.originId ?? origins[0]?.id ?? '');
  const [sourceField, setSourceField] = useState(mapping?.sourceField ?? '');
  const [notes, setNotes] = useState(mapping?.notes ?? '');
  const [rules, setRules] = useState<TransformationRule[]>(mapping?.transformations ?? []);

  const updateRule = (index: number, key: keyof TransformationRule, value: string): void => {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, [key]: value } : rule)));
  };

  const handleSubmit = async (): Promise<void> => {
    await onSubmit({
      id: mapping?.id,
      propertyId,
      originId,
      sourceField: sourceField.trim(),
      transformations: rules.filter((rule) => rule.sourceValue || rule.targetValue),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('properties.mappingDialog.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label={t('properties.mappingDialog.origin')}
            value={originId}
            onChange={(event) => setOriginId(event.target.value)}
            fullWidth
          >
            {origins.map((origin) => (
              <MenuItem key={origin.id} value={origin.id}>
                {origin.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('properties.mappingDialog.sourceField')}
            value={sourceField}
            onChange={(event) => setSourceField(event.target.value)}
            fullWidth
          />
          <Typography variant="subtitle2">{t('properties.mappingDialog.transformations')}</Typography>
          {rules.map((rule, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                label="origen"
                value={rule.sourceValue}
                onChange={(event) => updateRule(index, 'sourceValue', event.target.value)}
              />
              <Typography>→</Typography>
              <TextField
                size="small"
                label="HubSpot"
                value={rule.targetValue}
                onChange={(event) => updateRule(index, 'targetValue', event.target.value)}
              />
              <IconButton
                aria-label={t('properties.panel.delete')}
                onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))}
              >
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          <Button
            variant="text"
            onClick={() => setRules((prev) => [...prev, { sourceValue: '', targetValue: '' }])}
          >
            {t('properties.mappingDialog.addRule')}
          </Button>
          <TextField
            label={t('properties.mappingDialog.notes')}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('properties.mappingDialog.cancel')}</Button>
        <Button variant="contained" disabled={!originId || !sourceField.trim()} onClick={handleSubmit}>
          {t('properties.mappingDialog.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
