import { useEffect, useMemo, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { NewFormDefinition } from '@shared/types/forms';
import type { DataOrigin, HubSpotObject, PropertyEntry } from '@shared/types/properties';

/** Mapeo propiedad → campo de formulario (espejo de main/forms-management/field-map.ts, §3). */
const FIELD_TYPE_MAP: Record<string, string> = {
  text: 'single_line_text',
  textarea: 'multi_line_text',
  number: 'number',
  select: 'dropdown',
  radio: 'radio',
  checkbox: 'checkbox',
  booleancheckbox: 'booleancheckbox',
  date: 'date',
  phonenumber: 'phone',
};

function mapFieldType(fieldType: string, hubspotName: string): string {
  if (hubspotName === 'email') return 'email';
  return FIELD_TYPE_MAP[fieldType] ?? 'single_line_text';
}

function entryDest(entry: PropertyEntry): { hubspotName: string; label: string; fieldType: string } {
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
  onSubmit: (definition: NewFormDefinition) => void;
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

  const handleSubmit = (): void => {
    const fields = rows
      .filter((row) => row.selected)
      .map((row) => ({
        hubspotName: row.hubspotName,
        label: row.label,
        fieldType: row.fieldType,
        required: row.required,
        hidden: row.hidden,
      }));
    onSubmit({ name, originIds, objectType, fields });
    onClose();
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
          />
          <TextField
            select
            label={t('forms.wizard.object')}
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

          <Typography variant="subtitle2">{t('forms.wizard.origins')}</Typography>
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
                  <TableCell>{t('forms.wizard.label')}</TableCell>
                  <TableCell>{t('forms.wizard.fieldType')}</TableCell>
                  <TableCell>{t('forms.wizard.required')}</TableCell>
                  <TableCell>{t('forms.wizard.hidden')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.hubspotName}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.selected}
                        onChange={(event) => updateRow(index, { selected: event.target.checked })}
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
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={row.hidden}
                        onChange={(event) => updateRow(index, { hidden: event.target.checked })}
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
        <Button onClick={onClose}>{t('forms.wizard.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || rows.filter((r) => r.selected).length === 0}
          onClick={handleSubmit}
        >
          {t('forms.wizard.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
