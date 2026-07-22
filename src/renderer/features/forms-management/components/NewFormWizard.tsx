import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { BusyButton, FieldTooltip, useFieldHelp, useSnackbar } from '@shared/components/feedback';
import type { NewFormDefinition } from '@shared/types/forms';
import type { DataOrigin, HubSpotObject, PropertyEntry } from '@shared/types/properties';

/** Mapeo propiedad → campo de formulario (espejo de main/forms-management/field-map.ts, §3). */
const FIELD_TYPE_MAP: Record<string, string> = {
  text: 'single_line_text',
  textarea: 'multi_line_text',
  number: 'number',
  select: 'dropdown',
  radio: 'radio',
  checkbox: 'multiple_checkboxes',
  booleancheckbox: 'single_checkbox',
  date: 'datepicker',
  phonenumber: 'phone',
};

function mapFieldType(fieldType: string, hubspotName: string): string {
  if (hubspotName === 'email') return 'email';
  return FIELD_TYPE_MAP[fieldType] ?? 'single_line_text';
}

function entryDest(entry: PropertyEntry): {
  hubspotName: string;
  label: string;
  fieldType: string;
} {
  const ref = entry.hubspotProperty;
  const hubspotName = ref.mode === 'existing' ? ref.hubspotName : ref.definition.hubspotName;
  return {
    hubspotName,
    label: ref.definition?.label ?? entry.name,
    fieldType: mapFieldType(ref.definition?.fieldType ?? '', hubspotName),
  };
}

interface FieldRow {
  hubspotName: string;
  label: string;
  fieldType: string;
  required: boolean;
  hidden: boolean;
  selected: boolean;
}

export interface NewFormWizardProps {
  open: boolean;
  objects: HubSpotObject[];
  origins: DataOrigin[];
  entries: PropertyEntry[];
  onClose: () => void;
  onSubmit: (definition: NewFormDefinition) => Promise<void>;
}

export function NewFormWizard({
  open,
  objects,
  origins,
  entries,
  onClose,
  onSubmit,
}: NewFormWizardProps): JSX.Element {
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);
  const nameHelp = useFieldHelp('forms.wizard.fieldHelp.name');
  const objectHelp = useFieldHelp('forms.wizard.fieldHelp.object');
  const [name, setName] = useState('');
  const [objectType, setObjectType] = useState('contacts');
  const [originIds, setOriginIds] = useState<string[]>([]);
  const [rows, setRows] = useState<FieldRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setObjectType('contacts');
    setOriginIds([]);
    setRows([]);
  }, [open]);

  const preselected = useMemo<FieldRow[]>(() => {
    const matching = entries.filter(
      (entry) =>
        entry.objectType === objectType &&
        entry.sources.some((source) => originIds.includes(source.originId)),
    );
    const seen = new Set<string>();
    const result: FieldRow[] = [];
    for (const entry of matching) {
      const dest = entryDest(entry);
      if (seen.has(dest.hubspotName)) continue;
      seen.add(dest.hubspotName);
      result.push({ ...dest, required: false, hidden: false, selected: true });
    }
    return result;
  }, [entries, objectType, originIds]);

  useEffect(() => {
    setRows(preselected);
  }, [preselected]);

  const toggleOrigin = (id: string): void => {
    setOriginIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const updateRow = (index: number, patch: Partial<FieldRow>): void => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = async (): Promise<void> => {
    const fields = rows
      .filter((row) => row.selected)
      .map((row) => ({
        hubspotName: row.hubspotName,
        label: row.label,
        fieldType: row.fieldType,
        required: row.required,
        hidden: row.hidden,
      }));
    setSubmitting(true);
    try {
      await onSubmit({ name, originIds, objectType, fields });
      onClose();
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t('common.loadError'),
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('forms.wizard.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('forms.wizard.name')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            size="small"
            fullWidth
            inputProps={{ 'aria-describedby': nameHelp.describedById }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{nameHelp.tooltip}</InputAdornment>,
            }}
          />
          <TextField
            select
            label={t('forms.wizard.object')}
            value={objectType}
            onChange={(event) => setObjectType(event.target.value)}
            size="small"
            inputProps={{ 'aria-describedby': objectHelp.describedById }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{objectHelp.tooltip}</InputAdornment>,
            }}
          >
            {objects.map((object) => (
              <MenuItem key={object.objectType} value={object.objectType}>
                {object.label}
                {object.custom ? ' ★' : ''}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="subtitle2">{t('forms.wizard.origins')}</Typography>
            <FieldTooltip helpKey="forms.wizard.fieldHelp.origins" />
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {origins.map((origin) => (
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
            ))}
          </Stack>

          <Typography variant="subtitle2">{t('forms.wizard.fields')}</Typography>
          {rows.length === 0 ? (
            <Typography color="text.primary">{t('forms.wizard.noFields')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>{t('forms.wizard.field')}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {t('forms.wizard.label')}
                      <FieldTooltip helpKey="forms.wizard.fieldHelp.label" />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {t('forms.wizard.fieldType')}
                      <FieldTooltip helpKey="forms.wizard.fieldHelp.fieldType" />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {t('forms.wizard.required')}
                      <FieldTooltip helpKey="forms.wizard.fieldHelp.required" />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {t('forms.wizard.hidden')}
                      <FieldTooltip helpKey="forms.wizard.fieldHelp.hidden" />
                    </Stack>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.hubspotName}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.selected}
                        onChange={(event) => updateRow(index, { selected: event.target.checked })}
                        inputProps={{ 'aria-label': row.hubspotName }}
                      />
                    </TableCell>
                    <TableCell>{row.hubspotName}</TableCell>
                    <TableCell>
                      <TextField
                        value={row.label}
                        onChange={(event) => updateRow(index, { label: event.target.value })}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell>{row.fieldType}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={row.required}
                        onChange={(event) => updateRow(index, { required: event.target.checked })}
                        inputProps={{
                          'aria-label': `${t('forms.wizard.required')} — ${row.hubspotName}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={row.hidden}
                        onChange={(event) => updateRow(index, { hidden: event.target.checked })}
                        inputProps={{
                          'aria-label': `${t('forms.wizard.hidden')} — ${row.hubspotName}`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          {t('forms.wizard.cancel')}
        </Button>
        <BusyButton
          busy={submitting}
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!name.trim() || rows.filter((r) => r.selected).length === 0}
          onClick={handleSubmit}
        >
          {t('forms.wizard.create')}
        </BusyButton>
      </DialogActions>
    </Dialog>
  );
}
