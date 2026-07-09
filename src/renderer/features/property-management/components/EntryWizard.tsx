import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { OptionsDialog } from './OptionsDialog';
import { SourceOptionsDialog } from './SourceOptionsDialog';
import { PropertyDefinitionEditor } from './PropertyDefinitionEditor';
import { SourceRow } from './SourceRow';
import type { DraftSource } from './SourceRow';
import {
  BusyButton,
  FieldTooltip,
  LoadingState,
  useFieldHelp,
  useSnackbar,
} from '@shared/components/feedback';
import { useTranslation } from 'react-i18next';
import type {
  DataOrigin,
  EntrySource,
  HubSpotGroup,
  HubSpotPropertyDef,
  PropertyEntry,
} from '@shared/types/properties';

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
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const EMPTY_DEF: HubSpotPropertyDef = {
  hubspotName: '',
  label: '',
  type: 'string',
  fieldType: 'text',
  groupName: '',
};

interface EntryWizardProps {
  open: boolean;
  projectId: string;
  objectType: string;
  entry?: PropertyEntry | null;
  origins: DataOrigin[];
  onClose: () => void;
  onSubmit: (
    entry: Omit<PropertyEntry, 'id' | 'hubspotStatus' | 'pendingChanges'> & { id?: string },
  ) => Promise<void>;
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
    // SPEC-0006 §51: cancelación de las cargas en curso; una respuesta obsoleta
    // (reapertura con otro objectType) no debe pisar el estado del render vigente.
    let cancelled = false;
    setName(entry?.name ?? '');
    setMode(entry?.hubspotProperty.mode ?? 'existing');
    setExistingName(
      entry?.hubspotProperty.mode === 'existing' ? entry.hubspotProperty.hubspotName : '',
    );
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
        window.api
          .hubspotPropertiesList({ projectId, objectType })
          .then((list) => {
            if (!cancelled) setHsProps(list);
          })
          .catch(() => {
            if (!cancelled) setHsProps([]);
          }),
      );
    }
    if (typeof window.api.groupsList === 'function') {
      tasks.push(
        window.api
          .groupsList({ projectId, objectType })
          .then((list) => {
            if (cancelled) return;
            setGroups(list);
            setDef((d) =>
              d.groupName || list.length === 0 ? d : { ...d, groupName: list[0].name },
            );
          })
          .catch(() => {
            if (!cancelled) setGroups([]);
          }),
      );
    }
    void Promise.allSettled(tasks).then(() => {
      if (!cancelled) setMetaLoading(false);
    });
    return () => {
      cancelled = true;
    };
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
      {
        id: `tmp-${crypto.randomUUID()}`,
        originId: origins[0]?.id ?? '',
        originObjectId: '',
        sourceField: '',
        kind: 'text',
        truthy: 'true',
        falsy: 'false',
        options: [],
        notes: '',
      },
    ]);
  };

  const createGroup = async (): Promise<void> => {
    const label = newGroupLabel.trim();
    if (!label || typeof window.api.groupsCreate !== 'function') return;
    try {
      const created = await window.api.groupsCreate({
        projectId,
        objectType,
        name: slugify(label),
        label,
      });
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
  const canSubmit =
    name.trim() &&
    (mode === 'existing' ? existingName : def.hubspotName.trim() && def.label.trim());

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
            ? {
                mode: 'existing',
                hubspotName: existingName,
                definition: { ...cleanDef, hubspotName: existingName },
              }
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

  const definitionEditorProps = {
    def,
    onDefChange: setDef,
    groups,
    advOpen,
    onAdvOpenChange: setAdvOpen,
    newGroupLabel,
    onNewGroupLabelChange: setNewGroupLabel,
    onCreateGroup: createGroup,
    onEditOptions: () => setOptionsOpen(true),
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {t(entry ? 'properties.wizard.editTitle' : 'properties.wizard.title')}
        </DialogTitle>
        <DialogContent>
          {metaLoading ? <LoadingState variant="list" rows={4} /> : null}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('properties.wizard.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              inputProps={{ 'aria-describedby': nameHelp.describedById }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{nameHelp.tooltip}</InputAdornment>,
              }}
            />

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="subtitle2">{t('properties.wizard.hubspotMode')}</Typography>
              <FieldTooltip helpKey="properties.wizard.fieldHelp.hubspotMode" />
            </Stack>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_e, v) => v && setMode(v)}
            >
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
                    <Typography variant="caption" color="text.primary">
                      {t('properties.wizard.editExistingHint')}
                    </Typography>
                    <PropertyDefinitionEditor editableName={false} {...definitionEditorProps} />
                  </>
                ) : null}
              </>
            ) : (
              <PropertyDefinitionEditor editableName {...definitionEditorProps} />
            )}

            <Divider />
            <Stack direction="row" alignItems="center">
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {t('properties.entry.sources')}
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addSource}
                disabled={origins.length === 0}
              >
                {t('properties.wizard.addSource')}
              </Button>
            </Stack>

            {sources.map((s) => (
              <SourceRow
                key={s.id}
                source={s}
                origins={origins}
                onUpdate={(patch) => updateSource(s.id, patch)}
                onRemove={() => setSources((prev) => prev.filter((x) => x.id !== s.id))}
                onEditOptions={() => setSrcOptionsId(s.id)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<CloseIcon />} onClick={onClose}>
            {t('properties.wizard.cancel')}
          </Button>
          <BusyButton
            variant="contained"
            busy={saving}
            startIcon={<SaveIcon />}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
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
          origins.find((o) => o.id === sources.find((s) => s.id === srcOptionsId)?.originId)
            ?.name ?? ''
        }`}
        options={sources.find((s) => s.id === srcOptionsId)?.options ?? []}
        hubspotOptions={def.options ?? []}
        onChange={(opts) => srcOptionsId && updateSource(srcOptionsId, { options: opts })}
        onClose={() => setSrcOptionsId(null)}
      />
    </>
  );
}
