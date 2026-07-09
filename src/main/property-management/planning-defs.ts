import type { HubSpotPropertyDef, PropertyEntry } from '@shared/types/properties';

/**
 * Helpers de definicion compartidos por el builder del mapa (planning-model) y el import
 * (planning-import), sin acoplar uno con otro (SPEC-0006 §53.8). ASCII intencionado.
 */

/** Definicion destino de una entrada (undefined si la entrada aun no la lleva). */
export function defOf(entry: PropertyEntry): HubSpotPropertyDef | undefined {
  return entry.hubspotProperty.definition;
}

/** Representacion legible del tipo (`type (fieldType)`) para el mapa y el changelog. */
export function typeDisplay(def: HubSpotPropertyDef | undefined): string {
  if (!def) return '';
  return def.fieldType ? `${def.type} (${def.fieldType})` : String(def.type ?? '');
}
