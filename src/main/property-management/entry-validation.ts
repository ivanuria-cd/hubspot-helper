/**
 * Validación de la forma del `entry` de `entries_upsert` (SPEC-0006 §39). Acumula TODOS los
 * problemas (no solo el primero) y cada uno lleva `code`, `field`, `message` y un `example` de la
 * forma correcta, para que el cliente (UI/MCP/LLM) lo corrija en una sola pasada.
 */
import type { EntryUpsertInput } from '@shared/types/properties';

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  example?: unknown;
}

export class EntryValidationError extends Error {
  readonly code = 'ENTRY_VALIDATION';
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(`entry inválido — ${issues.map((i) => `${i.field}: ${i.message}`).join('; ')}`);
    this.name = 'EntryValidationError';
    this.issues = issues;
  }
}

const HP_EXAMPLE = {
  existing: { mode: 'existing', hubspotName: 'firstname' },
  new: {
    mode: 'new',
    definition: {
      hubspotName: 'lopd_estado',
      label: 'LOPD - Estado',
      type: 'string',
      fieldType: 'text',
      groupName: 'datos_firma_lopd',
    },
  },
};
const SOURCE_EXAMPLE = [
  { originId: '<originId>', sourceField: 'signature_id', definition: { kind: 'text' } },
];

/** Longitud máxima del nombre interno de una propiedad en HubSpot (SPEC-0006 §44). */
export const HUBSPOT_PROPERTY_NAME_MAX = 100;
const HUBSPOT_PROPERTY_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Valida longitud y patrón del nombre interno (`hubspotName`) contra las reglas de HubSpot (§44). */
function pushNameIssues(name: string, field: string, issues: ValidationIssue[]): void {
  if (name.length > HUBSPOT_PROPERTY_NAME_MAX)
    issues.push({
      code: 'HUBSPOTNAME_TOO_LONG',
      field,
      message: `supera el máximo de ${HUBSPOT_PROPERTY_NAME_MAX} caracteres de HubSpot (${name.length}); acórtalo en origen, no lo truncues a ciegas (genera colisiones).`,
    });
  if (!HUBSPOT_PROPERTY_NAME_PATTERN.test(name))
    issues.push({
      code: 'HUBSPOTNAME_PATTERN',
      field,
      message: 'solo minúsculas, números y «_», empezando por letra.',
      example: 'pd_id',
    });
}

export function validateEntryInput(entry: EntryUpsertInput['entry']): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const e = entry as unknown as Record<string, unknown>;
  if (!e || typeof e !== 'object' || Array.isArray(e)) {
    return [{ code: 'ENTRY_NOT_OBJECT', field: 'entry', message: 'debe ser un objeto.' }];
  }

  if (typeof e.objectType !== 'string' || !e.objectType.trim())
    issues.push({ code: 'OBJECT_TYPE_REQUIRED', field: 'objectType', message: 'es obligatorio (string).' });
  if (typeof e.name !== 'string' || !e.name.trim())
    issues.push({ code: 'NAME_REQUIRED', field: 'name', message: 'es obligatorio (string).' });

  const ref = e.hubspotProperty as Record<string, unknown> | undefined;
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
    issues.push({
      code: 'HUBSPOT_PROPERTY_NOT_OBJECT',
      field: 'hubspotProperty',
      message: "debe ser un objeto { mode:'existing'|'new', … }, no un string.",
      example: HP_EXAMPLE,
    });
  } else if (ref.mode === 'existing') {
    if (typeof ref.hubspotName !== 'string' || !ref.hubspotName.trim())
      issues.push({
        code: 'EXISTING_HUBSPOTNAME_REQUIRED',
        field: 'hubspotProperty.hubspotName',
        message: "obligatorio cuando mode='existing' (string).",
        example: HP_EXAMPLE.existing,
      });
    else pushNameIssues(ref.hubspotName.trim(), 'hubspotProperty.hubspotName', issues);
  } else if (ref.mode === 'new') {
    const def = ref.definition as Record<string, unknown> | undefined;
    if (!def || typeof def !== 'object') {
      issues.push({
        code: 'NEW_DEFINITION_REQUIRED',
        field: 'hubspotProperty.definition',
        message: "obligatorio cuando mode='new' (objeto).",
        example: HP_EXAMPLE.new,
      });
    } else {
      for (const k of ['hubspotName', 'label', 'type', 'fieldType'])
        if (typeof def[k] !== 'string' || !(def[k] as string).trim())
          issues.push({
            code: 'DEFINITION_FIELD_REQUIRED',
            field: `hubspotProperty.definition.${k}`,
            message: 'es obligatorio (string).',
            example: HP_EXAMPLE.new,
          });
      if (typeof def.hubspotName === 'string' && def.hubspotName.trim())
        pushNameIssues(def.hubspotName.trim(), 'hubspotProperty.definition.hubspotName', issues);
      if (def.groupName !== undefined && typeof def.groupName !== 'string')
        issues.push({
          code: 'DEFINITION_GROUPNAME_TYPE',
          field: 'hubspotProperty.definition.groupName',
          message: 'debe ser string.',
        });
    }
  } else {
    issues.push({
      code: 'HUBSPOT_PROPERTY_MODE_INVALID',
      field: 'hubspotProperty.mode',
      message: "debe ser 'existing' o 'new'.",
      example: HP_EXAMPLE,
    });
  }

  if (!Array.isArray(e.sources)) {
    issues.push({
      code: 'SOURCES_NOT_ARRAY',
      field: 'sources',
      message: 'debe ser un array de EntrySource (no strings ni «originIds»).',
      example: SOURCE_EXAMPLE,
    });
  } else {
    (e.sources as unknown[]).forEach((s, i) => {
      const src = s as Record<string, unknown>;
      if (!src || typeof src !== 'object' || Array.isArray(src)) {
        issues.push({
          code: 'SOURCE_NOT_OBJECT',
          field: `sources[${i}]`,
          message: 'debe ser un objeto EntrySource, no un string.',
          example: SOURCE_EXAMPLE[0],
        });
        return;
      }
      if (typeof src.originId !== 'string' || !src.originId.trim())
        issues.push({ code: 'SOURCE_ORIGINID_REQUIRED', field: `sources[${i}].originId`, message: 'es obligatorio (string).' });
      if (typeof src.sourceField !== 'string')
        issues.push({ code: 'SOURCE_SOURCEFIELD_REQUIRED', field: `sources[${i}].sourceField`, message: 'es obligatorio (string).' });
      const def = src.definition as Record<string, unknown> | undefined;
      if (!def || typeof def !== 'object' || typeof def.kind !== 'string')
        issues.push({
          code: 'SOURCE_KIND_REQUIRED',
          field: `sources[${i}].definition.kind`,
          message: 'es obligatorio (text|number|boolean|enum|memo).',
        });
    });
  }

  return issues;
}
