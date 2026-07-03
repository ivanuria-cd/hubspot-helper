import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
import type { HsPropertyOption } from '@shared/types/properties';

function parseBulkOptions(text: string, sep: string): Array<{ label: string; value: string }> {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      if (sep && line.includes(sep)) {
        const i = line.indexOf(sep);
        const label = line.slice(0, i).trim();
        const value = line.slice(i + sep.length).trim();
        return { label: label || value, value: value || label };
      }
      return { label: line, value: line };
    });
}

function reindex(options: HsPropertyOption[]): HsPropertyOption[] {
  return options.map((o, i) => ({ ...o, displayOrder: i }));
}

interface OptionsDialogProps {
  open: boolean;
  title: string;
  options: HsPropertyOption[];
  onChange: (options: HsPropertyOption[]) => void;
  onClose: () => void;
}

/** Editor de opciones de enumeración «aparte»: lista con scroll propio, búsqueda y pegado masivo. */
export function OptionsDialog({ open, title, options, onChange, onClose }: OptionsDialogProps): JSX.Element {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSep, setBulkSep] = useState('');
  // Abre el diálogo de inmediato y difiere el render de la lista (puede ser pesada: 100+ opciones).
  const [ready, setReady] = useState(false);
  // SPEC-0006 §51: ids estables por fila (solo UI, no se emiten en onChange) para que
  // React no recicle inputs al borrar filas intermedias (antes key={index}).
  const [rowIds, setRowIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    setQuery('');
    setBulkOpen(false);
    setBulkText('');
    setBulkSep('');
    setRowIds(options.map(() => crypto.randomUUID()));
    setReady(false);
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const updateOption = (idx: number, patch: Partial<HsPropertyOption>): void => {
    onChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const removeOption = (idx: number): void => {
    onChange(reindex(options.filter((_, i) => i !== idx)));
    setRowIds((ids) => ids.filter((_, i) => i !== idx));
  };
  const addOption = (): void => {
    onChange([...options, { label: '', value: '', displayOrder: options.length, hidden: false }]);
    setRowIds((ids) => [...ids, crypto.randomUUID()]);
  };
  const applyBulk = (): void => {
    const parsed = parseBulkOptions(bulkText, bulkSep);
    if (parsed.length > 0) {
      onChange(reindex([...options, ...parsed.map((o) => ({ ...o, displayOrder: 0, hidden: false }))]));
      setRowIds((ids) => [...ids, ...parsed.map(() => crypto.randomUUID())]);
    }
    setBulkText('');
    setBulkSep('');
    setBulkOpen(false);
  };

  const q = query.trim().toLowerCase();
  const visible = options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));

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
                <Stack key={rowIds[i] ?? `row-${i}`} direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    label={t('properties.wizard.optionLabel')}
                    value={o.label}
                    onChange={(e) => updateOption(i, { label: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.optionLabel" /></InputAdornment> }}
                  />
                  <TextField
                    size="small"
                    label={t('properties.wizard.optionValue')}
                    value={o.value}
                    onChange={(e) => updateOption(i, { value: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.optionValue" /></InputAdornment> }}
                  />
                  <IconButton size="small" aria-label={t('properties.panel.delete')} onClick={() => removeOption(i)}>
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
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={addOption}>
              {t('properties.wizard.addPropOption')}
            </Button>
          </Stack>
          {bulkOpen ? (
            <Stack spacing={1}>
              <TextField
                size="small"
                label={t('properties.wizard.separator')}
                value={bulkSep}
                onChange={(e) => setBulkSep(e.target.value)}
                sx={{ maxWidth: 220 }}
              />
              <TextField
                size="small"
                label={t('properties.wizard.bulkList')}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                multiline
                minRows={3}
                helperText={t('properties.wizard.pasteHint')}
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
