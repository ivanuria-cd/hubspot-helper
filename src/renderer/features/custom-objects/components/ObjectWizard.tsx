import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import type {
  CustomObjectDefinition,
  CustomObjectPropertyDef,
  ObjectUpsertDraftInput,
} from '@shared/types/custom-objects';
import type { HubSpotObject } from '@shared/types/properties';
import { HS_TYPES, fieldTypesFor } from '@shared/constants/hubspot-property-types';
import { BusyButton, FieldTooltip, useFieldHelp, useSnackbar } from '@shared/components/feedback';

interface ObjectWizardProps {
  open: boolean;
  definition: CustomObjectDefinition | null;
  objects: HubSpotObject[];
  onClose: () => void;
  onSubmit: (definition: ObjectUpsertDraftInput['definition']) => Promise<void>;
}

const NAME_RE = /^[a-z][a-z0-9_]*$/;

function defaultFieldType(type: string): string {
  return fieldTypesFor(type)[0] ?? 'text';
}

/**
 * Fila del editor con un id estable solo de UI (clave de React en la lista
 * borrable de propiedades). El `uiId` se elimina del payload al guardar.
 */
interface PropertyRow extends CustomObjectPropertyDef {
  uiId: string;
}

function emptyProperty(): PropertyRow {
  return { name: '', label: '', type: 'string', fieldType: 'text', uiId: crypto.randomUUID() };
}

