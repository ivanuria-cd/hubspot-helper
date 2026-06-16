/**
 * Contrato de la gestión de objetos custom de HubSpot (SPEC-0007), compartido entre
 * main, preload y renderer. La creación/edición/archivado del schema se modela como
 * cambios pendientes revisables (sandbox→producción); HubSpot asigna `objectTypeId`
 * distinto por entorno, por eso se guarda por entorno y se reconcilia por `name`.
 */
import type { HsPropertyOption, HsPropertyType } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

/** Propiedad inicial del objeto (superset del def de SPEC-0006: añade hasUniqueValue). */
export interface CustomObjectPropertyDef {
  name: string;
  label: string;
  type: HsPropertyType;
  fieldType: string;
  groupName?: string;
  options?: HsPropertyOption[];
  hasUniqueValue?: boolean;
}

export interface ObjectLabels {
  singular: string;
  plural: string;
}

/** Ids asignados por HubSpot, por entorno (no idempotentes entre portales). */
export interface EnvScopedId {
  sandbox?: string;
  production?: string;
}

export type SchemaChangeOperation = 'create' | 'update_schema' | 'archive';

export interface SchemaChange {
  id: string;
  objectId: string;
  operation: SchemaChangeOperation;
  summary: string;
  payload: unknown;
  appliedToSandbox: boolean;
  appliedToProduction: boolean;
  createdAt: string;
}

export type CustomObjectStatus = 'draft' | 'created' | 'divergent' | 'archived';

export interface CustomObjectDefinition {
  id: string;
  name: string;
  description?: string;
  labels: ObjectLabels;
  primaryDisplayProperty: string;
  secondaryDisplayProperties?: string[];
  searchableProperties?: string[];
  requiredProperties: string[];
  associatedObjects?: string[];
  properties: CustomObjectPropertyDef[];
  allowSensitiveProperties?: boolean;
  objectTypeId?: EnvScopedId;
  fullyQualifiedName?: EnvScopedId;
  status: CustomObjectStatus;
  pendingChanges?: SchemaChange[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomObjectsSyncResult {
  created: number;
  divergent: number;
  draft: number;
}

export interface ObjectsListSchemasInput {
  projectId: string;
}

export interface ObjectGetSchemaInput {
  projectId: string;
  objectId: string;
}

export interface ObjectUpsertDraftInput {
  projectId: string;
  definition: Omit<
    CustomObjectDefinition,
    'id' | 'status' | 'pendingChanges' | 'objectTypeId' | 'fullyQualifiedName' | 'createdAt' | 'updatedAt'
  > & { id?: string };
}

export interface ObjectDeleteDraftInput {
  projectId: string;
  objectId: string;
}

export interface ObjectApplyChangeInput {
  projectId: string;
  changeId: string;
  environment: HubSpotEnvironment;
}

export interface ObjectDiscardChangeInput {
  projectId: string;
  changeId: string;
}

export interface ObjectChangeResult {
  success: boolean;
  error?: string;
}
