import { describe, it, expect } from 'vitest';
import { parseAccessTokenInfo, verifyToken } from './verify';

describe('verificación de token de HubSpot', () => {
  it('parsea portalId y portalName de /account-info/v3/details', () => {
    const result = parseAccessTokenInfo({
      portalId: 12345,
      portalName: 'acme.com',
    });
    expect(result).toEqual({
      portalId: '12345',
      portalName: 'acme.com',
    });
  });

  it('verifyToken parsea el resultado del fetch inyectado', async () => {
    const result = await verifyToken('pat', {
      fetchInfo: () => Promise.resolve({ portalId: 9, portalName: 'p.com' }),
    });
    expect(result.portalId).toBe('9');
    expect(result.portalName).toBe('p.com');
  });
});
