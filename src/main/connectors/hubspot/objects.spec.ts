import { describe, it, expect, vi } from 'vitest';
import { createObjectsApi, customObjectFromSchema, STANDARD_OBJECTS } from './objects';
import type { HubSpotResponse } from '@shared/types/hubspot';

describe('catálogo de objetos', () => {
  it('combina estándar + custom de la Schemas API', async () => {
    const request = vi.fn(
      (): Promise<HubSpotResponse> =>
        Promise.resolve({
          status: 200,
          data: {
            results: [
              {
                objectTypeId: '2-12345',
                name: 'machine',
                labels: { singular: 'Máquina', plural: 'Máquinas' },
              },
            ],
          },
        }),
    );
    const api = createObjectsApi({ request, projectId: 'p1' });

    const objects = await api.listObjects();

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/crm/v3/schemas' }),
    );
    expect(objects).toHaveLength(STANDARD_OBJECTS.length + 1);
    const custom = objects.find((o) => o.custom);
    expect(custom).toEqual({ objectType: '2-12345', label: 'Máquinas', custom: true });
  });

  it('si falla la Schemas API devuelve solo los estándar', async () => {
    const request = vi.fn(() => Promise.reject(new Error('403')));
    const api = createObjectsApi({ request, projectId: 'p1' });
    const objects = await api.listObjects();
    expect(objects).toEqual(STANDARD_OBJECTS);
  });

  it('customObjectFromSchema cae a fullyQualifiedName/name si falta objectTypeId', () => {
    expect(customObjectFromSchema({ name: 'thing', labels: { plural: 'Things' } })).toEqual({
      objectType: 'thing',
      label: 'Things',
      custom: true,
    });
  });
});
