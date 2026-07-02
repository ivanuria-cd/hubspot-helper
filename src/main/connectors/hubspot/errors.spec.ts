import { describe, it, expect } from 'vitest';
import { hubspotErrorMessage } from './errors';

function err(status: number, message = 'detalle'): unknown {
  return { response: { status, data: { message } } };
}

describe('hubspotErrorMessage compartida (SPEC-0003 §19)', () => {
  it('mapea 401/403/429/400 a mensajes accionables conservando el detalle', () => {
    expect(hubspotErrorMessage(err(401))).toContain('Token de HubSpot no válido');
    expect(hubspotErrorMessage(err(403))).toContain('Permisos insuficientes');
    expect(hubspotErrorMessage(err(429))).toContain('Límite de peticiones');
    expect(hubspotErrorMessage(err(400))).toContain('datos inválidos');
    expect(hubspotErrorMessage(err(401))).toContain('detalle');
  });

  it('usa el sujeto en el conflicto 409 / OBJECT_ALREADY_EXISTS', () => {
    expect(hubspotErrorMessage(err(409), 'La propiedad')).toContain('La propiedad ya existe');
    expect(
      hubspotErrorMessage({ response: { data: { category: 'OBJECT_ALREADY_EXISTS', message: 'm' } } }),
    ).toContain('El recurso ya existe');
  });

  it('sin status conocido devuelve el detalle del body o el message', () => {
    expect(hubspotErrorMessage({ response: { data: { errors: [{ message: 'a' }, { message: 'b' }] } } })).toBe(
      'a; b',
    );
    expect(hubspotErrorMessage(new Error('boom'))).toBe('boom');
    expect(hubspotErrorMessage({})).toBe('Error en HubSpot');
  });
});
