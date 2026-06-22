/**
 * Construcción de los cambios pendientes sobre formularios (SPEC-0008 §3, patrón SPEC-0006).
 * Cada cambio guarda el `payload` exacto para POST/PATCH /marketing/v3/forms; la app nunca
 * lo aplica sin confirmación explícita del usuario y entorno (sandbox/production).
 */
import type {
  FieldCoverageItem,
  FormChange,
  FormEditsInput,
  FormFieldEditInput,
  HubSpotForm,
  NewFormDefinition,
  NewFormFieldDefinition,
} from '@shared/types/forms';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { objectTypeToId, objectTypeFromId } from '../connectors/hubspot/forms';

export interface ChangeFactoryDeps {
  newId: () => string;
  now: () => string;
}

/** Valores por defecto razonables para crear un formulario `hubspot` (solo campos, §2). */
export const DEFAULT_FORM_CONFIGURATION = {
  language: 'es',
  cloneable: true,
  editable: true,
  archivable: true,
  recaptchaEnabled: false,
  notifyContactOwner: false,
  notifyRecipients: [],
  createNewContactForNewEmail: false,
  prePopulateKnownValues: true,
  allowLinkToResetKnownValues: false,
  postSubmitAction: { type: 'thank_you', value: '' },
  lifecycleStages: [],
} as const;

export const DEFAULT_FORM_DISPLAY_OPTIONS = {
  renderRawHtml: false,
  theme: 'default_style',
  submitButtonText: 'Enviar',
  cssClass: '',
} as const;

interface EmailFieldValidation {
  blockedEmailDomains: string[];
  useDefaultBlockList: boolean;
}

interface FieldPayload {
  objectTypeId: string;
  name: string;
  label: string;
  required: boolean;
  hidden: boolean;
  fieldType: string;
  validation?: EmailFieldValidation;
}

/** Marketing Forms API v3 exige `validation` en los campos `email` (SPEC-0008 §20). */
const DEFAULT_EMAIL_VALIDATION: EmailFieldValidation = {
  blockedEmailDomains: [],
  useDefaultBlockList: false,
};

/** HubSpot limita cada `fieldGroup` a un máximo de 3 campos (SPEC-0008 §26). */
const MAX_FIELDS_PER_GROUP = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Reparte campos en grupos de ≤3 (forma exigida por HubSpot). */
function fieldGroupsFrom(fields: FieldPayload[]): Array<Record<string, unknown>> {
  return chunk(fields, MAX_FIELDS_PER_GROUP).map((group) => ({
    groupType: 'default_group',
    richTextType: 'text',
    fields: group,
  }));
}

/**
 * Garantiza que ningún `fieldGroup` supere los 3 campos (§26). Aplana y reparticiona; usado al
 * aplicar para cubrir también payloads guardados antes de este fix (sin re-editarlos).
 */
export function enforceGroupSize(payload: Record<string, unknown>): Record<string, unknown> {
  const groups = payload.fieldGroups as Array<{ fields?: FieldPayload[] }> | undefined;
  if (!groups || groups.length === 0) return payload;
  const exceeds = groups.some((g) => (g.fields?.length ?? 0) > MAX_FIELDS_PER_GROUP);
  if (!exceeds) return payload;
  const allFields = groups.flatMap((g) => g.fields ?? []);
  return { ...payload, fieldGroups: fieldGroupsFrom(allFields) };
}

function toFieldPayload(objectType: string, field: NewFormFieldDefinition): FieldPayload {
  const payload: FieldPayload = {
    objectTypeId: objectTypeToId(objectType),
    name: field.hubspotName,
    label: field.label,
    required: field.required,
    hidden: field.hidden,
    fieldType: field.fieldType,
  };
  if (field.fieldType === 'email') payload.validation = { ...DEFAULT_EMAIL_VALIDATION };
  return payload;
}

/** Convierte un item de cobertura faltante en campo de formulario (visible y no obligatorio). */
export function coverageItemToField(item: FieldCoverageItem): NewFormFieldDefinition {
  return {
    hubspotName: item.hubspotName,
    label: item.label,
    fieldType: item.fieldType,
    required: false,
    hidden: false,
  };
}

