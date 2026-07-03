/**
 * Variables de interpolación para los mensajes `*.syncSummary` (informe 2026-07-02, hallazgo 9.4).
 * Sustituye el doble cast `as unknown as Record<string, number>`: filtra a los campos numéricos
 * reales del resultado de sync, sin mentirle al tipado.
 */
export function syncSummaryVars(result: object): Record<string, number> {
  return Object.fromEntries(
    Object.entries(result).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  );
}
