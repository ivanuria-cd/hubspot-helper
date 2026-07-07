/**
 * Catalogo de tipos user-friendly -> configuracion(es) de HubSpot (SPEC-0016 D6).
 * Se apoya en FIELD_TYPES_BY_TYPE (SPEC-0006 16.3) para no divergir del mapeo type/fieldType.
 */
import { FIELD_TYPES_BY_TYPE } from '@shared/constants/hubspotPropertyTypes';
import type {
  HubSpotFieldConfig,
  UserFriendlyFieldType,
  UserFriendlyFieldTypeKey,
} from '@shared/types/planning';

export const USER_FRIENDLY_FIELD_TYPES: UserFriendlyFieldType[] = [
  { key: 'text', configs: [{ type: 'string', fieldType: 'text' }] },
  { key: 'long_text', configs: [{ type: 'string', fieldType: 'textarea' }] },
  { key: 'rich_text', configs: [{ type: 'string', fieldType: 'html' }] },
  { key: 'number', configs: [{ type: 'number', fieldType: 'number' }] },
  {
    key: 'currency',
    configs: [
      {
        type: 'number',
        fieldType: 'number',
        numberDisplayHint: 'currency',
        showCurrencySymbol: true,
      },
    ],
  },
  {
    key: 'percentage',
    configs: [{ type: 'number', fieldType: 'number', numberDisplayHint: 'percentage' }],
  },
  {
    key: 'duration',
    configs: [{ type: 'number', fieldType: 'number', numberDisplayHint: 'duration' }],
  },
  { key: 'phone', configs: [{ type: 'string', fieldType: 'phonenumber' }] },
  { key: 'email', configs: [{ type: 'string', fieldType: 'text', textDisplayHint: 'email' }] },
  { key: 'date', configs: [{ type: 'date', fieldType: 'date' }] },
  { key: 'datetime', configs: [{ type: 'datetime', fieldType: 'date' }] },
  {
    key: 'choice',
    configs: [
      { type: 'enumeration', fieldType: 'select' },
      { type: 'enumeration', fieldType: 'radio' },
      { type: 'enumeration', fieldType: 'checkbox' },
    ],
  },
  { key: 'dropdown', configs: [{ type: 'enumeration', fieldType: 'select' }] },
  { key: 'radio', configs: [{ type: 'enumeration', fieldType: 'radio' }] },
  { key: 'multiple_checkboxes', configs: [{ type: 'enumeration', fieldType: 'checkbox' }] },
  { key: 'yes_no', configs: [{ type: 'bool', fieldType: 'booleancheckbox' }] },
  { key: 'file', configs: [{ type: 'string', fieldType: 'file' }] },
  {
    key: 'calculation',
    configs: [
      { type: 'number', fieldType: 'calculation_equation' },
      { type: 'string', fieldType: 'calculation_equation' },
      { type: 'enumeration', fieldType: 'calculation_equation' },
    ],
  },
];

const BY_KEY: Record<string, UserFriendlyFieldType> = Object.fromEntries(
  USER_FRIENDLY_FIELD_TYPES.map((t) => [t.key, t]),
);

export function userFriendlyFieldType(
  key: UserFriendlyFieldTypeKey,
): UserFriendlyFieldType | undefined {
  return BY_KEY[key];
}

export function configsFor(key: UserFriendlyFieldTypeKey): HubSpotFieldConfig[] {
  return BY_KEY[key]?.configs ?? [];
}

export function isAmbiguous(key: UserFriendlyFieldTypeKey): boolean {
  return configsFor(key).length > 1;
}

/** Resuelve automaticamente solo con una unica configuracion; si no, devuelve undefined (necesita accion). */
export function resolveUserFriendlyType(
  key: UserFriendlyFieldTypeKey,
): HubSpotFieldConfig | undefined {
  const configs = configsFor(key);
  return configs.length === 1 ? configs[0] : undefined;
}

/** true si (type, fieldType) es coherente con FIELD_TYPES_BY_TYPE (SPEC-0006 16.3). */
export function isConfigConsistent(config: HubSpotFieldConfig): boolean {
  return (FIELD_TYPES_BY_TYPE[config.type] ?? []).includes(config.fieldType);
}
