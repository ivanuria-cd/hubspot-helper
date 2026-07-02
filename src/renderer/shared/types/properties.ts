/**
 * Contrato de la gestión de propiedades (SPEC-0006, rediseño §16), compartido entre
 * main, preload y renderer. La lista se organiza por objeto de HubSpot en forma de
 * «entradas» definidas por el usuario; la sincronización alimenta el selector de
 * propiedades y el estado (exists/divergent/missing).
 */
import type { HubSpotEnvironment } from '@shared/types/hubspot';

export type OriginType = 'integration' | 'migration' | 'user' | 'workflow';

/** Objeto de un origen de datos (p. ej. «contactos», «empresas» del sistema origen). */
export interface OriginObject {
  id: string;
  name: string;
}

export interface DataOrigin {
  id: string;
  name: string;
  type: OriginType;
  description?: string;
  objects?: OriginObject[];
  createdAt: string;
}

/**
 * Tipos de dato (`type`) de HubSpot (Properties API). El fallback abierto
 * `(string & {})` permite preservar verbatim cualquier valor presente o futuro
 * sin colapsarlo a `string`. Nota: los teléfonos son `string` con
 * `fieldType: phonenumber` — `phone_number` no es un `type` de HubSpot.
 */
export type HsPropertyType =
  | 'bool'
  | 'enumeration'
  | 'date'
  | 'datetime'
  | 'string'
  | 'number'
  | 'object_coordinates'
  | 'json'
  | (string & {});

export interface HsPropertyOption {
  label: string;
  value: string;
  displayOrder: number;
  hidden: boolean;
}

export type HsPropertyStatus = 'exists' | 'missing' | 'divergent';

/** Formato de visualización de una propiedad `number` (moneda, porcentaje, duración…). */
export type NumberDisplayHint =
  | 'unformatted'
  | 'formatted'
  | 'currency'
  | 'percentage'
  | 'duration'
  | 'probability';

/** Formato/validación de una propiedad de texto (email, teléfono, dirección…). */
export type TextDisplayHint =
  | 'unformatted_single_line'
  | 'multi_line'
  | 'email'
  | 'phone_number'
  | 'domain_name'
  | 'ip_address'
  | 'physical_address'
  | 'postal_code';

/** Nivel de sensibilidad del dato (datos sensibles, Enterprise). */
export type DataSensitivity = 'non_sensitive' | 'sensitive' | 'highly_sensitive';

export type ChangeOperation =
  | 'create'
  | 'update_label'
  | 'update_options'
  | 'update_field_type'
  | 'update_attributes'
  | 'delete';

export interface HsPropertyChange {
  id: string;
  entryId: string;
  operation: ChangeOperation;
  summary: string;
  payload: unknown;
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
}

/**
 * Cambio pendiente de borrado (archivado permanente) de un grupo de propiedades (SPEC-0006 §33).
 * No va asociado a una entrada; vive a nivel de proyecto. Destructivo: solo por acción explícita y
 * aplicado por entorno (sandbox primero). Requiere que el grupo esté vacío al aplicarse.
 */
export interface GroupDeleteChange {
  id: string;
  objectType: string;
  groupName: string;
  label?: string;
  summary: string;
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
}

export interface HubSpotObject {
  objectType: string;
  label: string;
  custom: boolean;
}

export type SourceFieldKind = 'number' | 'text' | 'boolean' | 'enum' | 'memo';

export interface BooleanReception {
  truthy: string;
  falsy: string;
}

export interface SourceEnumOption {
  sourceValue: string;
  sourceLabel?: string;
  hubspotValue?: string;
}

export interface SourceFieldDefinition {
  kind: SourceFieldKind;
  boolean?: BooleanReception;
  options?: SourceEnumOption[];
}

export interface EntrySource {
  id: string;
  originId: string;
  originObjectId?: string;
  sourceField: string;
  definition: SourceFieldDefinition;
  notes?: string;
}

export interface HubSpotPropertyDef {
  hubspotName: string;
  label: string;
  type: HsPropertyType;
  fieldType: string;
  groupName: string;
  options?: HsPropertyOption[];
  description?: string;
  /** Formato de un `number`: moneda, porcentaje, duración… */
  numberDisplayHint?: NumberDisplayHint;
  /** Muestra el símbolo de moneda de la cuenta (solo con numberDisplayHint='currency'). */
  showCurrencySymbol?: boolean;
  /** Propiedad de moneda relacionada. */
  currencyPropertyName?: string;
  /** Formato/validación de una propiedad de texto. */
  textDisplayHint?: TextDisplayHint;
  /** Fórmula de una propiedad calculada (fieldType='calculation_equation'). */
  calculationFormula?: string;
  /** El valor debe ser único; no se puede cambiar una vez fijado. */
  hasUniqueValue?: boolean;
  /** Nivel de sensibilidad del dato. */
  dataSensitivity?: DataSensitivity;
  /** Para enumeration con referencedObjectType='OWNER': opciones dinámicas de usuarios. */
  externalOptions?: boolean;
  /** Objeto referenciado (p. ej. 'OWNER') para enumeration con externalOptions. */
  referencedObjectType?: string;
  /** Orden de visualización en HubSpot. */
  displayOrder?: number;
  /** Oculta la propiedad de la UI de HubSpot. */
  hidden?: boolean;
  /** Si la propiedad puede usarse en formularios de HubSpot. */
  formField?: boolean;
}

