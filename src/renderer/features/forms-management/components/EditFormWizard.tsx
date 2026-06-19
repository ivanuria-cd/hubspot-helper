import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import type { FormEditsInput, HubSpotForm } from '@shared/types/forms';

/** Tipos de campo válidos en Marketing Forms API v3 (SPEC-0008 §19). */
const FIELD_TYPES = [
  'single_line_text',
  'multi_line_text',
  'dropdown',
  'radio',
  'multiple_checkboxes',
  'single_checkbox',
  'number',
  'datepicker',
  'phone',
  'email',
  'file',
];

const CONSENT_TYPES = [
  'none',
  'legitimate_interest',
  'explicit_consent_to_process',
  'implicit_consent_to_process',
];

interface EditableField {
  objectTypeId: string;
  name: string;
  label: string;
  fieldType: string;
  required: boolean;
  hidden: boolean;
}

export interface EditFormWizardProps {
  open: boolean;
  form: HubSpotForm | null;
  onClose: () => void;
  onSubmit: (edits: FormEditsInput) => void;
}

export function EditFormWizard({ open, form, onClose, onSubmit }: EditFormWizardProps): JSX.Element {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [submitButtonText, setSubmitButtonText] = useState('');
  const [consentType, setConsentType] = useState('none');
  const [fields, setFields] = useState<EditableField[]>([]);

  useEffect(() => {
    if (!form || !open) return;
    const raw = (form.raw ?? {}) as Record<string, unknown>;
    const rawDisplay = (raw.displayOptions ?? {}) as Record<string, unknown>;
    const rawLCO = (raw.legalConsentOptions ?? {}) as Record<string, unknown>;
    setName(form.name);
    setSubmitButtonText(String(rawDisplay.submitButtonText ?? ''));
    setConsentType(String(rawLCO.type ?? 'none'));
    setFields(
      form.fieldGroups
        .flatMap((group) => group.fields)
        .map((f) => ({
          objectTypeId: f.objectTypeId,
          name: f.name,
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          hidden: f.hidden,
        })),
    );
  }, [form, open]);

  const patchField = (index: number, patch: Partial<EditableField>): void => {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  };

  const move = (index: number, delta: number): void => {
    setFields((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number): void => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addField = (): void => {
    setFields((prev) => [
      ...prev,
      {
        objectTypeId: prev[0]?.objectTypeId ?? '0-1',
        name: '',
        label: '',
        fieldType: 'single_line_text',
        required: false,
        hidden: false,
      },
    ]);
  };

  const handleSave = (): void => {
    const raw = (form?.raw ?? {}) as Record<string, unknown>;
    const rawLCO = (raw.legalConsentOptions ?? { type: 'none' }) as Record<string, unknown>;
    const edits: FormEditsInput = {
      name: name.trim(),
      fields: fields
        .filter((f) => f.name.trim())
        .map((f) => ({
          objectTypeId: f.objectTypeId,
          name: f.name.trim(),
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          hidden: f.hidden,
        })),
      legalConsentOptions: { ...rawLCO, type: consentType },
    };
    // Solo se toca el texto del botón si el usuario puso uno (no se pisa con vacío).
    if (submitButtonText.trim()) edits.displayOptions = { submitButtonText };
    onSubmit(edits);
    onClose();
  };

  return (
    <Dialog open={open && Boolean(form)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('forms.editWizard.title', { name: form?.name ?? '' })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('forms.editWizard.name')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
          />

          <Typography variant="subtitle2">{t('forms.editWizard.fields')}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('forms.editWizard.fieldName')}</TableCell>
                <TableCell>{t('forms.editWizard.label')}</TableCell>
                <TableCell>{t('forms.editWizard.fieldType')}</TableCell>
                <TableCell align="center">{t('forms.editWizard.required')}</TableCell>
                <TableCell align="center">{t('forms.editWizard.hidden')}</TableCell>
                <TableCell align="right">{t('forms.editWizard.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={field.name}
                      onChange={(event) => patchField(index, { name: event.target.value })}
                      placeholder={t('forms.editWizard.fieldName')}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={field.label}
                      onChange={(event) => patchField(index, { label: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={field.fieldType}
                      onChange={(event) => patchField(index, { fieldType: event.target.value })}
                      sx={{ minWidth: 160 }}
                    >
                      {FIELD_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell align="center" padding="checkbox">
                    <Checkbox
                      checked={field.required}
                      onChange={(event) => patchField(index, { required: event.target.checked })}
                      inputProps={{ 'aria-label': `${t('forms.editWizard.required')} ${field.name}` }}
                    />
                  </TableCell>
                  <TableCell align="center" padding="checkbox">
                    <Checkbox
                      checked={field.hidden}
                      onChange={(event) => patchField(index, { hidden: event.target.checked })}
                      inputProps={{ 'aria-label': `${t('forms.editWizard.hidden')} ${field.name}` }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={t('forms.editWizard.moveUp')}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={t('forms.editWizard.moveDown')}
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={t('forms.editWizard.remove')}
                      onClick={() => remove(index)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="text" onClick={addField} sx={{ alignSelf: 'flex-start' }}>
            {t('forms.editWizard.addField')}
          </Button>

          <Typography variant="subtitle2">{t('forms.editWizard.config')}</Typography>
          <TextField
            label={t('forms.editWizard.submitButton')}
            value={submitButtonText}
            onChange={(event) => setSubmitButtonText(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label={t('forms.editWizard.consent')}
            value={consentType}
            onChange={(event) => setConsentType(event.target.value)}
            fullWidth
          >
            {CONSENT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('forms.editWizard.cancel')}</Button>
        <Button variant="contained" onClick={handleSave}>
          {t('forms.editWizard.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
