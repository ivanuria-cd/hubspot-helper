/**
 * Documento de ESTADO companion del inventario de formularios (SPEC-0004 §15, SPEC-0008 §15).
 * Drive no es fuente de verdad: este JSON permite reimportar el estado local (formularios + links).
 * No se parsea el Sheets «bonito»; este documento es el contrato de carga.
 */
import type { FormOriginLink, HubSpotForm } from '@shared/types/forms';

export const FORMS_STATE_FEATURE_KEY = 'forms-management-state';
export const FORMS_STATE_SCHEMA_VERSION = 1;

export interface FormsDriveState {
  forms: HubSpotForm[];
  links: FormOriginLink[];
}

export function serializeFormsState(state: FormsDriveState): string {
  return JSON.stringify(
    {
      schema_version: FORMS_STATE_SCHEMA_VERSION,
      forms: state.forms,
      links: state.links,
    },
    null,
    2,
  );
}

export function parseFormsState(content: string): FormsDriveState & { schemaVersion: number } {
  const parsed = JSON.parse(content) as {
    schema_version?: unknown;
    forms?: HubSpotForm[];
    links?: FormOriginLink[];
  };
  if (typeof parsed.schema_version !== 'number') {
    throw new Error('El documento no tiene una versión de esquema válida.');
  }
  if (parsed.schema_version > FORMS_STATE_SCHEMA_VERSION) {
    throw new Error('El documento es de una versión más nueva que la app.');
  }
  return {
    forms: parsed.forms ?? [],
    links: parsed.links ?? [],
    schemaVersion: parsed.schema_version,
  };
}
