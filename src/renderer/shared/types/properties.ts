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

export type ChangeOperation =
  | 'create'
  | 'update_label'
  | 'update_options'
  | 'update_field_type';

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

export interface PropertiesSyncResult {
  updated: number;
  divergent: number;
  missing: number;
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
