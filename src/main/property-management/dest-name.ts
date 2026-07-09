import type { PropertyEntry } from '@shared/types/properties';

interface LooseHubspotRef {
  mode?: string;
  hubspotName?: string;
  definition?: { hubspotName?: string };
}

function isLooseRef(value: unknown): value is LooseHubspotRef {
  return typeof value === 'object' && value !== null;
}

/**
 * Nombre de la propiedad HubSpot destino de una entrada, defensivo (SPEC-0006 §39/§53.4): un
 * `hubspotProperty` malformado (estado importado/antiguo) no debe tumbar el sync ni el volcado.
 * Fuente única en el proceso main (equivalente al `destName` del renderer, §52).
 */
export function entryDestName(entry: PropertyEntry): string {
  const ref: unknown = entry.hubspotProperty;
  if (!isLooseRef(ref)) return '';
  if (ref.mode === 'existing') return ref.hubspotName ?? '';
  return ref.definition?.hubspotName ?? '';
}
