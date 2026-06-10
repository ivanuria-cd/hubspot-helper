import { describe, it, expect } from 'vitest';
import { parseAccessTokenInfo, verifyToken } from './verify';

describe('verificación de token de HubSpot', () => {
  it('parsea hub_id, hub_domain y scopes', () => {
    const result = parseAccessTokenInfo({
      hub_id: 12345,
      hub_domain: 'acme.com',
      scopes: ['oauth', 'crm.objects.contacts.read'],
      user: 'ops@acme.com',
    });
    expect(result).toEqual({
      portalId: '12345',
      portalName: 'acme.com',
      scopes: ['oauth', 'crm.objects.contacts.read'],
      user: 'ops@acme.com',
    });
  });

  it('devuelve scopes vacíos cuando faltan', () => {
    expect(parseAccessTokenInfo({ hub_id: 1, hub_domain: 'x.com' }).scopes).toEqual([]);
  });

  it('verifyToken parsea el resultado del fetch inyectado', async () => {
    const result = await verifyToken('pat', {
      fetchInfo: () => Promise.resolve({ hub_id: 9, hub_domain: 'p.com', scopes: ['oauth'] }),
    });
    expect(result.portalId).toBe('9');
    expect(result.portalName).toBe('p.com');
  });
});
