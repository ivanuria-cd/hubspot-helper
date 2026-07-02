/**
 * Traducción compartida de errores de HubSpot a mensajes accionables (SPEC-0003 §19).
 * Versión única de la antigua `hubspotErrorMessage` triplicada en propiedades (rica, §39.9 de
 * SPEC-0006), formularios y objetos custom (pobres, sin mapeo de status).
 */

interface HubSpotErrorShape {
  response?: {
    status?: number;
    data?: { message?: string; category?: string; errors?: Array<{ message?: string }> };
  };
  message?: string;
}

/**
 * Mensaje accionable según status/categoría, conservando el detalle del body.
 * `subject` nombra el recurso en el mensaje de conflicto 409 (p. ej. «La propiedad»).
 */
export function hubspotErrorMessage(error: unknown, subject = 'El recurso'): string {
  const e = error as HubSpotErrorShape;
  const status = e?.response?.status;
  const data = e?.response?.data;
  const base =
    data?.message ||
    (data?.errors ?? []).map((x) => x.message).filter(Boolean).join('; ') ||
    e?.message ||
    'Error en HubSpot';
  if (status === 401) return `Token de HubSpot no válido o caducado: revisa el PAT del entorno. (${base})`;
  if (status === 403)
    return `Permisos insuficientes: al token le faltan scopes para esta operación. (${base})`;
  if (status === 429) return `Límite de peticiones de HubSpot alcanzado; reintenta en unos segundos. (${base})`;
  if (status === 409 || data?.category === 'OBJECT_ALREADY_EXISTS')
    return `${subject} ya existe en el entorno destino. (${base})`;
  if (status === 400) return `HubSpot rechazó la petición (datos inválidos): ${base}`;
  return base;
}
