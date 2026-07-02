/**
 * Propiedades de sistema / por defecto de HubSpot que NO deben recrearse (SPEC-0006 §43).
 * Una entrada en modo `existing` que apunta a una de estas sin remoto es un probable error de
 * nombre interno (relink), no un caso de `convert-to-new`.
 */

const COMMON_SYSTEM = new Set([
  'createdate',
  'closedate',
  'lastmodifieddate',
  'hs_lastmodifieddate',
  'hs_object_id',
  'hubspot_owner_id',
  'hubspot_owner_assigneddate',
  'hubspot_team_id',
  'hs_all_owner_ids',
  'hs_all_team_ids',
  'hs_created_by_user_id',
  'hs_updated_by_user_id',
  'archived',
]);

/** `true` si el nombre interno corresponde a una propiedad de sistema/por defecto de HubSpot. */
export function isSystemProperty(_objectType: string, name: string): boolean {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return false;
  if (n.startsWith('hs_')) return true;
  return COMMON_SYSTEM.has(n);
}
