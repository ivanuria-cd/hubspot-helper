/**
 * Documento de ESTADO companion del catálogo de objetos custom (SPEC-0004 §15, SPEC-0007 §15).
 * Drive no es fuente de verdad: este JSON permite reimportar el estado local (definiciones).
 * No se parsea el Sheets «bonito»; este documento es el contrato de carga.
 */
import type { CustomObjectDefinition } from '@shared/types/custom-objects';

export const CUSTOM_OBJECTS_STATE_FEATURE_KEY = 'custom-objects-state';
export const CUSTOM_OBJECTS_STATE_SCHEMA_VERSION = 1;

export interface CustomObjectsDriveState {
  objects: CustomObjectDefinition[];
}

export function serializeCustomObjectsState(state: CustomObjectsDriveState): string {
  return JSON.stringify(
    {
      schema_version: CUSTOM_OBJECTS_STATE_SCHEMA_VERSION,
      objects: state.objects,
    },
    null,
    2,
  );
}

export function parseCustomObjectsState(
  content: string,
): CustomObjectsDriveState & { schemaVersion: number } {
  const parsed = JSON.parse(content) as {
    schema_version?: unknown;
    objects?: CustomObjectDefinition[];
  };
  if (typeof parsed.schema_version !== 'number') {
    throw new Error('El documento no tiene una versión de esquema válida.');
  }
  if (parsed.schema_version > CUSTOM_OBJECTS_STATE_SCHEMA_VERSION) {
    throw new Error('El documento es de una versión más nueva que la app.');
  }
  return {
    objects: parsed.objects ?? [],
    schemaVersion: parsed.schema_version,
  };
}
