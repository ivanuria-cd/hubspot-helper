/**
 * Contrato del mapa de campos editable (SPEC-0016). Compartido main/preload/renderer.
 */
import type { HsPropertyType, NumberDisplayHint, TextDisplayHint } from '@shared/types/properties';

/** Configuracion concreta de HubSpot a la que resuelve un tipo user-friendly (SPEC-0016 D6). */
export interface HubSpotFieldConfig {
  type: HsPropertyType;
  fieldType: string;
  numberDisplayHint?: NumberDisplayHint;
  showCurrencySymbol?: boolean;
  textDisplayHint?: TextDisplayHint;
}

/** Clave estable del tipo user-friendly; la etiqueta visible va por i18n. */
export type UserFriendlyFieldTypeKey =
  | 'text'
  | 'long_text'
  | 'rich_text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'duration'
  | 'phone'
  | 'email'
  | 'date'
  | 'datetime'
  | 'choice'
  | 'dropdown'
  | 'radio'
  | 'multiple_checkboxes'
  | 'yes_no'
  | 'file'
  | 'calculation';

/** Un tipo user-friendly resuelve a 1..N configuraciones: >1 exige accion del usuario. */
export interface UserFriendlyFieldType {
  key: UserFriendlyFieldTypeKey;
  configs: HubSpotFieldConfig[];
}

/** Asociacion registro<->registro (D4, solo informativa; no participa en la ingest). */
export interface PlanningAssociation {
  objetoA: string;
  objetoB: string;
  claveEnlace: string;
  notas?: string;
}

export type PlanningChangeKind =
  | 'entry-added'
  | 'entry-removed'
  | 'mapping-changed'
  | 'definition-changed';

export interface PlanningChange {
  kind: PlanningChangeKind;
  objectType: string;
  entryName: string;
  hubspotName?: string;
  detail: string;
}

/** Campo cuyo tipo user-friendly es ambiguo (varias configs) y requiere resolucion. */
export interface PlanningNeedsAction {
  objectType: string;
  entryName: string;
  userFriendlyType: UserFriendlyFieldTypeKey;
  candidates: HubSpotFieldConfig[];
}

/** Comparacion del mapa rellenado con el estado, previa a crear borradores (SPEC-0016 2.6). */
export interface PlanningChangelog {
  changes: PlanningChange[];
  needsAction: PlanningNeedsAction[];
}
