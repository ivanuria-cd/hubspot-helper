/**
 * Mapeo type → fieldType y catálogos de formato de la CRM Properties API (SPEC-0006 §25).
 * Compartido por EntryWizard (SPEC-0006) y ObjectWizard (SPEC-0007) para mantenerlos idénticos (§16.3).
 * Fuente: developers.hubspot.com/docs/api-reference/latest/crm/properties/create-property (2026-03).
 */
import type {
  DataSensitivity,
  HsPropertyType,
  NumberDisplayHint,
  TextDisplayHint,
} from '@shared/types/properties';

export const HS_TYPES: HsPropertyType[] = [
  'string',
  'number',
  'date',
  'datetime',
  'enumeration',
  'bool',
];

export const FIELD_TYPES_BY_TYPE: Record<string, string[]> = {
  string: ['text', 'textarea', 'phonenumber', 'html', 'file', 'calculation_equation'],
  number: ['number', 'calculation_equation'],
  date: ['date'],
  datetime: ['date'],
  enumeration: ['select', 'radio', 'checkbox', 'booleancheckbox', 'calculation_equation'],
  bool: ['booleancheckbox', 'calculation_equation'],
};

export function fieldTypesFor(type: string): string[] {
  return FIELD_TYPES_BY_TYPE[type] ?? ['text'];
}

export function defaultFieldType(type: string): string {
  return FIELD_TYPES_BY_TYPE[type]?.[0] ?? 'text';
}

export const NUMBER_DISPLAY_HINTS: NumberDisplayHint[] = [
  'unformatted',
  'formatted',
  'currency',
  'percentage',
  'duration',
  'probability',
];

export const TEXT_DISPLAY_HINTS: TextDisplayHint[] = [
  'unformatted_single_line',
  'multi_line',
  'email',
  'phone_number',
  'domain_name',
  'ip_address',
  'physical_address',
  'postal_code',
];

export const DATA_SENSITIVITIES: DataSensitivity[] = [
  'non_sensitive',
  'sensitive',
  'highly_sensitive',
];