export function ObjectWizard({
  open,
  definition,
  objects,
  onClose,
  onSubmit,
}: ObjectWizardProps): JSX.Element {
  const { t } = useTranslation('common');
  const editing = Boolean(definition);

  const nameHelp = useFieldHelp('customObjects.wizard.fieldHelp.name');
  const singularHelp = useFieldHelp('customObjects.wizard.fieldHelp.singular');
  const pluralHelp = useFieldHelp('customObjects.wizard.fieldHelp.plural');
  const descriptionHelp = useFieldHelp('customObjects.wizard.fieldHelp.description');

  const [name, setName] = useState('');
  const [singular, setSingular] = useState('');
  const [plural, setPlural] = useState('');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<PropertyRow[]>([emptyProperty()]);
  const [primary, setPrimary] = useState('');
  const [required, setRequired] = useState<string[]>([]);
  const [secondary, setSecondary] = useState<string[]>([]);
  const [searchable, setSearchable] = useState<string[]>([]);
  const [associated, setAssociated] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const props: PropertyRow[] = definition?.properties?.length
      ? definition.properties.map((p) => ({ ...p, uiId: crypto.randomUUID() }))
      : [emptyProperty()];
    // Solo conservamos referencias a propiedades que existen (descarta nombres obsoletos
    // p. ej. de una propiedad renombrada que seguía listada por su nombre antiguo).
    const valid = new Set(props.map((p) => p.name).filter(Boolean));
    const keep = (arr?: string[]): string[] => (arr ?? []).filter((n) => valid.has(n));
    setName(definition?.name ?? '');
    setSingular(definition?.labels.singular ?? '');
    setPlural(definition?.labels.plural ?? '');
    setDescription(definition?.description ?? '');
    setProperties(props);
    setPrimary(
      valid.has(definition?.primaryDisplayProperty ?? '') ? definition!.primaryDisplayProperty : '',
    );
    setRequired(keep(definition?.requiredProperties));
    setSecondary(keep(definition?.secondaryDisplayProperties));
    setSearchable(keep(definition?.searchableProperties));
    setAssociated(definition?.associatedObjects ?? []);
  }, [open, definition]);

  const propNames = properties.map((p) => p.name).filter(Boolean);
  const labelFor = (propName: string): string =>
    properties.find((p) => p.name === propName)?.label || propName;
  const nameValid = NAME_RE.test(name);
  const canSubmit =
    nameValid && singular.trim() && plural.trim() && primary && propNames.includes(primary);

  const updateProperty = (index: number, patch: Partial<CustomObjectPropertyDef>): void => {
    setProperties((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const [submitting, setSubmitting] = useState(false);
  const { notify } = useSnackbar();

  const handleSubmit = async (): Promise<void> => {
    // Solo nombres internos de propiedades existentes (descarta referencias obsoletas).
    const valid = new Set(propNames);
    const keep = (list: string[]): string[] => list.filter((n) => valid.has(n));
    setSubmitting(true);
    try {
      await onSubmit({
        id: definition?.id,
        name,
        description: description || undefined,
        labels: { singular, plural },
        primaryDisplayProperty: primary,
        secondaryDisplayProperties: keep(secondary),
        searchableProperties: keep(searchable),
        requiredProperties: keep(required),
        associatedObjects: associated,
        // El uiId es solo de UI: nunca sale en el payload.
        properties: properties.map((row) => {
          const { uiId, ...prop } = row;
          void uiId;
          return prop;
        }),
      });
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

  const renderMultiSelect = (
    label: string,
    rawValue: string[],
    onChange: (next: string[]) => void,
  ): JSX.Element => {
    const value = rawValue.filter((v) => propNames.includes(v));
    return (
      <Select
        multiple
        size="small"
        displayEmpty
        value={value}
        input={<OutlinedInput />}
        renderValue={(selected) => (selected.length ? selected.map(labelFor).join(', ') : label)}
        onChange={(event) =>
          onChange(
            typeof event.target.value === 'string'
              ? event.target.value.split(',')
              : event.target.value,
          )
        }
        sx={{ minWidth: 220 }}
      >
        {propNames.map((propName) => (
          <MenuItem key={propName} value={propName}>
            <Checkbox checked={value.includes(propName)} />
            <ListItemText primary={labelFor(propName)} />
          </MenuItem>
        ))}
      </Select>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editing ? t('customObjects.wizard.editTitle') : t('customObjects.wizard.title')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="subtitle2">{t('customObjects.wizard.identity')}</Typography>
          <TextField
            size="small"
            label={t('customObjects.wizard.name')}
            value={name}
            disabled={editing}
            error={Boolean(name) && !nameValid}
            helperText={t('customObjects.wizard.nameHelp')}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ 'aria-describedby': nameHelp.describedById }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{nameHelp.tooltip}</InputAdornment>,
            }}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              size="small"
              fullWidth
              label={t('customObjects.wizard.singular')}
              value={singular}
              onChange={(e) => setSingular(e.target.value)}
              inputProps={{ 'aria-describedby': singularHelp.describedById }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">{singularHelp.tooltip}</InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              fullWidth
              label={t('customObjects.wizard.plural')}
              value={plural}
              onChange={(e) => setPlural(e.target.value)}
              inputProps={{ 'aria-describedby': pluralHelp.describedById }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{pluralHelp.tooltip}</InputAdornment>,
              }}
            />
          </Stack>
          <TextField
            size="small"
            label={t('customObjects.wizard.description')}
            value={description}
            multiline
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ 'aria-describedby': descriptionHelp.describedById }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{descriptionHelp.tooltip}</InputAdornment>
              ),
            }}
          />

          <Divider />
          <Typography variant="subtitle2">{t('customObjects.wizard.properties')}</Typography>
          {properties.map((prop, index) => (
            <Stack
              key={prop.uiId}
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <TextField
                size="small"
                label={t('customObjects.wizard.propName')}
                value={prop.name}
                onChange={(e) => updateProperty(index, { name: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <FieldTooltip helpKey="customObjects.wizard.fieldHelp.propName" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                size="small"
                label={t('customObjects.wizard.propLabel')}
                value={prop.label}
                onChange={(e) => updateProperty(index, { label: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <FieldTooltip helpKey="customObjects.wizard.fieldHelp.propLabel" />
                    </InputAdornment>
                  ),
                }}
              />
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TextField
                  select
                  size="small"
                  label={t('customObjects.wizard.propType')}
                  value={prop.type}
                  sx={{ minWidth: 140 }}
                  onChange={(e) =>
                    updateProperty(index, {
                      type: e.target.value,
                      fieldType: defaultFieldType(e.target.value),
                    })
                  }
                >
                  {HS_TYPES.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </TextField>
                <FieldTooltip helpKey="customObjects.wizard.fieldHelp.propType" />
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TextField
                  select
                  size="small"
                  label={t('customObjects.wizard.propFieldType')}
                  value={
                    fieldTypesFor(prop.type).includes(prop.fieldType)
                      ? prop.fieldType
                      : fieldTypesFor(prop.type)[0]
                  }
                  sx={{ minWidth: 160 }}
                  onChange={(e) => updateProperty(index, { fieldType: e.target.value })}
                >
                  {fieldTypesFor(prop.type).map((ft) => (
                    <MenuItem key={ft} value={ft}>
                      {t(`properties.fieldTypes.${ft}`, { defaultValue: ft })}
                    </MenuItem>
                  ))}
                </TextField>
                <FieldTooltip helpKey="customObjects.wizard.fieldHelp.propFieldType" />
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(prop.hasUniqueValue)}
                      onChange={(e) => updateProperty(index, { hasUniqueValue: e.target.checked })}
                    />
                  }
                  label={t('customObjects.wizard.unique')}
                />
                <FieldTooltip helpKey="customObjects.wizard.fieldHelp.unique" />
              </Stack>
              <IconButton
                size="small"
                aria-label={t('customObjects.wizard.removeProperty')}
                disabled={properties.length === 1}
                onClick={() => setProperties((prev) => prev.filter((_, i) => i !== index))}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setProperties((prev) => [...prev, emptyProperty()])}
            >
              {t('customObjects.wizard.addProperty')}
            </Button>
          </Box>

          <Divider />
          <Typography variant="subtitle2">{t('customObjects.wizard.display')}</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TextField
              select
              size="small"
              label={t('customObjects.wizard.primary')}
              value={primary}
              sx={{ minWidth: 220 }}
              onChange={(e) => setPrimary(e.target.value)}
            >
              {propNames.map((propName) => (
                <MenuItem key={propName} value={propName}>
                  {labelFor(propName)}
                </MenuItem>
              ))}
            </TextField>
            <FieldTooltip helpKey="customObjects.wizard.fieldHelp.primary" />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {renderMultiSelect(t('customObjects.wizard.required'), required, setRequired)}
              <FieldTooltip helpKey="customObjects.wizard.fieldHelp.required" />
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {renderMultiSelect(t('customObjects.wizard.secondary'), secondary, setSecondary)}
              <FieldTooltip helpKey="customObjects.wizard.fieldHelp.secondary" />
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {renderMultiSelect(t('customObjects.wizard.searchable'), searchable, setSearchable)}
              <FieldTooltip helpKey="customObjects.wizard.fieldHelp.searchable" />
            </Stack>
          </Stack>

          <Divider />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="subtitle2">{t('customObjects.wizard.associations')}</Typography>
            <FieldTooltip helpKey="customObjects.wizard.fieldHelp.associations" />
          </Stack>
          <Select
            multiple
            size="small"
            displayEmpty
            value={associated}
            input={<OutlinedInput />}
            renderValue={(selected) =>
              selected.length ? selected.join(', ') : t('customObjects.wizard.associations')
            }
            onChange={(event) =>
              setAssociated(
                typeof event.target.value === 'string'
                  ? event.target.value.split(',')
                  : event.target.value,
              )
            }
            sx={{ minWidth: 260 }}
          >
            {objects.map((object) => (
              <MenuItem key={object.objectType} value={object.objectType}>
                <Checkbox checked={associated.includes(object.objectType)} />
                <ListItemText primary={`${object.label}${object.custom ? ' ★' : ''}`} />
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          {t('customObjects.wizard.cancel')}
        </Button>
        <BusyButton
          variant="contained"
          busy={submitting}
          startIcon={<SaveIcon />}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {t('customObjects.wizard.save')}
        </BusyButton>
      </DialogActions>
    </Dialog>
  );
}