export type HubSpotPropertyRef =
  | { mode: 'existing'; hubspotName: string; definition?: HubSpotPropertyDef }
  | { mode: 'new'; definition: HubSpotPropertyDef };

export interface PropertyEntry {
  id: string;
  objectType: string;
  name: string;
  hubspotProperty: HubSpotPropertyRef;
  sources: EntrySource[];
  hubspotStatus: HsPropertyStatus;
  pendingChanges?: HsPropertyChange[];
  /** El usuario ha solicitado archivar la propiedad destino en HubSpot (genera un cambio `delete`). */
  pendingDelete?: boolean;
}

export interface OriginExport {
  schema_version: 2;
  origin: Pick<DataOrigin, 'id' | 'name' | 'type'>;
  exported_at: string;
  properties: Array<{
    entry_name: string;
    hubspot_name: string;
    object_type: string;
    source_object?: string;
    source_field: string;
    source_kind: SourceFieldKind;
    boolean_format?: BooleanReception;
    options?: Array<{ sourceValue: string; hubspotValue?: string }>;
    notes?: string;
  }>;
}

export interface ProjectScopedInput {
  projectId: string;
}

/**
 * Entrada que aparece como `missing`/`falta` pero NO genera cambio pendiente: está en modo
 * `existing` y apunta a una propiedad inexistente en HubSpot (SPEC-0006 §35). No se crea sola.
 * Remedio según el motivo: `existing-missing-remote` → «Convertir a Nueva»; `system-property`
 * → `relink` (es una propiedad de sistema de HubSpot; no debe recrearse, revisar el nombre interno) (§43).
 */
export interface Blocker {
  entryId: string;
  entry: string;
  objectType: string;
  hubspotName: string;
  reason: 'existing-missing-remote' | 'system-property';
  remediation: 'convert-to-new' | 'relink';
}

export interface PropertiesSyncResult {
  updated: number;
  divergent: number;
  missing: number;
  /** Subconjunto de `missing` sin remedio automático (ver `blockers`). */
  blocked: number;
  blockers: Blocker[];
}

export interface ConvertEntryInput {
  projectId: string;
  entryId: string;
}

export interface ConvertEntryResult {
  success: boolean;
  /** La entrada no tenía definición cacheada: se sembró una mínima a completar antes de aplicar. */
  seeded?: boolean;
  error?: string;
}

export interface ConvertMissingInput {
  projectId: string;
  objectType?: string;
}

export interface ConvertMissingResult {
  converted: number;
  seeded: number;
}

export interface ApplyChangeInput {
  projectId: string;
  changeId: string;
  environment: HubSpotEnvironment;
}

export interface ApplyChangeResult {
  success: boolean;
  error?: string;
}

export interface DiscardChangeInput {
  projectId: string;
  changeId: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface WriteSheetsResult {
  success: boolean;
  spreadsheetId?: string;
  error?: string;
}

export interface OriginCreateInput {
  projectId: string;
  origin: { name: string; type: OriginType; description?: string };
}

export interface OriginUpdateInput {
  projectId: string;
  origin: DataOrigin;
}

export interface OriginDeleteInput {
  projectId: string;
  originId: string;
}

export interface HubSpotPropertiesInput {
  projectId: string;
  objectType: string;
}

export interface EntriesListInput {
  projectId: string;
  objectType?: string;
}

export interface EntryUpsertInput {
  projectId: string;
  entry: Omit<PropertyEntry, 'id' | 'hubspotStatus' | 'pendingChanges'> & { id?: string };
}

export interface EntryDeleteInput {
  projectId: string;
  entryId: string;
}

export interface ExportJsonInput {
  projectId: string;
  originId: string;
}

export interface HubSpotGroup {
  name: string;
  label: string;
}

export interface GroupsListInput {
  projectId: string;
  objectType: string;
}

export interface GroupCreateInput {
  projectId: string;
  objectType: string;
  name: string;
  label: string;
}

export interface GroupDeleteRequestInput {
  projectId: string;
  objectType: string;
  groupName: string;
  label?: string;
}

export interface GroupChangesListInput {
  projectId: string;
}

export interface GroupApplyChangeInput {
  projectId: string;
  changeId: string;
  environment: HubSpotEnvironment;
}

export interface GroupDiscardChangeInput {
  projectId: string;
  changeId: string;
}
