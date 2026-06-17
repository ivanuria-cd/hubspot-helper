/**
 * Documento de ESTADO companion del mapa de propiedades (SPEC-0004 §15, SPEC-0006 §21).
 * Drive no es fuente de verdad: este JSON permite reimportar el estado local (entradas + orígenes).
 * No se parsea el Sheets «bonito»; este documento es el contrato de carga.
 */
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';

export const PROPERTY_STATE_FEATURE_KEY = 'property-management-state';
export const PROPERTY_STATE_SCHEMA_VERSION = 1;

export interface PropertyDriveState {
  entries: PropertyEntry[];
  origins: DataOrigin[];
}

export function serializePropertyState(state: PropertyDriveState): string {
  return JSON.stringify(
    {
      schema_version: PROPERTY_STATE_SCHEMA_VERSION,
      entries: state.entries,
      origins: state.origins,
    },
    null,
    2,
  );
}

export function parsePropertyState(
  content: string,
): PropertyDriveState & { schemaVersion: number } {
  const parsed = JSON.parse(content) as {
    schema_version?: unknown;
    entries?: PropertyEntry[];
    origins?: DataOrigin[];
  };
  if (typeof parsed.schema_version !== 'number') {
    throw new Error('El documento no tiene una versión de esquema válida.');
  }
  if (parsed.schema_version > PROPERTY_STATE_SCHEMA_VERSION) {
    throw new Error('El documento es de una versión más nueva que la app.');
  }
  return {
    entries: parsed.entries ?? [],
    origins: parsed.origins ?? [],
    schemaVersion: parsed.schema_version,
  };
}
