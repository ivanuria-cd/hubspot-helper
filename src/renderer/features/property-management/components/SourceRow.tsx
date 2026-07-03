import {
  Autocomplete,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { FieldTooltip } from '@shared/components/feedback';
import type { DataOrigin, SourceEnumOption, SourceFieldKind } from '@shared/types/properties';

const KINDS: SourceFieldKind[] = ['number', 'text', 'boolean', 'enum', 'memo'];

/** Borrador de origen editado en el asistente; los ids con prefijo `tmp-` marcan filas nuevas. */
export interface DraftSource {
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

interface SourceRowProps {
  source: DraftSource;
  origins: DataOrigin[];
  onUpdate: (patch: Partial<DraftSource>) => void;
  onRemove: () => void;
  onEditOptions: () => void;
}

/** Fila de un origen de datos dentro del asistente de entradas (SPEC-0006). */
export function SourceRow({ source: s, origins, onUpdate, onRemove, onEditOptions }: SourceRowProps): JSX.Element {
  const { t } = useTranslation('common');
  const originObjects = origins.find((o) => o.id === s.originId)?.objects ?? [];
  return (
    <Stack spacing={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Autocomplete
          size="small"
          options={origins}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={origins.find((o) => o.id === s.originId) ?? null}
          onChange={(_e, v) => onUpdate({ originId: v?.id ?? '', originObjectId: '' })}
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
        <TextField select size="small" label={t('properties.wizard.sourceObject')} value={s.originObjectId} onChange={(e) => onUpdate({ originObjectId: e.target.value })} sx={{ minWidth: 150 }} disabled={originObjects.length === 0} InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.sourceObject" /></InputAdornment> }}>
          {originObjects.map((obj) => (
            <MenuItem key={obj.id} value={obj.id}>{obj.name}</MenuItem>
          ))}
        </TextField>
        <TextField size="small" label={t('properties.wizard.sourceField')} value={s.sourceField} onChange={(e) => onUpdate({ sourceField: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.sourceField" /></InputAdornment> }} />
        <TextField select size="small" label={t('properties.wizard.kind')} value={s.kind} onChange={(e) => onUpdate({ kind: e.target.value as SourceFieldKind })} sx={{ minWidth: 130 }} InputProps={{ endAdornment: <InputAdornment position="end" sx={{ mr: 2 }}><FieldTooltip helpKey="properties.wizard.fieldHelp.kind" /></InputAdornment> }}>
          {KINDS.map((k) => (
            <MenuItem key={k} value={k}>{t(`properties.kinds.${k}`)}</MenuItem>
          ))}
        </TextField>
        <IconButton aria-label={t('properties.panel.delete')} onClick={onRemove}>
          <DeleteIcon />
        </IconButton>
      </Stack>

      {s.kind === 'boolean' ? (
        <Stack direction="row" spacing={1}>
          <TextField size="small" label={t('properties.wizard.truthy')} value={s.truthy} onChange={(e) => onUpdate({ truthy: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.truthy" /></InputAdornment> }} />
          <TextField size="small" label={t('properties.wizard.falsy')} value={s.falsy} onChange={(e) => onUpdate({ falsy: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.falsy" /></InputAdornment> }} />
        </Stack>
      ) : null}

      {s.kind === 'enum' ? (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.primary">
            {t('properties.wizard.optionsTitle')} · {t('properties.wizard.optionsCount', { count: s.options.length })}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={onEditOptions}>
            {t('properties.wizard.editOptions')}
          </Button>
        </Stack>
      ) : null}

      <TextField size="small" label={t('properties.wizard.notes')} value={s.notes} onChange={(e) => onUpdate({ notes: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><FieldTooltip helpKey="properties.wizard.fieldHelp.notes" /></InputAdornment> }} />
    </Stack>
  );
}
