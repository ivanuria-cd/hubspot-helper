/**
 * Construcción de los cambios pendientes sobre formularios (SPEC-0008 §3, patrón SPEC-0006).
 * Cada cambio guarda el `payload` exacto para POST/PATCH /marketing/v3/forms; la app nunca
 * lo aplica sin confirmación explícita del usuario y entorno (sandbox/production).
 */
import type {
  FieldCoverageItem,
  FormChange,
  HubSpotForm,
  NewFormDefinition,
  NewFormFieldDefinition,
} from '@shared/types/forms';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { objectTypeToId } from '../connectors/hubspot/forms';

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

interface FieldPayload {
  objectTypeId: string;
  name: string;
  label: string;
  required: boolean;
  hidden: boolean;
  fieldType: string;
}

function toFieldPayload(objectType: string, field: NewFormFieldDefinition): FieldPayload {
  return {
    objectTypeId: objectTypeToId(objectType),
    name: field.hubspotName,
    label: field.label,
    required: field.required,
    hidden: field.hidden,
    fieldType: field.fieldType,
  };
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

/** Cambio pendiente `create_form` con el POST a /marketing/v3/forms (formType: hubspot). */
export function buildCreateFormChange(
  definition: NewFormDefinition,
  deps: ChangeFactoryDeps,
): FormChange {
  const payload = {
    name: definition.name,
    formType: 'hubspot',
    fieldGroups: [
      {
        groupType: 'default_group',
        richTextType: 'text',
        fields: definition.fields.map((field) => toFieldPayload(definition.objectType, field)),
      },
    ],
    configuration: DEFAULT_FORM_CONFIGURATION,
    displayOptions: DEFAULT_FORM_DISPLAY_OPTIONS,
    legalConsentOptions: { type: 'none' },
  };
  return {
    id: deps.newId(),
    operation: 'create_form',
    summary: `Crear formulario «${definition.name}» (${definition.fields.length} campos)`,
    payload,
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: deps.now(),
    createContext: { originIds: definition.originIds, objectType: definition.objectType },
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
