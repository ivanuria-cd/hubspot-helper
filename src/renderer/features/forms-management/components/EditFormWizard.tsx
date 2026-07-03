import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { FieldTooltip, useFieldHelp } from '@shared/components/feedback';
import type {
  FormChange,
  FormEditsInput,
  HubSpotForm,
  SubscriptionType,
} from '@shared/types/forms';
import type { DataOrigin } from '@shared/types/properties';

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

interface ConsentCheckbox {
  subscriptionTypeId: number;
  label: string;
  required: boolean;
}

/**
 * Filas del editor con un id estable solo de UI (clave de React en listas
 * reordenables/borrables). El `uiId` nunca sale en el payload al guardar.
 */
interface EditableFieldRow extends EditableField {
  uiId: string;
}

interface ConsentCheckboxRow extends ConsentCheckbox {
  uiId: string;
}

/** Estado inicial del editor, derivado de un formulario sincronizado o de un cambio pendiente. */
export interface EditFormSource {
  name: string;
  fields: EditableField[];
  submitButtonText: string;
  consentType: string;
  privacyText: string;
  consentToProcessText: string;
  communicationConsentText: string;
  communicationsCheckboxes: ConsentCheckbox[];
  showName: boolean; // false en add_fields
  showConfig: boolean; // false en add_fields
  showOrigins: boolean; // true al editar un create_form pendiente
  originIds: string[];
}

function fieldsFromGroups(
  groups: Array<{ fields?: Array<Record<string, unknown>> }>,
): EditableField[] {
  return groups
    .flatMap((group) => group.fields ?? [])
    .map((f) => ({
      objectTypeId: String(f.objectTypeId ?? '0-1'),
      name: String(f.name ?? ''),
      label: String(f.label ?? ''),
      fieldType: String(f.fieldType ?? 'single_line_text'),
      required: Boolean(f.required),
      hidden: Boolean(f.hidden),
    }));
}

function checkboxesFromLco(lco: Record<string, unknown>): ConsentCheckbox[] {
  const raw = (lco.communicationsCheckboxes as Array<Record<string, unknown>>) ?? [];
  return raw.map((c) => ({
    subscriptionTypeId: Number(c.subscriptionTypeId ?? 0),
    label: String(c.label ?? ''),
    required: Boolean(c.required),
  }));
}

function consentFromLco(
  lco: Record<string, unknown>,
): Pick<
  EditFormSource,
  'consentType' | 'privacyText' | 'consentToProcessText' | 'communicationConsentText' | 'communicationsCheckboxes'
> {
  return {
    consentType: String(lco.type ?? 'none'),
    privacyText: String(lco.privacyText ?? ''),
    consentToProcessText: String(lco.consentToProcessText ?? ''),
    communicationConsentText: String(lco.communicationConsentText ?? ''),
    communicationsCheckboxes: checkboxesFromLco(lco),
  };
}

/** Source para editar un formulario ya sincronizado (§21). */
export function editSourceFromForm(form: HubSpotForm): EditFormSource {
  const raw = (form.raw ?? {}) as Record<string, unknown>;
  const rawDisplay = (raw.displayOptions ?? {}) as Record<string, unknown>;
  const rawLCO = (raw.legalConsentOptions ?? {}) as Record<string, unknown>;
  return {
    name: form.name,
    fields: form.fieldGroups.flatMap((group) => group.fields).map((f) => ({ ...f })),
    submitButtonText: String(rawDisplay.submitButtonText ?? ''),
    ...consentFromLco(rawLCO),
    showName: true,
    showConfig: true,
    showOrigins: false,
    originIds: [],
  };
}

/** Source para editar un cambio pendiente (§23). */
export function editSourceFromChange(change: FormChange, originIds: string[]): EditFormSource {
  const payload = (change.payload ?? {}) as Record<string, unknown>;
  const display = (payload.displayOptions ?? {}) as Record<string, unknown>;
  const lco = (payload.legalConsentOptions ?? {}) as Record<string, unknown>;
  const groups = (payload.fieldGroups as Array<{ fields?: Array<Record<string, unknown>> }>) ?? [];
  const isAddFields = change.operation === 'add_fields';
  return {
    name: String(payload.name ?? ''),
    fields: fieldsFromGroups(groups),
    submitButtonText: String(display.submitButtonText ?? ''),
    ...consentFromLco(lco),
    showName: !isAddFields,
    showConfig: !isAddFields,
    showOrigins: change.operation === 'create_form',
    originIds,
  };
}

