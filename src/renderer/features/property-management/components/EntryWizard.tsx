import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { OptionsDialog } from './OptionsDialog';
import { SourceOptionsDialog } from './SourceOptionsDialog';
import { BusyButton, FieldTooltip, useFieldHelp, useSnackbar } from '@shared/components/feedback';
import { useTranslation } from 'react-i18next';
import type {
  DataOrigin,
  EntrySource,
  HsPropertyType,
  HubSpotGroup,
  HubSpotPropertyDef,
  PropertyEntry,
  SourceEnumOption,
  SourceFieldKind,
} from '@shared/types/properties';
import {
  DATA_SENSITIVITIES,
  FIELD_TYPES_BY_TYPE,
  HS_TYPES,
  NUMBER_DISPLAY_HINTS,
  TEXT_DISPLAY_HINTS,
  defaultFieldType,
} from '@shared/constants/hubspotPropertyTypes';

const KINDS: SourceFieldKind[] = ['number', 'text', 'boolean', 'enum', 'memo'];

/** ¿La definición usa alguna opción avanzada? Sirve para abrir la sección colapsable. */
function hasAdvancedContent(def: HubSpotPropertyDef): boolean {
  return Boolean(
    def.numberDisplayHint ||
      def.textDisplayHint ||
      def.calculationFormula ||
      def.dataSensitivity ||
      def.hasUniqueValue ||
      def.formField !== undefined ||
      def.fieldType === 'calculation_equation',
  );
}

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const EMPTY_DEF: HubSpotPropertyDef = {
  hubspotName: '',
  label: '',
  type: 'string',
  fieldType: 'text',
  groupName: '',
};

interface DraftSource {
  id: string;
  originId: string;
  originObjectId: string;
  sourceField: string;
  kind: SourceFieldKind;
  truthy: string;
  falsy: string;
  options: SourceEnumOption[];
  notes: string;
}

interface EntryWizardProps {
  open: boolean;
  projectId: string;
  objectType: string;
  entry?: PropertyEntry | null;
  origins: DataOrigin[];
  onClose: () => void;
  onSubmit: (entry: Omit<PropertyEntry, 'id' | 'hubspotStatus' | 'pendingChanges'> & { id?: string }) => Promise<void>;
}

function toDraft(source: EntrySource): DraftSource {
  return {
    id: source.id,
    originId: source.originId,
    originObjectId: source.originObjectId ?? '',
    sourceField: source.sourceField,
    kind: source.definition.kind,
    truthy: source.definition.boolean?.truthy ?? 'true',
    falsy: source.definition.boolean?.falsy ?? 'false',
    options: source.definition.options ?? [],
    notes: source.notes ?? '',
  };
}