/** Campo de formulario en forma laxa: admite `hubspotName` (canónico) o `name` (forma HubSpot). */
export interface RawFormFieldInput {
  hubspotName?: string;
  name?: string;
  label?: string;
  fieldType?: string;
  required?: boolean;
  hidden?: boolean;
  objectTypeId?: string;
}

/**
 * Definición de formulario en forma laxa. Admite tanto la forma canónica de la app (`fields`) como
 * la forma que devuelve `forms_pending_changes`/HubSpot (`fieldGroups[].fields`).
 */
export interface RawFormDefinitionInput {
  name?: string;
  objectType?: string;
  originIds?: string[];
  fields?: RawFormFieldInput[];
  fieldGroups?: Array<{ fields?: RawFormFieldInput[] }>;
}

/**
 * Normaliza una definición laxa a `NewFormDefinition`. Acepta `fields` o `fieldGroups`, conserva el
 * nombre del campo (`name` o `hubspotName`) y valida que exista. La forma canónica de la app pasa
 * intacta, por lo que el comportamiento desde la UI no cambia.
 */
export function normalizeFormDefinition(raw: RawFormDefinitionInput): NewFormDefinition {
  const name = (raw.name ?? '').trim();
  if (!name) throw new Error('La definición del formulario requiere «name»');

  const rawFields = raw.fields ?? (raw.fieldGroups ?? []).flatMap((group) => group?.fields ?? []);

  const fields: NewFormFieldDefinition[] = rawFields.map((field, index) => {
    const hubspotName = (field.hubspotName ?? field.name ?? '').trim();
    if (!hubspotName) {
      throw new Error(`El campo #${index + 1} no tiene «name»/«hubspotName»`);
    }
    if (!field.fieldType) throw new Error(`El campo «${hubspotName}» no tiene «fieldType»`);
    return {
      hubspotName,
      label: field.label ?? hubspotName,
      fieldType: field.fieldType,
      required: field.required ?? false,
      hidden: field.hidden ?? false,
    };
  });

  const fromFieldId = rawFields.find((field) => field.objectTypeId)?.objectTypeId;
  const objectType = raw.objectType ?? (fromFieldId ? objectTypeFromId(fromFieldId) : 'contacts');

  return { name, originIds: raw.originIds ?? [], objectType, fields };
}

/** Cambio pendiente `create_form` con el POST a /marketing/v3/forms (formType: hubspot). */
export function buildCreateFormChange(
  definition: RawFormDefinitionInput,
  deps: ChangeFactoryDeps,
): FormChange {
  const normalized = normalizeFormDefinition(definition);
  const payload = ensureRequiredFormFields(
    {
      name: normalized.name,
      formType: 'hubspot',
      fieldGroups: fieldGroupsFrom(
        normalized.fields.map((field) => toFieldPayload(normalized.objectType, field)),
      ),
      configuration: DEFAULT_FORM_CONFIGURATION,
      displayOptions: DEFAULT_FORM_DISPLAY_OPTIONS,
      legalConsentOptions: { type: 'none' },
    },
    deps.now(),
  );
  return {
    id: deps.newId(),
    operation: 'create_form',
    summary: `Crear formulario «${normalized.name}» (${normalized.fields.length} campos)`,
    payload,
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
    createContext: { originIds: normalized.originIds, objectType: normalized.objectType },
  };
}

/**
 * Cambio pendiente `add_fields`: PATCH que añade SOLO los campos que faltan. Se preservan los
 * grupos existentes y se añade un grupo nuevo con los campos faltantes (HubSpot reemplaza
 * `fieldGroups` al actualizar, por lo que se reenvían también los grupos previos).
 */
