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
  const payload = {
    name: normalized.name,
    formType: 'hubspot',
    fieldGroups: [
      {
        groupType: 'default_group',
        richTextType: 'text',
        fields: normalized.fields.map((field) => toFieldPayload(normalized.objectType, field)),
      },
    ],
    configuration: DEFAULT_FORM_CONFIGURATION,
    displayOptions: DEFAULT_FORM_DISPLAY_OPTIONS,
    legalConsentOptions: { type: 'none' },
  };
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
  const newGroup = {
    groupType: 'default_group',
    richTextType: 'text',
    fields: missing.map((item) => toFieldPayload(objectType, coverageItemToField(item))),
  };
  return {
    id: deps.newId(),
    formId: form.id,
    operation: 'add_fields',
    summary: `Añadir ${missing.length} campo(s) que faltan al formulario «${form.name}»`,
    payload: { fieldGroups: [...existingGroups, newGroup] },
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
}

/** Claves de solo-lectura que HubSpot no acepta en el cuerpo de un PATCH. */
const READONLY_FORM_KEYS = ['id', 'updatedAt', 'createdAt', 'archivedAt'] as const;

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

/**
 * Cambio pendiente `update_form`: PATCH `/marketing/v3/forms/{id}` con el estado completo
 * deseado (HubSpot reemplaza en bloque). Parte del snapshot `raw` del formulario para conservar
 * configuración/estilos/consentimiento/lógica que la app no modela, y superpone las ediciones.
 * Los campos `email` conservan `validation` (§20).
 */
export function buildUpdateFormChange(
  form: HubSpotForm,
  edits: FormEditsInput,
  deps: ChangeFactoryDeps,
): FormChange {
  const base: Record<string, unknown> =
    form.raw && typeof form.raw === 'object' ? { ...(form.raw as Record<string, unknown>) } : {};
  for (const key of READONLY_FORM_KEYS) delete base[key];

  const defaultObjectTypeId =
    form.fieldGroups[0]?.fields[0]?.objectTypeId ??
    objectTypeToId(form.objectTypes[0] ?? 'contacts');

  // fieldGroups: si las ediciones tocan campos, se reconstruye; si no, se conserva el del raw
  // (o, en su defecto, se reconstruye desde el espejo conocido del formulario).
  let fieldGroups: unknown = base.fieldGroups;
  if (edits.fields) {
    fieldGroups = [
      {
        groupType: 'default_group',
        richTextType: 'text',
        fields: edits.fields.map((f) => editFieldToPayload(f, defaultObjectTypeId)),
      },
    ];
  } else if (edits.fieldGroups) {
    fieldGroups = edits.fieldGroups.map((group) => ({
      groupType: 'default_group',
      richTextType: 'text',
      ...(group.richText !== undefined ? { richText: group.richText } : {}),
      fields: (group.fields ?? []).map((f) => editFieldToPayload(f, defaultObjectTypeId)),
    }));
  } else if (!fieldGroups) {
    fieldGroups = [
      {
        groupType: 'default_group',
        richTextType: 'text',
        fields: form.fieldGroups
          .flatMap((group) => group.fields)
          .map((f) => editFieldToPayload(f, defaultObjectTypeId)),
      },
    ];
  }

  const baseConfig = (base.configuration as Record<string, unknown>) ?? {};
  const baseDisplay = (base.displayOptions as Record<string, unknown>) ?? {};
  const configuration = { ...baseConfig, ...(edits.configuration ?? {}) };
  const displayOptions = { ...baseDisplay, ...(edits.displayOptions ?? {}) };
  const legalConsentOptions =
    edits.legalConsentOptions ?? base.legalConsentOptions ?? { type: 'none' };

  const name = (edits.name ?? form.name ?? '').trim();
  const payload = {
    ...base,
    name,
    formType: base.formType ?? form.formType ?? 'hubspot',
    fieldGroups,
    configuration,
    displayOptions,
    legalConsentOptions,
  };

  return {
    id: deps.newId(),
    formId: form.id,
    operation: 'update_form',
    summary: `Editar formulario «${name || form.name}»`,
    payload,
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
  };
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
