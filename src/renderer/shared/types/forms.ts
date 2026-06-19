/**
 * Contrato de la gestión de formularios (SPEC-0008), compartido entre main, preload y
 * renderer. El estado de verdad de los formularios es HubSpot (Marketing Forms API v3);
 * las asociaciones formulario↔origen y los cambios pendientes viven en el estado local.
 */
import type { HubSpotEnvironment } from '@shared/types/hubspot';

export type HubSpotFormType = 'hubspot' | 'captured' | 'flow' | 'blog_comment';

/** Campo de un formulario, tal como llega de HubSpot (subconjunto relevante). */
export interface FormField {
  objectTypeId: string; // p.ej. '0-1' (contacts)
  name: string; // nombre técnico de la propiedad HubSpot
  label: string;
  fieldType: string; // tipo de campo de formulario (single_line_text, dropdown, ...)
  required: boolean;
  hidden: boolean;
}

export interface FormFieldGroup {
  fields: FormField[];
  richText?: string;
}

/** Formulario importado (espejo de solo lectura del estado en HubSpot). */
export interface HubSpotForm {
  id: string;
  name: string;
  formType: HubSpotFormType;
  archived: boolean;
  fieldGroups: FormFieldGroup[];
  updatedAt: string;
  // Derivados por la app:
  objectTypes: string[]; // objetos (SPEC-0006) presentes en los campos
  fieldNames: string[]; // nombres de propiedad presentes
  // Snapshot completo del formulario tal como lo devuelve HubSpot. Se usa como base de la
  // edición (update_form, §21) para no perder configuración/estilos/consentimiento/lógica
  // que la app no modela. Opcional: estados antiguos en Drive pueden no tenerlo.
  raw?: unknown;
}

/** Asociación formulario ↔ orígenes (estado local del proyecto). */
export interface FormOriginLink {
  id: string; // uuid
  formId: string; // ref a HubSpotForm.id
  originIds: string[]; // refs a DataOrigin.id (SPEC-0006); uno o varios
  objectType: string; // objeto HubSpot contra el que se evalúa la cobertura
  createdAt: string;
}

export type FieldCoverageStatus = 'present' | 'missing';

export interface FieldCoverageItem {
  hubspotName: string; // propiedad destino esperada por el origen
  label: string;
  objectType: string;
  fieldType: string; // tipo de campo de formulario propuesto (mapeado)
  status: FieldCoverageStatus;
}

export interface FormCoverageReport {
  formId: string;
  originId: string;
  objectType: string;
  expected: number;
  present: number;
  missing: number;
  items: FieldCoverageItem[];
}

export type FormChangeOperation = 'create_form' | 'add_fields' | 'update_field' | 'update_form';

/** Cambio pendiente sobre un formulario (análogo a HsPropertyChange de SPEC-0006). */
export interface FormChange {
  id: string;
  formId?: string; // ausente en create_form hasta aplicarse
  operation: FormChangeOperation;
  summary: string;
  payload: unknown; // body para POST/PATCH /marketing/v3/forms
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
  // Solo en create_form: orígenes/objeto para crear el FormOriginLink al aplicarse
  // (no se envían a HubSpot; son metadatos locales).
  createContext?: { originIds: string[]; objectType: string };
}

export interface NewFormFieldDefinition {
  hubspotName: string;
  label: string;
  fieldType: string; // mapeado desde el fieldType de la propiedad
  required: boolean;
  hidden: boolean;
}

/** Definición de un formulario nuevo (asistente «solo campos»). */
export interface NewFormDefinition {
  name: string;
  originIds: string[];
  objectType: string;
  fields: NewFormFieldDefinition[];
}

// ── Edición de formularios (update_form, SPEC-0008 §21) ─────────────────────

/** Campo en forma laxa para editar: admite `name` o `hubspotName`. */
export interface FormFieldEditInput {
  objectTypeId?: string;
  name?: string;
  hubspotName?: string;
  label?: string;
  fieldType?: string;
  required?: boolean;
  hidden?: boolean;
}

/**
 * Ediciones a aplicar sobre un formulario existente. Todo es opcional: lo que no se
 * especifica se conserva del snapshot `raw` del formulario (no se pierde nada).
 * `fields` (o `fieldGroups`) reemplaza la lista de campos; `configuration`/`displayOptions`/
 * `legalConsentOptions` se fusionan (superficial) sobre los del formulario.
 */
export interface FormEditsInput {
  name?: string;
  fields?: FormFieldEditInput[];
  fieldGroups?: Array<{ fields?: FormFieldEditInput[]; richText?: string }>;
  configuration?: Record<string, unknown>;
  displayOptions?: Record<string, unknown>;
  legalConsentOptions?: Record<string, unknown>;
}

export interface FormUpdateDefinitionInput {
  projectId: string;
  formId: string;
  edits: FormEditsInput;
}

// ── Contratos IPC (entradas / salidas) ──────────────────────────────────────

export interface FormsListInput {
  projectId: string;
}

export interface FormsSyncInput {
  projectId: string;
  includeLegacyV2?: boolean;
}

export interface FormsSyncResult {
  imported: number;
  updated: number;
}

export interface FormGetInput {
  projectId: string;
  formId: string;
}

export interface FormCreateDefinitionInput {
  projectId: string;
  definition: NewFormDefinition;
}

export interface FormCoverageInput {
  projectId: string;
  formId: string;
  originId?: string;
}

export interface FormAddMissingFieldsInput {
  projectId: string;
  formId: string;
  originId: string;
}

export interface FormApplyChangeInput {
  projectId: string;
  changeId: string;
  environment: HubSpotEnvironment;
}

export interface FormApplyChangeResult {
  success: boolean;
  formId?: string;
  error?: string;
}

export interface FormDiscardChangeInput {
  projectId: string;
  changeId: string;
}

export interface FormLinksListInput {
  projectId: string;
}

export interface FormLinkUpsertInput {
  projectId: string;
  link: Omit<FormOriginLink, 'id' | 'createdAt'> & { id?: string };
}

export interface FormLinkDeleteInput {
  projectId: string;
  linkId: string;
}

export interface FormsOperationResult {
  success: boolean;
  error?: string;
}

export interface FormsWriteSheetsResult {
  success: boolean;
  spreadsheetId?: string;
  error?: string;
}