export function buildAddFieldsChange(
  form: HubSpotForm,
  objectType: string,
  missing: FieldCoverageItem[],
  deps: ChangeFactoryDeps,
): FormChange {
  const existingGroups = form.fieldGroups.map((group) => ({
    groupType: 'default_group',
    richTextType: 'text',
    fields: group.fields.map((field) => ({
      objectTypeId: field.objectTypeId,
      name: field.name,
      label: field.label,
      required: field.required,
      hidden: field.hidden,
      fieldType: field.fieldType,
      ...(field.fieldType === 'email' ? { validation: { ...DEFAULT_EMAIL_VALIDATION } } : {}),
    })),
  }));
  const newGroups = fieldGroupsFrom(
    missing.map((item) => toFieldPayload(objectType, coverageItemToField(item))),
  );
  return {
    id: deps.newId(),
    formId: form.id,
    operation: 'add_fields',
    summary: `Añadir ${missing.length} campo(s) que faltan al formulario «${form.name}»`,
    payload: { fieldGroups: [...existingGroups, ...newGroups] },
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

/** Claves gestionadas por HubSpot que no deben enviarse en el cuerpo. */
const READONLY_FORM_KEYS = ['id', 'archivedAt'] as const;

/**
 * HubSpot exige `archived`, `createdAt` y `updatedAt` en el cuerpo de creación/actualización
 * (SPEC-0008 §25). Los rellena si faltan, sin pisar valores existentes.
 */
export function ensureRequiredFormFields(
  payload: Record<string, unknown>,
  now: string,
): Record<string, unknown> {
  const p = { ...payload };
  if (p.archived === undefined) p.archived = false;
  if (!p.createdAt) p.createdAt = now;
  if (!p.updatedAt) p.updatedAt = now;
  return p;
}

function editFieldToPayload(field: FormFieldEditInput, defaultObjectTypeId: string): FieldPayload {
  const fieldType = field.fieldType ?? '';
  const payload: FieldPayload = {
    objectTypeId: field.objectTypeId ?? defaultObjectTypeId,
    name: (field.hubspotName ?? field.name ?? '').trim(),
    label: field.label ?? field.hubspotName ?? field.name ?? '',
    required: field.required ?? false,
    hidden: field.hidden ?? false,
    fieldType,
  };
  if (fieldType === 'email') payload.validation = { ...DEFAULT_EMAIL_VALIDATION };
  return payload;
}

/** objectTypeId del primer campo de un payload (para mapear campos nuevos). */
function firstObjectTypeId(base: Record<string, unknown>): string | undefined {
  const groups = base.fieldGroups as
    | Array<{ fields?: Array<{ objectTypeId?: string }> }>
    | undefined;
  return groups?.[0]?.fields?.[0]?.objectTypeId;
}

/** Nº de campos de un payload de formulario (para los resúmenes). */
export function formPayloadFieldCount(payload: Record<string, unknown>): number {
  const groups = (payload.fieldGroups as Array<{ fields?: unknown[] }> | undefined) ?? [];
  return groups.reduce((sum, group) => sum + (group.fields?.length ?? 0), 0);
}

/**
 * Aplica `edits` sobre un payload de formulario existente (núcleo común de §21 y §23).
 * Reemplaza `fieldGroups` si las ediciones tocan campos; fusiona `configuration`/`displayOptions`;
 * sustituye `legalConsentOptions`; elimina claves de solo-lectura; inyecta `validation` en email (§20).
 * Con `opts.isAddFields` solo se tocan los `fieldGroups` (nombre/config no aplican).
 */
export function applyEditsToFormPayload(
  base: Record<string, unknown>,
  edits: FormEditsInput,
  opts: { isAddFields?: boolean } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...base };
  for (const key of READONLY_FORM_KEYS) delete payload[key];

  const defaultObjectTypeId = firstObjectTypeId(base) ?? '0-1';

  if (edits.fields) {
    payload.fieldGroups = fieldGroupsFrom(
      edits.fields.map((f) => editFieldToPayload(f, defaultObjectTypeId)),
    );
  } else if (edits.fieldGroups) {
    // Se aplanan y reparten en grupos de ≤3 (límite de HubSpot, §26).
    payload.fieldGroups = fieldGroupsFrom(
      edits.fieldGroups.flatMap((group) =>
        (group.fields ?? []).map((f) => editFieldToPayload(f, defaultObjectTypeId)),
      ),
    );
  }

  if (opts.isAddFields) return payload;

  if (edits.name !== undefined) payload.name = edits.name.trim();
  if (edits.configuration) {
    payload.configuration = { ...((payload.configuration as Record<string, unknown>) ?? {}), ...edits.configuration };
  }
  if (edits.displayOptions) {
    payload.displayOptions = { ...((payload.displayOptions as Record<string, unknown>) ?? {}), ...edits.displayOptions };
  }
  if (edits.legalConsentOptions) payload.legalConsentOptions = edits.legalConsentOptions;
  return payload;
}

/**
 * Cambio pendiente `update_form`: PATCH `/marketing/v3/forms/{id}` con el estado completo
 * deseado (HubSpot reemplaza en bloque). Parte del snapshot `raw` del formulario para conservar
 * configuración/estilos/consentimiento/lógica que la app no modela, y superpone las ediciones.
 */
export function buildUpdateFormChange(
  form: HubSpotForm,
  edits: FormEditsInput,
  deps: ChangeFactoryDeps,
): FormChange {
  const base: Record<string, unknown> =
    form.raw && typeof form.raw === 'object' ? { ...(form.raw as Record<string, unknown>) } : {};
  // Sin raw y sin ediciones de campos: reconstruye los fieldGroups desde el espejo conocido.
  if (!base.fieldGroups && !edits.fields && !edits.fieldGroups) {
    const defaultObjectTypeId = objectTypeToId(form.objectTypes[0] ?? 'contacts');
    base.fieldGroups = fieldGroupsFrom(
      form.fieldGroups.flatMap((group) => group.fields).map((f) => editFieldToPayload(f, defaultObjectTypeId)),
    );
  }
  if (!base.name) base.name = form.name;
  if (!base.formType) base.formType = form.formType;
  if (!base.legalConsentOptions) base.legalConsentOptions = { type: 'none' };

  const payload = applyEditsToFormPayload(base, edits);
  if (!payload.name) payload.name = form.name;
  const name = String(payload.name);

  return {
    id: deps.newId(),
    formId: form.id,
    operation: 'update_form',
    summary: `Editar formulario «${name}»`,
    payload,
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

// ── Consentimiento legal (§24) ──────────────────────────────────────────────

type Lco = Record<string, unknown>;

function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** Campos requeridos que faltan en un `legalConsentOptions` (vacío si type==='none' o completo). */
export function consentMissingRequired(lco: Lco | undefined): string[] {
  const type = lco?.type;
  if (!type || type === 'none') return [];
  const missing: string[] = [];
  if (typeof lco?.privacyText !== 'string' || !lco.privacyText) missing.push('privacyText');
  if (!nonEmptyArray(lco?.communicationsCheckboxes)) missing.push('communicationsCheckboxes');
  return missing;
}

/** Completa los campos de consentimiento que falten a partir de una plantilla (sin pisar lo puesto). */
export function mergeConsentTemplate(lco: Lco, template: Lco | null): Lco {
  if (!template) return lco;
  const merged: Lco = { ...lco };
  if (typeof merged.privacyText !== 'string' || !merged.privacyText) {
    if (typeof template.privacyText === 'string') merged.privacyText = template.privacyText;
  }
  if (!nonEmptyArray(merged.communicationsCheckboxes) && nonEmptyArray(template.communicationsCheckboxes)) {
    merged.communicationsCheckboxes = template.communicationsCheckboxes;
  }
  for (const key of [
    'communicationConsentText',
    'consentToProcessText',
    'consentToProcessCheckboxLabel',
    'consentToProcessFooterText',
  ]) {
    if (merged[key] === undefined && template[key] !== undefined) merged[key] = template[key];
  }
  return merged;
}

/** Marca un cambio como aplicado a un entorno tras una respuesta OK de HubSpot. */
export function markApplied(change: FormChange, environment: HubSpotEnvironment): FormChange {
  return {
    ...change,
    appliedToSandbox: environment === 'sandbox' ? true : change.appliedToSandbox,
    appliedToProduction: environment === 'production' ? true : change.appliedToProduction,
  };
}

/** Un cambio se considera completado solo cuando se ha aplicado en producción. */
export function isCompleted(change: FormChange): boolean {
  return change.appliedToProduction;
}
