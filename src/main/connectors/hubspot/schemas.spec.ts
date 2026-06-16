import { describe, it, expect, vi } from 'vitest';
import { createSchemasApi, toRemoteSchema } from './schemas';
import type { HubSpotResponse } from '@shared/types/hubspot';

function okResponse(data: unknown): Promise<HubSpotResponse> {
  return Promise.resolve({ status: 200, data });
}

describe('createSchemasApi', () => {
  it('listSchemas hace GET sobre /crm-object-schemas/v3/schemas con el entorno', async () => {
    const request = vi.fn(() =>
      okResponse({ results: [{ objectTypeId: '2-1', name: 'machine', labels: { plural: 'Máquinas' } }] }),
    );
    const api = createSchemasApi({ request, projectId: 'p1' });

    const schemas = await api.listSchemas('sandbox');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/crm-object-schemas/v3/schemas',
        environment: 'sandbox',
      }),
    );
    expect(schemas[0]?.objectTypeId).toBe('2-1');
  });

  it('createSchema hace POST con el payload y entorno', async () => {
    const request = vi.fn(() => okResponse({ objectTypeId: '2-9', fullyQualifiedName: 'p1_machine' }));
    const api = createSchemasApi({ request, projectId: 'p1' });

    await api.createSchema({ name: 'machine' }, 'production');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/crm-object-schemas/v3/schemas',
        environment: 'production',
        body: { name: 'machine' },
      }),
    );
  });

  it('updateSchema y deleteSchema usan el objectTypeId en el path', async () => {
    const request = vi.fn(() => okResponse({}));
    const api = createSchemasApi({ request, projectId: 'p1' });

    await api.updateSchema('2-3', { labels: { singular: 'X', plural: 'Xs' } }, 'sandbox');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PATCH', path: '/crm-object-schemas/v3/schemas/2-3' }),
    );

    await api.deleteSchema('2-3', 'sandbox');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', path: '/crm-object-schemas/v3/schemas/2-3' }),
    );
  });

  it('toRemoteSchema normaliza arrays ausentes', () => {
    const schema = toRemoteSchema({ objectTypeId: '2-5', name: 'thing' });
    expect(schema.requiredProperties).toEqual([]);
    expect(schema.searchableProperties).toEqual([]);
    expect(schema.archived).toBe(false);
  });
});
