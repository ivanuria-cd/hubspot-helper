import type { PropertyEntry } from '@shared/types/properties';

/** Type guard del dato malformado: modela lo que puede llegar de un estado importado/antiguo. */
interface LooseHubspotRef {
  mode?: string;
  hubspotName?: string;
  definition?: { hubspotName?: string };
}

function isLooseRef(value: unknown): value is LooseHubspotRef {
  return typeof value === 'object' && value !== null;
}

/**
 * Nombre de la propiedad HubSpot destino de una entrada, defensivo (SPEC-0006 §39): un dato
 * malformado no debe romper el render. Compartida por la pantalla y el panel (informe 2026-07-02,
 * hallazgo 9.5: estaba duplicada byte a byte con doble cast).
 */
export function destName(entry: PropertyEntry): string {
  const ref: unknown = entry.hubspotProperty;
  if (!isLooseRef(ref)) return '';
  if (ref.mode === 'existing') return ref.hubspotName ?? '';
  return ref.definition?.hubspotName ?? '';
}
