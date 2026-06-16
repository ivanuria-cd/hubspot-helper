import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type {
  DataOrigin,
  EntrySource,
  HsPropertyOption,
  HsPropertyType,
  HubSpotGroup,
  HubSpotPropertyDef,
  PropertyEntry,
  SourceEnumOption,
  SourceFieldKind,
} from '@shared/types/properties';

const KINDS: SourceFieldKind[] = ['number', 'text', 'boolean', 'enum', 'memo'];
const HS_TYPES: HsPropertyType[] = ['string', 'number', 'date', 'datetime', 'enumeration', 'bool'];

const FIELD_TYPES_BY_TYPE: Record<string, string[]> = {
  string: ['text', 'textarea', 'phonenumber', 'html', 'file'],
  number: ['number'],
  date: ['date'],
  datetime: ['date'],
  enumeration: ['select', 'radio', 'checkbox', 'booleancheckbox'],
  bool: ['booleancheckbox'],
};

function defaultFieldType(type: string): string {
  return FIELD_TYPES_BY_TYPE[type]?.[0] ?? 'text';
}

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

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
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingName, setExistingName] = useState('');
  const [def, setDef] = useState<HubSpotPropertyDef>(EMPTY_DEF);
  const [hsProps, setHsProps] = useState<HubSpotPropertyDef[]>([]);
  const [groups, setGroups] = useState<HubSpotGroup[]>([]);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [sources, setSources] = useState<DraftSource[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSep, setBulkSep] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(entry?.name ?? '');
    setMode(entry?.hubspotProperty.mode ?? 'existing');
    setExistingName(entry?.hubspotProperty.mode === 'existing' ? entry.hubspotProperty.hubspotName : '');
    if (entry?.hubspotProperty.mode === 'new') setDef(entry.hubspotProperty.definition);
    else if (entry?.hubspotProperty.mode === 'existing' && entry.hubspotProperty.definition)
      setDef(entry.hubspotProperty.definition);
    else setDef(EMPTY_DEF);
    setSources((entry?.sources ?? []).map(toDraft));
    setNewGroupLabel('');
    // Limpia datos del objeto anterior para no mostrar grupos/propiedades obsoletos.
    setHsProps([]);
    setGroups([]);
    if (typeof window.api.hubspotPropertiesList === 'function') {
      void window.api.hubspotPropertiesList({ projectId, objectType }).then(setHsProps).catch(() => setHsProps([]));
    }
    if (typeof window.api.groupsList === 'function') {
      void window.api
        .groupsList({ projectId, objectType })
        .then((list) => {
          setGroups(list);
          setDef((d) => (d.groupName || list.length === 0 ? d : { ...d, groupName: list[0].name }));
        })
        .catch(() => setGroups([]));
    }
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
    const created = await window.api.groupsCreate({ projectId, objectType, name: slugify(label), label });
    const list = await window.api.groupsList({ projectId, objectType });
    setGroups(list);
    setDef((d) => ({ ...d, groupName: created.name }));
    setNewGroupLabel('');
  };

  const updateOption = (idx: number, patch: Partial<HsPropertyOption>): void => {
    setDef((d) => ({ ...d, options: (d.options ?? []).map((o, i) => (i === idx ? { ...o, ...patch } : o)) }));
  };

  const applyBulkOptions = (): void => {
    const parsed = parseBulkOptions(bulkText, bulkSep);
    if (parsed.length > 0) {
      setDef((d) => {
        const merged = [...(d.options ?? []), ...parsed.map((o) => ({ ...o, displayOrder: 0, hidden: false }))].map(
          (o, i) => ({ ...o, displayOrder: i }),
        );
        return { ...d, options: merged };
      });
    }
    setBulkText('');
    setBulkSep('');
    setBulkOpen(false);
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
  };

  const fieldTypeOptions = FIELD_TYPES_BY_TYPE[def.type] ?? ['text'];

  const definitionEditor = (editableName: boolean): JSX.Element => (
    <Stack spacing={1.5}>
      {editableName ? (
        <TextField label={t('properties.newProp.hubspotName')} value={def.hubspotName} onChange={(e) => setDef({ ...def, hubspotName: e.target.value })} />
      ) : null}
      <TextField label={t('properties.newProp.label')} value={def.label} onChange={(e) => setDef({ ...def, label: e.target.value })} />
      <TextField
        select
        label={t('properties.newProp.type')}
        value={def.type}
        onChange={(e) => {
          const type = e.target.value as HsPropertyType;
          setDef({ ...def, type, fieldType: defaultFieldType(type) });
        }}
      >
        {HS_TYPES.map((tp) => (
          <MenuItem key={tp} value={tp}>{tp}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={t('properties.newProp.fieldType')}
        value={fieldTypeOptions.includes(def.fieldType) ? def.fieldType : fieldTypeOptions[0]}
        onChange={(e) => setDef({ ...def, fieldType: e.target.value })}
      >
        {fieldTypeOptions.map((ft) => (
          <MenuItem key={ft} value={ft}>{t(`properties.fieldTypes.${ft}`, { defaultValue: ft })}</MenuItem>
        ))}
      </TextField>

      {def.type === 'enumeration' ? (
        <Stack spacing={1} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.primary">{t('properties.wizard.optionsTitle')}</Typography>
          {(def.options ?? []).map((opt, idx) => (
            <Stack key={idx} direction="row" spacing={1} alignItems="center">
              <TextField size="small" label={t('properties.wizard.optionLabel')} value={opt.label} onChange={(e) => updateOption(idx, { label: e.target.value })} />
              <TextField size="small" label={t('properties.wizard.optionValue')} value={opt.value} onChange={(e) => updateOption(idx, { value: e.target.value })} />
              <IconButton size="small" aria-label={t('properties.panel.delete')} onClick={() => setDef((d) => ({ ...d, options: (d.options ?? []).filter((_, i) => i !== idx) }))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
            <Button size="small" variant="text" onClick={() => setBulkOpen((o) => !o)}>
              {t('properties.wizard.pasteOptions')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() =>
                setDef((d) => ({
                  ...d,
                  options: [...(d.options ?? []), { label: '', value: '', displayOrder: (d.options ?? []).length, hidden: false }],
                }))
              }
            >
              {t('properties.wizard.addPropOption')}
            </Button>
          </Stack>
          {bulkOpen ? (
            <Stack spacing={1}>
              <TextField size="small" label={t('properties.wizard.separator')} value={bulkSep} onChange={(e) => setBulkSep(e.target.value)} sx={{ maxWidth: 220 }} />
              <TextField size="small" label={t('properties.wizard.bulkList')} value={bulkText} onChange={(e) => setBulkText(e.target.value)} multiline minRows={3} helperText={t('properties.wizard.pasteHint')} />
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={applyBulkOptions} disabled={!bulkText.trim()}>
                  {t('properties.wizard.bulkApply')}
                </Button>
                <Button size="small" onClick={() => setBulkOpen(false)}>
                  {t('properties.wizard.cancel')}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      <TextField
        select
        label={t('properties.wizard.group')}
        value={groups.some((g) => g.name === def.groupName) ? def.groupName : ''}
        onChange={(e) => setDef({ ...def, groupName: e.target.value })}
      >
        {groups.map((g) => (
          <MenuItem key={g.name} value={g.name}>{g.label}</MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1}>
        <TextField size="small" label={t('properties.wizard.newGroupLabel')} value={newGroupLabel} onChange={(e) => setNewGroupLabel(e.target.value)} />
        <Button size="small" variant="outlined" onClick={createGroup} disabled={!newGroupLabel.trim()}>
          {t('properties.wizard.createGroup')}
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t(entry ? 'properties.wizard.editTitle' : 'properties.wizard.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('properties.wizard.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />

          <Typography variant="subtitle2">{t('properties.wizard.hubspotMode')}</Typography>
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
                  <TextField {...params} label={t('properties.wizard.selectProperty')} placeholder={t('properties.wizard.searchProperty')} />
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
            <Button size="small" onClick={addSource} disabled={origins.length === 0}>
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
                      <TextField {...params} label={t('properties.wizard.origin')} placeholder={t('properties.wizard.searchOrigin')} />
                    )}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField select size="small" label={t('properties.wizard.sourceObject')} value={s.originObjectId} onChange={(e) => updateSource(s.id, { originObjectId: e.target.value })} sx={{ minWidth: 150 }} disabled={originObjects.length === 0}>
                    {originObjects.map((obj) => (
                      <MenuItem key={obj.id} value={obj.id}>{obj.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField size="small" label={t('properties.wizard.sourceField')} value={s.sourceField} onChange={(e) => updateSource(s.id, { sourceField: e.target.value })} />
                  <TextField select size="small" label={t('properties.wizard.kind')} value={s.kind} onChange={(e) => updateSource(s.id, { kind: e.target.value as SourceFieldKind })} sx={{ minWidth: 130 }}>
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
                    <TextField size="small" label={t('properties.wizard.truthy')} value={s.truthy} onChange={(e) => updateSource(s.id, { truthy: e.target.value })} />
                    <TextField size="small" label={t('properties.wizard.falsy')} value={s.falsy} onChange={(e) => updateSource(s.id, { falsy: e.target.value })} />
                  </Stack>
                ) : null}

                {s.kind === 'enum' ? (
                  <Stack spacing={1}>
                    {s.options.map((opt, idx) => (
                      <Stack key={idx} direction="row" spacing={1} alignItems="center">
                        <TextField size="small" label={t('properties.wizard.sourceValue')} value={opt.sourceValue} onChange={(e) => updateSource(s.id, { options: s.options.map((o, i) => (i === idx ? { ...o, sourceValue: e.target.value } : o)) })} />
                        <Typography>→</Typography>
                        {(def.options ?? []).length > 0 ? (
                          <TextField select size="small" label={t('properties.wizard.hubspotValue')} value={opt.hubspotValue ?? ''} onChange={(e) => updateSource(s.id, { options: s.options.map((o, i) => (i === idx ? { ...o, hubspotValue: e.target.value } : o)) })} sx={{ minWidth: 160 }}>
                            {(def.options ?? []).map((d) => (
                              <MenuItem key={d.value} value={d.value}>{d.label || d.value}</MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <TextField size="small" label={t('properties.wizard.hubspotValue')} value={opt.hubspotValue ?? ''} onChange={(e) => updateSource(s.id, { options: s.options.map((o, i) => (i === idx ? { ...o, hubspotValue: e.target.value } : o)) })} />
                        )}
                        <IconButton size="small" aria-label={t('properties.panel.delete')} onClick={() => updateSource(s.id, { options: s.options.filter((_, i) => i !== idx) })}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                    <Button size="small" variant="text" onClick={() => updateSource(s.id, { options: [...s.options, { sourceValue: '', hubspotValue: '' }] })}>
                      {t('properties.wizard.addOption')}
                    </Button>
                  </Stack>
                ) : null}

                <TextField size="small" label={t('properties.wizard.notes')} value={s.notes} onChange={(e) => updateSource(s.id, { notes: e.target.value })} />
              </Stack>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('properties.wizard.cancel')}</Button>
        <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>
          {t('properties.wizard.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
