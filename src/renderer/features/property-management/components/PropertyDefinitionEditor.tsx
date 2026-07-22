import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { FieldTooltip } from '@shared/components/feedback';
import type { HsPropertyType, HubSpotGroup, HubSpotPropertyDef } from '@shared/types/properties';
import {
  DATA_SENSITIVITIES,
  FIELD_TYPES_BY_TYPE,
  HS_TYPES,
  NUMBER_DISPLAY_HINTS,
  TEXT_DISPLAY_HINTS,
  defaultFieldType,
} from '@shared/constants/hubspot-property-types';

interface PropertyDefinitionEditorProps {
  /** `true` en modo «nueva»: permite editar el nombre técnico y el valor único. */
  editableName: boolean;
  def: HubSpotPropertyDef;
  onDefChange: (def: HubSpotPropertyDef) => void;
  groups: HubSpotGroup[];
  advOpen: boolean;
  onAdvOpenChange: (open: boolean) => void;
  newGroupLabel: string;
  onNewGroupLabelChange: (label: string) => void;
  onCreateGroup: () => void;
  /** Abre el diálogo de opciones de enumeración (montado en el asistente). */
  onEditOptions: () => void;
}

/** Editor de la definición de propiedad HubSpot del asistente de entradas (SPEC-0006). */
export function PropertyDefinitionEditor({
  editableName,
  def,
  onDefChange,
  groups,
  advOpen,
  onAdvOpenChange,
  newGroupLabel,
  onNewGroupLabelChange,
  onCreateGroup,
  onEditOptions,
}: PropertyDefinitionEditorProps): JSX.Element {
  const { t } = useTranslation('common');
  const fieldTypeOptions = FIELD_TYPES_BY_TYPE[def.type] ?? ['text'];

  return (
    <Stack spacing={1.5}>
      {editableName ? (
        <TextField
          label={t('properties.newProp.hubspotName')}
          value={def.hubspotName}
          onChange={(e) => onDefChange({ ...def, hubspotName: e.target.value })}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <FieldTooltip helpKey="properties.wizard.fieldHelp.hubspotName" />
              </InputAdornment>
            ),
          }}
        />
      ) : null}
      <TextField
        label={t('properties.newProp.label')}
        value={def.label}
        onChange={(e) => onDefChange({ ...def, label: e.target.value })}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <FieldTooltip helpKey="properties.wizard.fieldHelp.label" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        select
        label={t('properties.newProp.type')}
        value={def.type}
        onChange={(e) => {
          const type = e.target.value as HsPropertyType;
          onDefChange({ ...def, type, fieldType: defaultFieldType(type) });
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: 2 }}>
              <FieldTooltip helpKey="properties.wizard.fieldHelp.type" />
            </InputAdornment>
          ),
        }}
      >
        {HS_TYPES.map((tp) => (
          <MenuItem key={tp} value={tp}>
            {tp}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={t('properties.newProp.fieldType')}
        value={fieldTypeOptions.includes(def.fieldType) ? def.fieldType : fieldTypeOptions[0]}
        onChange={(e) => {
          onDefChange({ ...def, fieldType: e.target.value });
          if (e.target.value === 'calculation_equation') onAdvOpenChange(true);
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: 2 }}>
              <FieldTooltip helpKey="properties.wizard.fieldHelp.fieldType" />
            </InputAdornment>
          ),
        }}
      >
        {fieldTypeOptions.map((ft) => (
          <MenuItem key={ft} value={ft}>
            {t(`properties.fieldTypes.${ft}`, { defaultValue: ft })}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={t('properties.advanced.description')}
        value={def.description ?? ''}
        onChange={(e) => onDefChange({ ...def, description: e.target.value || undefined })}
        multiline
        minRows={2}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <FieldTooltip helpKey="properties.advanced.fieldHelp.description" />
            </InputAdornment>
          ),
        }}
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
            {t('properties.wizard.optionsTitle')} ·{' '}
            {t('properties.wizard.optionsCount', { count: (def.options ?? []).length })}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={onEditOptions}>
            {t('properties.wizard.editOptions')}
          </Button>
        </Stack>
      ) : null}

      <TextField
        select
        label={t('properties.wizard.group')}
        value={groups.some((g) => g.name === def.groupName) ? def.groupName : ''}
        onChange={(e) => onDefChange({ ...def, groupName: e.target.value })}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: 2 }}>
              <FieldTooltip helpKey="properties.wizard.fieldHelp.group" />
            </InputAdornment>
          ),
        }}
      >
        {groups.map((g) => (
          <MenuItem key={g.name} value={g.name}>
            {g.label}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label={t('properties.wizard.newGroupLabel')}
          value={newGroupLabel}
          onChange={(e) => onNewGroupLabelChange(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <FieldTooltip helpKey="properties.wizard.fieldHelp.group" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onCreateGroup}
          disabled={!newGroupLabel.trim()}
        >
          {t('properties.wizard.createGroup')}
        </Button>
      </Stack>

      <Accordion expanded={advOpen} onChange={(_e, v) => onAdvOpenChange(v)} disableGutters>
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
                    const hint = (e.target.value ||
                      undefined) as HubSpotPropertyDef['numberDisplayHint'];
                    onDefChange({
                      ...def,
                      numberDisplayHint: hint,
                      ...(hint === 'currency'
                        ? {}
                        : { showCurrencySymbol: undefined, currencyPropertyName: undefined }),
                    });
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end" sx={{ mr: 2 }}>
                        <FieldTooltip helpKey="properties.advanced.fieldHelp.numberDisplayHint" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="">{t('properties.advanced.none')}</MenuItem>
                  {NUMBER_DISPLAY_HINTS.map((h) => (
                    <MenuItem key={h} value={h}>
                      {t(`properties.numberHints.${h}`, { defaultValue: h })}
                    </MenuItem>
                  ))}
                </TextField>
                {def.numberDisplayHint === 'currency' ? (
                  <>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(def.showCurrencySymbol)}
                            onChange={(e) =>
                              onDefChange({ ...def, showCurrencySymbol: e.target.checked })
                            }
                          />
                        }
                        label={t('properties.advanced.showCurrencySymbol')}
                      />
                      <FieldTooltip helpKey="properties.advanced.fieldHelp.showCurrencySymbol" />
                    </Stack>
                    <TextField
                      label={t('properties.advanced.currencyPropertyName')}
                      value={def.currencyPropertyName ?? ''}
                      onChange={(e) =>
                        onDefChange({ ...def, currencyPropertyName: e.target.value || undefined })
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <FieldTooltip helpKey="properties.advanced.fieldHelp.currencyPropertyName" />
                          </InputAdornment>
                        ),
                      }}
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
                  onDefChange({
                    ...def,
                    textDisplayHint: (e.target.value ||
                      undefined) as HubSpotPropertyDef['textDisplayHint'],
                  })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ mr: 2 }}>
                      <FieldTooltip helpKey="properties.advanced.fieldHelp.textDisplayHint" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">{t('properties.advanced.none')}</MenuItem>
                {TEXT_DISPLAY_HINTS.map((h) => (
                  <MenuItem key={h} value={h}>
                    {t(`properties.textHints.${h}`, { defaultValue: h })}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            {def.fieldType === 'calculation_equation' ? (
              <TextField
                label={t('properties.advanced.calculationFormula')}
                value={def.calculationFormula ?? ''}
                onChange={(e) =>
                  onDefChange({ ...def, calculationFormula: e.target.value || undefined })
                }
                multiline
                minRows={2}
                helperText={t('properties.advanced.calculationHelp')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <FieldTooltip helpKey="properties.advanced.fieldHelp.calculationFormula" />
                    </InputAdornment>
                  ),
                }}
              />
            ) : null}

            <TextField
              select
              label={t('properties.advanced.dataSensitivity')}
              value={def.dataSensitivity ?? ''}
              onChange={(e) =>
                onDefChange({
                  ...def,
                  dataSensitivity: (e.target.value ||
                    undefined) as HubSpotPropertyDef['dataSensitivity'],
                })
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end" sx={{ mr: 2 }}>
                    <FieldTooltip helpKey="properties.advanced.fieldHelp.dataSensitivity" />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="">{t('properties.advanced.none')}</MenuItem>
              {DATA_SENSITIVITIES.map((s) => (
                <MenuItem key={s} value={s}>
                  {t(`properties.sensitivity.${s}`, { defaultValue: s })}
                </MenuItem>
              ))}
            </TextField>

            {editableName ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(def.hasUniqueValue)}
                      onChange={(e) => onDefChange({ ...def, hasUniqueValue: e.target.checked })}
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
                    onChange={(e) => onDefChange({ ...def, formField: e.target.checked })}
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
}
