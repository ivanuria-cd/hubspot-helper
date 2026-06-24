import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useTranslation } from 'react-i18next';
import { FieldTooltip, LoadingState } from '@shared/components/feedback';
import type { HsPropertyOption, SourceEnumOption } from '@shared/types/properties';

interface SourceOptionsDialogProps {
  open: boolean;
  title: string;
  options: SourceEnumOption[];
  /** Opciones del destino HubSpot; si las hay, el valor HubSpot se elige de un desplegable. */
  hubspotOptions: HsPropertyOption[];
  onChange: (options: SourceEnumOption[]) => void;
  onClose: () => void;
}

/** Editor «aparte» del mapeo opción de origen → opción HubSpot: scroll propio, búsqueda y pegado. */
export function SourceOptionsDialog({
  open,
  title,
  options,
  hubspotOptions,
  onChange,
  onClose,
}: SourceOptionsDialogProps): JSX.Element {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  // Abre el diálogo de inmediato y difiere el render de la lista (puede ser pesada: 100+ opciones).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    setQuery('');
    setBulkOpen(false);
    setBulkText('');
    setReady(false);
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const update = (idx: number, patch: Partial<SourceEnumOption>): void => {
    onChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const remove = (idx: number): void => {
    onChange(options.filter((_, i) => i !== idx));
  };
  const add = (): void => {
    onChange([...options, { sourceValue: '', hubspotValue: '' }]);
  };
  const applyBulk = (): void => {
    const values = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((sourceValue) => ({ sourceValue, hubspotValue: '' }));
    if (values.length > 0) onChange([...options, ...values]);
    setBulkText('');
    setBulkOpen(false);
  };

  const q = query.trim().toLowerCase();
  const visible = options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !q || o.sourceValue.toLowerCase().includes(q) || (o.hubspotValue ?? '').toLowerCase().includes(q));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label={t('properties.wizard.searchOption')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary">
            {t('properties.wizard.optionsCount', { count: options.length })}
          </Typography>
          <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
            {!ready ? (
              <LoadingState variant="list" rows={6} />
            ) : visible.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('properties.wizard.noOptions')}
              </Typography>
            ) : (
              visible.map(({ o, i }) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    label={t('properties.wizard.sourceValue')}
                    value={o.sourceValue}
                    onChange={(e) => update(i, { sourceValue: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.optionValue" /></InputAdornment> }}
                  />
                  <Typography>→</Typography>
                  {hubspotOptions.length > 0 ? (
                    <TextField
                      select
                      size="small"
                      label={t('properties.wizard.hubspotValue')}
                      value={o.hubspotValue ?? ''}
                      onChange={(e) => update(i, { hubspotValue: e.target.value })}
                      sx={{ minWidth: 160 }}
                      InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.optionLabel" /></InputAdornment> }}
                    >
                      {hubspotOptions.map((d) => (
                        <MenuItem key={d.value} value={d.value}>{d.label || d.value}</MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      size="small"
                      label={t('properties.wizard.hubspotValue')}
                      value={o.hubspotValue ?? ''}
                      onChange={(e) => update(i, { hubspotValue: e.target.value })}
                      InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.optionLabel" /></InputAdornment> }}
                    />
                  )}
                  <IconButton size="small" aria-label={t('properties.panel.delete')} onClick={() => remove(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="text" startIcon={<ContentPasteIcon />} onClick={() => setBulkOpen((o) => !o)}>
              {t('properties.wizard.pasteOptions')}
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={add}>
              {t('properties.wizard.addOption')}
            </Button>
          </Stack>
          {bulkOpen ? (
            <Stack spacing={1}>
              <TextField
                size="small"
                label={t('properties.wizard.bulkList')}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                multiline
                minRows={3}
                helperText={t('properties.wizard.pasteSourceHint')}
              />
              <Button size="small" variant="outlined" startIcon={<CheckIcon />} onClick={applyBulk} disabled={!bulkText.trim()}>
                {t('properties.wizard.bulkApply')}
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" startIcon={<CloseIcon />} onClick={onClose}>
          {t('properties.wizard.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
