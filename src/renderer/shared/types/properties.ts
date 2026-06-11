/**
 * Contrato de la gestión de propiedades (SPEC-0006), compartido entre main, preload y renderer.
 * La fuente de verdad del estado vive en Google Drive (Sheets); estos tipos modelan el estado
 * de trabajo de la app y los contratos de IPC/MCP.
 */
import type { HubSpotEnvironment } from '@shared/types/hubspot';

export type OriginType = 'integration' | 'migration' | 'user' | 'workflow';

export interface DataOrigin {
  id: string;
  name: string;
  type: OriginType;
  description?: string;
  createdAt: string;
}

export type HsPropertyType =
  | 'string'
  | 'number'
  | 'date'
  | 'datetime'
  | 'enumeration'
  | 'bool'
  | 'phone_number';

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
  propertyId: string;
  operation: ChangeOperation;
  /** Resumen legible del cambio para la UI y el Sheets. */
  summary: string;
  /** Body de la llamada a la API de HubSpot. */
  payload: unknown;
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
}

export interface HubSpotProperty {
  id: string;
  hubspotName: string;
  label: string;
  objectType: string;
  type: HsPropertyType;
  fieldType: string;
  groupName: string;
  isCustom: boolean;
  description?: string;
  options?: HsPropertyOption[];
  hubspotStatus: HsPropertyStatus;
  pendingChanges?: HsPropertyChange[];
}

export interface TransformationRule {
  sourceValue: string;
  targetValue: string;
}

export interface PropertyOriginMapping {
  id: string;
  propertyId: string;
  originId: string;
  sourceField: string;
  transformations: TransformationRule[];
  notes?: string;
}

/** Contrato JSON de exportación por origen (schema versionado). */
export interface OriginExport {
  schema_version: 1;
  origin: Pick<DataOrigin, 'id' | 'name' | 'type'>;
  exported_at: string;
  properties: Array<{
    hubspot_name: string;
    label: string;
    object_type: string;
    type: HsPropertyType;
    source_field: string;
    transformations: Array<{ sourceValue: string; targetValue: string }>;
    notes?: string;
  }>;
}

// --- Entradas/salidas de los canales IPC ---

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

export interface PropertyUpsertInput {
  projectId: string;
  property: Omit<HubSpotProperty, 'id' | 'hubspotStatus' | 'pendingChanges' | 'isCustom'> & {
    id?: string;
    isCustom?: boolean;
  };
}

export interface MappingsListInput {
  projectId: string;
  propertyId?: string;
}

export interface MappingUpsertInput {
  projectId: string;
  mapping: Omit<PropertyOriginMapping, 'id'> & { id?: string };
}

export interface MappingDeleteInput {
  projectId: string;
  mappingId: string;
}

export interface ExportJsonInput {
  projectId: string;
  originId: string;
}
