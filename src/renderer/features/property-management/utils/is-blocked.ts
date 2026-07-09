import type { PropertyEntry } from '@shared/types/properties';

/**
 * Una entrada está «bloqueada» si (modo existing) apunta a una propiedad HubSpot que no existe: no genera
 * cambio y necesita «Convertir a Nueva» (SPEC-0006 §35). Fuente única del predicado (§53.13).
 */
export function isBlockedEntry(entry: PropertyEntry): boolean {
  return entry.hubspotStatus === 'missing' && entry.hubspotProperty.mode === 'existing';
}
