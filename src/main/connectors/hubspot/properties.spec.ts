import { describe, it, expect, vi } from 'vitest';
import { createPropertiesApi, toRemoteProperty } from './properties';
import type { HubSpotRequest, HubSpotResponse } from '@shared/types/hubspot';

describe('CRM Properties API v3', () => {
  it('normaliza la respuesta de listProperties', async () => {
    const request = vi.fn(
      (): Promise<HubSpotResponse> =>
        Promise.resolve({
          status: 200,
          data: {
            results: [
              {
                name: 'hs_lead_status',
                label: 'Lead status',
                type: 'enumeration',
                fieldType: 'select',
                groupName: 'contactinformation',
                hubspotDefined: true,
                options: [{ label: 'New', value: 'new' }],
              },
              {
                name: 'custom_tier',
                label: 'Tier',
                type: 'radio_unknown',
                fieldType: 'radio',
                groupName: 'custom',
              },
            ],
          },
        }),
    );
    const api = createPropertiesApi({ request, projectId: 'p1' });

    const props = await api.listProperties('contacts');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/crm/v3/properties/contacts' }),
    );
    expect(props).toHaveLength(2);
    expect(props[0]?.options?.[0]).toEqual({
      label: 'New',
      value: 'new',
      displayOrder: 0,
      hidden: false,
    });
    expect(props[0]?.type).toBe('enumeration');
    // Tipo desconocido cae a 'string'
    expect(props[1]?.type).toBe('string');
  });

  it('createProperty hace POST al objeto con el payload', async () => {
    const calls: HubSpotRequest[] = [];
    const request = vi.fn((req: HubSpotRequest) => {
      calls.push(req);
      return Promise.resolve({ status: 201, data: {} });
    });
    const api = createPropertiesApi({ request, projectId: 'p1' });

    await api.createProperty('contacts', { name: 'x' }, 'sandbox');

    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/crm/v3/properties/contacts',
      environment: 'sandbox',
      body: { name: 'x' },
    });
  });

  it('patchProperty hace PATCH a la propiedad concreta', async () => {
    const request = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
    const api = createPropertiesApi({ request, projectId: 'p1' });

    await api.patchProperty('contacts', 'custom_tier', { label: 'Nuevo' }, 'production');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: '/crm/v3/properties/contacts/custom_tier',
        environment: 'production',
      }),
    );
  });

  it('toRemoteProperty marca hubspotDefined por defecto en false', () => {
    const remote = toRemoteProperty({
      name: 'n',
      label: 'l',
      type: 'string',
      fieldType: 'text',
      groupName: 'g',
    });
    expect(remote.hubspotDefined).toBe(false);
  });
});