export interface EditFormWizardProps {
  open: boolean;
  source: EditFormSource | null;
  origins: DataOrigin[];
  subscriptionTypes: SubscriptionType[];
  onClose: () => void;
  onSubmit: (edits: FormEditsInput, originIds: string[] | undefined) => void;
}

export function EditFormWizard({
  open,
  source,
  origins,
  subscriptionTypes,
  onClose,
  onSubmit,
}: EditFormWizardProps): JSX.Element {
  const { t } = useTranslation('common');
  const nameHelp = useFieldHelp('forms.editWizard.fieldHelp.name');
  const consentTypeHelp = useFieldHelp('forms.editWizard.fieldHelp.consentType');
  const submitButtonHelp = useFieldHelp('forms.editWizard.fieldHelp.submitButton');
  const privacyTextHelp = useFieldHelp('forms.editWizard.fieldHelp.privacyText');
  const consentToProcessHelp = useFieldHelp('forms.editWizard.fieldHelp.consentToProcessText');
  const communicationConsentHelp = useFieldHelp(
    'forms.editWizard.fieldHelp.communicationConsentText',
  );
  const [name, setName] = useState('');
  const [submitButtonText, setSubmitButtonText] = useState('');
  const [consentType, setConsentType] = useState('none');
  const [privacyText, setPrivacyText] = useState('');
  const [consentToProcessText, setConsentToProcessText] = useState('');
  const [communicationConsentText, setCommunicationConsentText] = useState('');
  const [checkboxes, setCheckboxes] = useState<ConsentCheckboxRow[]>([]);
  const [fields, setFields] = useState<EditableFieldRow[]>([]);
  const [originIds, setOriginIds] = useState<string[]>([]);

  useEffect(() => {
    if (!source || !open) return;
    setName(source.name);
    setSubmitButtonText(source.submitButtonText);
    setConsentType(source.consentType);
    setPrivacyText(source.privacyText);
    setConsentToProcessText(source.consentToProcessText);
    setCommunicationConsentText(source.communicationConsentText);
    setCheckboxes(
      source.communicationsCheckboxes.map((c) => ({ ...c, uiId: crypto.randomUUID() })),
    );
    setFields(source.fields.map((f) => ({ ...f, uiId: crypto.randomUUID() })));
    setOriginIds(source.originIds);
  }, [source, open]);

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
        uiId: crypto.randomUUID(),
      },
    ]);
  };

  const toggleOrigin = (id: string): void => {
    setOriginIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const patchCheckbox = (index: number, patch: Partial<ConsentCheckbox>): void => {
    setCheckboxes((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addCheckbox = (): void => {
    setCheckboxes((prev) => [
      ...prev,
      {
        subscriptionTypeId: subscriptionTypes[0]?.id ?? 0,
        label: '',
        required: false,
        uiId: crypto.randomUUID(),
      },
    ]);
  };

  const removeCheckbox = (index: number): void => {
    setCheckboxes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = (): void => {
    if (!source) return;
    const edits: FormEditsInput = {
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
    };
    if (source.showName) edits.name = name.trim();
    if (source.showConfig) {
      if (submitButtonText.trim()) edits.displayOptions = { submitButtonText };
      if (consentType === 'none') {
        edits.legalConsentOptions = { type: 'none' };
      } else {
        const lco: Record<string, unknown> = {
          type: consentType,
          privacyText,
          communicationsCheckboxes: checkboxes
            .filter((c) => c.subscriptionTypeId)
            .map((c) => ({
              subscriptionTypeId: c.subscriptionTypeId,
              label: c.label,
              required: c.required,
            })),
        };
        if (consentToProcessText.trim()) lco.consentToProcessText = consentToProcessText;
        if (communicationConsentText.trim()) lco.communicationConsentText = communicationConsentText;
        edits.legalConsentOptions = lco;
      }
    }
    onSubmit(edits, source.showOrigins ? originIds : undefined);
    onClose();
  };

  const title = source?.showName
    ? t('forms.editWizard.title', { name: source?.name ?? '' })
    : t('forms.editWizard.titleFields');

  return (
    <Dialog open={open && Boolean(source)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {source?.showName ? (
            <TextField
              label={t('forms.editWizard.name')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              fullWidth
              inputProps={{ 'aria-describedby': nameHelp.describedById }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{nameHelp.tooltip}</InputAdornment>,
              }}
            />
          ) : null}

          <Typography variant="subtitle2">{t('forms.editWizard.fields')}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {t('forms.editWizard.fieldName')}
                    <FieldTooltip helpKey="forms.editWizard.fieldHelp.fieldName" />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {t('forms.editWizard.label')}
                    <FieldTooltip helpKey="forms.editWizard.fieldHelp.label" />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {t('forms.editWizard.fieldType')}
                    <FieldTooltip helpKey="forms.editWizard.fieldHelp.fieldType" />
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    {t('forms.editWizard.required')}
                    <FieldTooltip helpKey="forms.editWizard.fieldHelp.required" />
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    {t('forms.editWizard.hidden')}
                    <FieldTooltip helpKey="forms.editWizard.fieldHelp.hidden" />
                  </Stack>
                </TableCell>
                <TableCell align="right">{t('forms.editWizard.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.uiId}>
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
          <Button variant="text" startIcon={<AddIcon />} onClick={addField} sx={{ alignSelf: 'flex-start' }}>
            {t('forms.editWizard.addField')}
          </Button>

          {source?.showOrigins ? (
            <>
              <Divider />
              <Typography variant="subtitle2">{t('forms.editWizard.origins')}</Typography>
              {origins.length === 0 ? (
                <Typography color="text.primary">{t('forms.linkModal.noOrigins')}</Typography>
              ) : (
                <FormGroup>
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
                </FormGroup>
              )}
            </>
          ) : null}

          {source?.showConfig ? (
            <>
              <Divider />
              <Typography variant="subtitle2">{t('forms.editWizard.config')}</Typography>
              <TextField
                label={t('forms.editWizard.submitButton')}
                value={submitButtonText}
                onChange={(event) => setSubmitButtonText(event.target.value)}
                fullWidth
                inputProps={{ 'aria-describedby': submitButtonHelp.describedById }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">{submitButtonHelp.tooltip}</InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                label={t('forms.editWizard.consent')}
                value={consentType}
                onChange={(event) => setConsentType(event.target.value)}
                fullWidth
                inputProps={{ 'aria-describedby': consentTypeHelp.describedById }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ mr: 2 }}>
                      {consentTypeHelp.tooltip}
                    </InputAdornment>
                  ),
                }}
              >
                {CONSENT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              {consentType !== 'none' ? (
                <>
                  <TextField
                    label={t('forms.editWizard.privacyText')}
                    value={privacyText}
                    onChange={(event) => setPrivacyText(event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    inputProps={{ 'aria-describedby': privacyTextHelp.describedById }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">{privacyTextHelp.tooltip}</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label={t('forms.editWizard.consentToProcessText')}
                    value={consentToProcessText}
                    onChange={(event) => setConsentToProcessText(event.target.value)}
                    fullWidth
                    inputProps={{ 'aria-describedby': consentToProcessHelp.describedById }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">{consentToProcessHelp.tooltip}</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label={t('forms.editWizard.communicationConsentText')}
                    value={communicationConsentText}
                    onChange={(event) => setCommunicationConsentText(event.target.value)}
                    fullWidth
                    inputProps={{ 'aria-describedby': communicationConsentHelp.describedById }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {communicationConsentHelp.tooltip}
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t('forms.editWizard.checkboxes')}
                  </Typography>
                  {checkboxes.map((checkbox, index) => (
                    <Stack key={checkbox.uiId} direction="row" spacing={1} alignItems="center">
                      <TextField
                        select
                        size="small"
                        label={t('forms.editWizard.subscriptionType')}
                        value={checkbox.subscriptionTypeId || ''}
                        onChange={(event) =>
                          patchCheckbox(index, { subscriptionTypeId: Number(event.target.value) })
                        }
                        sx={{ minWidth: 220 }}
                      >
                        {subscriptionTypes.map((sub) => (
                          <MenuItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <FieldTooltip helpKey="forms.editWizard.fieldHelp.subscriptionType" />
                      <TextField
                        size="small"
                        label={t('forms.editWizard.label')}
                        value={checkbox.label}
                        onChange={(event) => patchCheckbox(index, { label: event.target.value })}
                        sx={{ flexGrow: 1 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checkbox.required}
                            onChange={(event) =>
                              patchCheckbox(index, { required: event.target.checked })
                            }
                          />
                        }
                        label={t('forms.editWizard.required')}
                      />
                      <IconButton
                        size="small"
                        aria-label={t('forms.editWizard.remove')}
                        onClick={() => removeCheckbox(index)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={addCheckbox}
                    disabled={subscriptionTypes.length === 0}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {t('forms.editWizard.addCheckbox')}
                  </Button>
                  {subscriptionTypes.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      {t('forms.editWizard.noSubscriptions')}
                    </Typography>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          {t('forms.editWizard.cancel')}
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
          {t('forms.editWizard.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