export function EntryWizard({
  open,
  projectId,
  objectType,
  entry,
  origins,
  onClose,
  onSubmit,
}: EntryWizardProps): JSX.Element {
  const { t } = useTranslation('common');
  const nameHelp = useFieldHelp('properties.wizard.fieldHelp.name');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingName, setExistingName] = useState('');
  const [def, setDef] = useState<HubSpotPropertyDef>(EMPTY_DEF);
  const [hsProps, setHsProps] = useState<HubSpotPropertyDef[]>([]);
  const [groups, setGroups] = useState<HubSpotGroup[]>([]);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [sources, setSources] = useState<DraftSource[]>([]);
  const [advOpen, setAdvOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [srcOptionsId, setSrcOptionsId] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { notify } = useSnackbar();

  useEffect(() => {
    if (!open) return;
    setName(entry?.name ?? '');
    setMode(entry?.hubspotProperty.mode ?? 'existing');
    setExistingName(entry?.hubspotProperty.mode === 'existing' ? entry.hubspotProperty.hubspotName : '');
    const loadedDef =
      entry?.hubspotProperty.mode === 'new'
        ? entry.hubspotProperty.definition
        : entry?.hubspotProperty.mode === 'existing' && entry.hubspotProperty.definition
          ? entry.hubspotProperty.definition
          : EMPTY_DEF;
    setDef(loadedDef);
    setAdvOpen(hasAdvancedContent(loadedDef));
    setSources((entry?.sources ?? []).map(toDraft));
    setNewGroupLabel('');
    // Limpia datos del objeto anterior para no mostrar grupos/propiedades obsoletos.
    setHsProps([]);
    setGroups([]);
    setMetaLoading(true);
    const tasks: Promise<unknown>[] = [];
    if (typeof window.api.hubspotPropertiesList === 'function') {
      tasks.push(
        window.api.hubspotPropertiesList({ projectId, objectType }).then(setHsProps).catch(() => setHsProps([])),
      );
    }
    if (typeof window.api.groupsList === 'function') {
      tasks.push(
        window.api
          .groupsList({ projectId, objectType })
          .then((list) => {
            setGroups(list);
            setDef((d) => (d.groupName || list.length === 0 ? d : { ...d, groupName: list[0].name }));
          })
          .catch(() => setGroups([])),
      );
    }
    void Promise.allSettled(tasks).then(() => setMetaLoading(false));
  }, [open, entry, projectId, objectType]);

  const selectExisting = (prop: HubSpotPropertyDef | null): void => {
    setExistingName(prop?.hubspotName ?? '');
    if (prop) setDef({ ...prop });
  };

  const updateSource = (id: string, patch: Partial<DraftSource>): void => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addSource = (): void => {
    setSources((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, originId: origins[0]?.id ?? '', originObjectId: '', sourceField: '', kind: 'text', truthy: 'true', falsy: 'false', options: [], notes: '' },
    ]);
  };

  const createGroup = async (): Promise<void> => {
    const label = newGroupLabel.trim();
    if (!label || typeof window.api.groupsCreate !== 'function') return;
    try {
      const created = await window.api.groupsCreate({ projectId, objectType, name: slugify(label), label });
      const list = await window.api.groupsList({ projectId, objectType });
      setGroups(list);
      setDef((d) => ({ ...d, groupName: created.name }));
      setNewGroupLabel('');
    } catch (error) {
      // SPEC-0006 §50: un fallo IPC era un unhandled rejection sin feedback.
      notify({
        message: error instanceof Error ? error.message : t('common.loadError'),
        severity: 'error',
      });
    }
  };

  // El grupo se resuelve antes de aplicar en HubSpot (puede no haber grupos sin portal);
  // para guardar la entrada local basta nombre técnico + etiqueta.
  const canSubmit = name.trim() && (mode === 'existing' ? existingName : def.hubspotName.trim() && def.label.trim());

  const handleSubmit = async (): Promise<void> => {
    const builtSources: EntrySource[] = sources.map((s) => ({
      id: s.id.startsWith('tmp-') ? '' : s.id,
      originId: s.originId,
      originObjectId: s.originObjectId || undefined,
      sourceField: s.sourceField.trim(),
      definition: {
        kind: s.kind,
        ...(s.kind === 'boolean' ? { boolean: { truthy: s.truthy, falsy: s.falsy } } : {}),
        ...(s.kind === 'enum' ? { options: s.options } : {}),
      },
      notes: s.notes.trim() || undefined,
    }));
    const cleanOptions =
      def.type === 'enumeration'
        ? (def.options ?? [])
            .filter((o) => o.label.trim() || o.value.trim())
            .map((o, i) => ({ ...o, displayOrder: i }))
        : undefined;
    const cleanDef = { ...def, options: cleanOptions };
    // SPEC-0006 §50: estado ocupado (evita doble submit) + errores notificados por Snackbar.
    setSaving(true);
    try {
      await onSubmit({
        id: entry?.id,
        objectType,
        name: name.trim(),
        hubspotProperty:
          mode === 'existing'
            ? { mode: 'existing', hubspotName: existingName, definition: { ...cleanDef, hubspotName: existingName } }
            : { mode: 'new', definition: cleanDef },
        sources: builtSources,
      });
      onClose();
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : t('common.loadError'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const fieldTypeOptions = FIELD_TYPES_BY_TYPE[def.type] ?? ['text'];

  const definitionEditor = (editableName: boolean): JSX.Element => (
    <Stack spacing={1.5}>
      {editableName ? (
        <TextField
          label={t('properties.newProp.hubspotName')}
          value={def.hubspotName}
          onChange={(e) => setDef({ ...def, hubspotName: e.target.value })}
          InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.selectProperty" /></InputAdornment> }}
        />
      ) : null}
      <TextField
        label={t('properties.newProp.label')}
        value={def.label}
        onChange={(e) => setDef({ ...def, label: e.target.value })}
        InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.selectProperty" /></InputAdornment> }}
      />
      <TextField
        select
        label={t('properties.newProp.type')}
        value={def.type}
        onChange={(e) => {
          const type = e.target.value as HsPropertyType;
          setDef({ ...def, type, fieldType: defaultFieldType(type) });
        }}
        InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.kind" /></InputAdornment> }}
      >
        {HS_TYPES.map((tp) => (
          <MenuItem key={tp} value={tp}>{tp}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={t('properties.newProp.fieldType')}
        value={fieldTypeOptions.includes(def.fieldType) ? def.fieldType : fieldTypeOptions[0]}
        onChange={(e) => {
          setDef({ ...def, fieldType: e.target.value });
          if (e.target.value === 'calculation_equation') setAdvOpen(true);
        }}
        InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.kind" /></InputAdornment> }}
      >
        {fieldTypeOptions.map((ft) => (
          <MenuItem key={ft} value={ft}>{t(`properties.fieldTypes.${ft}`, { defaultValue: ft })}</MenuItem>
        ))}
      </TextField>
      <TextField
        label={t('properties.advanced.description')}
        value={def.description ?? ''}
        onChange={(e) => setDef({ ...def, description: e.target.value || undefined })}
        multiline
        minRows={2}
        InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.advanced.fieldHelp.description" /></InputAdornment> }}
      />

      {def.type === 'enumeration' ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}
        >
          <Typography variant="body2" color="text.primary">
            {t('properties.wizard.optionsTitle')} · {t('properties.wizard.optionsCount', { count: (def.options ?? []).length })}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setOptionsOpen(true)}>
            {t('properties.wizard.editOptions')}
          </Button>
        </Stack>
      ) : null}

      <TextField
        select
        label={t('properties.wizard.group')}
        value={groups.some((g) => g.name === def.groupName) ? def.groupName : ''}
        onChange={(e) => setDef({ ...def, groupName: e.target.value })}
        InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.group" /></InputAdornment> }}
      >
        {groups.map((g) => (
          <MenuItem key={g.name} value={g.name}>{g.label}</MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1}>
        <TextField size="small" label={t('properties.wizard.newGroupLabel')} value={newGroupLabel} onChange={(e) => setNewGroupLabel(e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.group" /></InputAdornment> }} />
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={createGroup} disabled={!newGroupLabel.trim()}>
          {t('properties.wizard.createGroup')}
        </Button>
      </Stack>

      <Accordion expanded={advOpen} onChange={(_e, v) => setAdvOpen(v)} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">{t('properties.advanced.section')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            {def.type === 'number' ? (
              <Stack spacing={1.5}>
                <TextField
                  select
                  label={t('properties.advanced.numberDisplayHint')}
                  value={def.numberDisplayHint ?? ''}
                  onChange={(e) => {
                    const hint = (e.target.value || undefined) as HubSpotPropertyDef['numberDisplayHint'];
                    setDef({
                      ...def,
                      numberDisplayHint: hint,
                      ...(hint === 'currency' ? {} : { showCurrencySymbol: undefined, currencyPropertyName: undefined }),
                    });
                  }}
                  InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.advanced.fieldHelp.numberDisplayHint" /></InputAdornment> }}
                >
                  <MenuItem value="">{t('properties.advanced.none')}</MenuItem>
                  {NUMBER_DISPLAY_HINTS.map((h) => (
                    <MenuItem key={h} value={h}>{t(`properties.numberHints.${h}`, { defaultValue: h })}</MenuItem>
                  ))}
                </TextField>
                {def.numberDisplayHint === 'currency' ? (
                  <>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(def.showCurrencySymbol)}
                            onChange={(e) => setDef({ ...def, showCurrencySymbol: e.target.checked })}
                          />
                        }
                        label={t('properties.advanced.showCurrencySymbol')}
                      />
                      <FieldTooltip helpKey="properties.advanced.fieldHelp.showCurrencySymbol" />
                    </Stack>
                    <TextField
                      label={t('properties.advanced.currencyPropertyName')}
                      value={def.currencyPropertyName ?? ''}
                      onChange={(e) => setDef({ ...def, currencyPropertyName: e.target.value || undefined })}
                      InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.advanced.fieldHelp.currencyPropertyName" /></InputAdornment> }}
                    />
                  </>
                ) : null}
              </Stack>
            ) : null}

            {def.type === 'string' && (def.fieldType === 'text' || def.fieldType === 'textarea') ? (
              <TextField
                select
                label={t('properties.advanced.textDisplayHint')}
                value={def.textDisplayHint ?? ''}
                onChange={(e) =>
                  setDef({ ...def, textDisplayHint: (e.target.value || undefined) as HubSpotPropertyDef['textDisplayHint'] })
                }
                InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.advanced.fieldHelp.textDisplayHint" /></InputAdornment> }}
              >
                <MenuItem value="">{t('properties.advanced.none')}</MenuItem>
                {TEXT_DISPLAY_HINTS.map((h) => (
                  <MenuItem key={h} value={h}>{t(`properties.textHints.${h}`, { defaultValue: h })}</MenuItem>
                ))}
              </TextField>
            ) : null}

            {def.fieldType === 'calculation_equation' ? (
              <TextField
                label={t('properties.advanced.calculationFormula')}
                value={def.calculationFormula ?? ''}
                onChange={(e) => setDef({ ...def, calculationFormula: e.target.value || undefined })}
                multiline
                minRows={2}
                helperText={t('properties.advanced.calculationHelp')}
                InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.advanced.fieldHelp.calculationFormula" /></InputAdornment> }}
              />
            ) : null}

            <TextField
              select
              label={t('properties.advanced.dataSensitivity')}
              value={def.dataSensitivity ?? ''}
              onChange={(e) =>
                setDef({ ...def, dataSensitivity: (e.target.value || undefined) as HubSpotPropertyDef['dataSensitivity'] })
              }
              InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.advanced.fieldHelp.dataSensitivity" /></InputAdornment> }}
            >
              <MenuItem value="">{t('properties.advanced.none')}</MenuItem>
              {DATA_SENSITIVITIES.map((s) => (
                <MenuItem key={s} value={s}>{t(`properties.sensitivity.${s}`, { defaultValue: s })}</MenuItem>
              ))}
            </TextField>

            {editableName ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(def.hasUniqueValue)}
                      onChange={(e) => setDef({ ...def, hasUniqueValue: e.target.checked })}
                    />
                  }
                  label={t('properties.advanced.hasUniqueValue')}
                />
                <FieldTooltip helpKey="properties.advanced.fieldHelp.hasUniqueValue" />
              </Stack>
            ) : null}

            <Stack direction="row" spacing={0.5} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(def.formField)}
                    onChange={(e) => setDef({ ...def, formField: e.target.checked })}
                  />
                }
                label={t('properties.advanced.formField')}
              />
              <FieldTooltip helpKey="properties.advanced.fieldHelp.formField" />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t(entry ? 'properties.wizard.editTitle' : 'properties.wizard.title')}</DialogTitle>
      <DialogContent>
        {metaLoading ? (
          <LinearProgress aria-label={t('common.loading')} sx={{ mb: 2 }} />
        ) : null}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('properties.wizard.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            inputProps={{ 'aria-describedby': nameHelp.describedById }}
            InputProps={{ endAdornment: <InputAdornment position="end">{nameHelp.tooltip}</InputAdornment> }}
          />

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="subtitle2">{t('properties.wizard.hubspotMode')}</Typography>
            <FieldTooltip helpKey="properties.wizard.fieldHelp.hubspotMode" />
          </Stack>
          <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_e, v) => v && setMode(v)}>
            <ToggleButton value="existing">{t('properties.wizard.existing')}</ToggleButton>
            <ToggleButton value="new">{t('properties.wizard.new')}</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'existing' ? (
            <>
              <Autocomplete
                options={hsProps}
                getOptionLabel={(o) => `${o.label} (${o.hubspotName})`}
                isOptionEqualToValue={(o, v) => o.hubspotName === v.hubspotName}
                value={hsProps.find((p) => p.hubspotName === existingName) ?? null}
                onChange={(_e, v) => selectExisting(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('properties.wizard.selectProperty')}
                    placeholder={t('properties.wizard.searchProperty')}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {params.InputProps.endAdornment}
                          <FieldTooltip helpKey="properties.wizard.fieldHelp.selectProperty" />
                        </Stack>
                      ),
                    }}
                  />
                )}
                fullWidth
              />
              {existingName ? (
                <>
                  <Typography variant="caption" color="text.primary">{t('properties.wizard.editExistingHint')}</Typography>
                  {definitionEditor(false)}
                </>
              ) : null}
            </>
          ) : (
            definitionEditor(true)
          )}

          <Divider />
          <Stack direction="row" alignItems="center">
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{t('properties.entry.sources')}</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addSource} disabled={origins.length === 0}>
              {t('properties.wizard.addSource')}
            </Button>
          </Stack>

          {sources.map((s) => {
            const originObjects = origins.find((o) => o.id === s.originId)?.objects ?? [];
            return (
              <Stack key={s.id} spacing={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Autocomplete
                    size="small"
                    options={origins}
                    getOptionLabel={(o) => o.name}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={origins.find((o) => o.id === s.originId) ?? null}
                    onChange={(_e, v) => updateSource(s.id, { originId: v?.id ?? '', originObjectId: '' })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('properties.wizard.origin')}
                        placeholder={t('properties.wizard.searchOrigin')}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {params.InputProps.endAdornment}
                              <FieldTooltip helpKey="properties.wizard.fieldHelp.origin" />
                            </Stack>
                          ),
                        }}
                      />
                    )}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField select size="small" label={t('properties.wizard.sourceObject')} value={s.originObjectId} onChange={(e) => updateSource(s.id, { originObjectId: e.target.value })} sx={{ minWidth: 150 }} disabled={originObjects.length === 0} InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.sourceObject" /></InputAdornment> }}>
                    {originObjects.map((obj) => (
                      <MenuItem key={obj.id} value={obj.id}>{obj.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField size="small" label={t('properties.wizard.sourceField')} value={s.sourceField} onChange={(e) => updateSource(s.id, { sourceField: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.sourceField" /></InputAdornment> }} />
                  <TextField select size="small" label={t('properties.wizard.kind')} value={s.kind} onChange={(e) => updateSource(s.id, { kind: e.target.value as SourceFieldKind })} sx={{ minWidth: 130 }} InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.kind" /></InputAdornment> }}>
                    {KINDS.map((k) => (
                      <MenuItem key={k} value={k}>{t(`properties.kinds.${k}`)}</MenuItem>
                    ))}
                  </TextField>
                  <IconButton aria-label={t('properties.panel.delete')} onClick={() => setSources((prev) => prev.filter((x) => x.id !== s.id))}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>

                {s.kind === 'boolean' ? (
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label={t('properties.wizard.truthy')} value={s.truthy} onChange={(e) => updateSource(s.id, { truthy: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.truthy" /></InputAdornment> }} />
                    <TextField size="small" label={t('properties.wizard.falsy')} value={s.falsy} onChange={(e) => updateSource(s.id, { falsy: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.falsy" /></InputAdornment> }} />
                  </Stack>
                ) : null}

                {s.kind === 'enum' ? (
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.primary">
                      {t('properties.wizard.optionsTitle')} · {t('properties.wizard.optionsCount', { count: s.options.length })}
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setSrcOptionsId(s.id)}>
                      {t('properties.wizard.editOptions')}
                    </Button>
                  </Stack>
                ) : null}

                <TextField size="small" label={t('properties.wizard.notes')} value={s.notes} onChange={(e) => updateSource(s.id, { notes: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.notes" /></InputAdornment> }} />
              </Stack>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          {t('properties.wizard.cancel')}
        </Button>
        <BusyButton variant="contained" busy={saving} startIcon={<SaveIcon />} disabled={!canSubmit} onClick={handleSubmit}>
          {t('properties.wizard.save')}
        </BusyButton>
      </DialogActions>
    </Dialog>
    <OptionsDialog
      open={optionsOpen}
      title={`${t('properties.wizard.optionsTitle')} — ${def.label || name}`}
      options={def.options ?? []}
      onChange={(opts) => setDef((d) => ({ ...d, options: opts }))}
      onClose={() => setOptionsOpen(false)}
    />
    <SourceOptionsDialog
      open={srcOptionsId !== null}
      title={`${t('properties.wizard.optionsTitle')} — ${
        origins.find((o) => o.id === sources.find((s) => s.id === srcOptionsId)?.originId)?.name ?? ''
      }`}
      options={sources.find((s) => s.id === srcOptionsId)?.options ?? []}
      hubspotOptions={def.options ?? []}
      onChange={(opts) => srcOptionsId && updateSource(srcOptionsId, { options: opts })}
      onClose={() => setSrcOptionsId(null)}
    />
    </>
  );
}
