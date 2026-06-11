import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPropertyService } from './service';
import { createMemoryPropertyStore, type PropertyStore } from './store';
import type { PropertiesApi } from '../connectors/hubspot/properties';

let idCounter = 0;
function deps(store: PropertyStore, api: PropertiesApi) {
  return {
    store,
    propertiesApiFor: () => api,
    projectName: () => 'Acme',
    newId: () => `id-${(idCounter += 1)}`,
    now: () => '2026-06-10T00:00:00.000Z',
  };
}

function fakeApi(remote: Awaited<ReturnType<PropertiesApi['listProperties']>>): PropertiesApi {
  return {
    listProperties: vi.fn(() => Promise.resolve(remote)),
    createProperty: vi.fn(() => Promise.resolve({ status: 201, data: {} })),
    patchProperty: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
  };
}

describe('PropertyService', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('importa propiedades remotas en la sincronización inicial', async () => {
    const store = createMemoryPropertyStore();
    const api = fakeApi([
      {
        name: 'hs_lead_status',
        label: 'Lead status',
        type: 'enumeration',
        fieldType: 'select',
        groupName: 'contactinformation',
        hubspotDefined: true,
      },
    ]);
    const service = createPropertyService(deps(store, api));

    const summary = await service.syncHubspot({ projectId: 'p1' });

    expect(summary.updated).toBeGreaterThanOrEqual(1);
    const props = service.listProperties({ projectId: 'p1' });
    expect(props.some((p) => p.hubspotName === 'hs_lead_status')).toBe(true);
    expect(props.find((p) => p.hubspotName === 'hs_lead_status')?.isCustom).toBe(false);
  });

  it('CRUD de orígenes y exportación JSON', async () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeApi([])));

    const origin = await service.createOrigin({
      projectId: 'p1',
      origin: { name: 'SF', type: 'migration' },
    });
    expect(service.listOrigins({ projectId: 'p1' })).toHaveLength(1);

    const exported = service.exportJson({ projectId: 'p1', originId: origin.id });
    expect(exported.schema_version).toBe(1);
    expect(exported.origin.name).toBe('SF');

    await service.deleteOrigin({ projectId: 'p1', originId: origin.id });
    expect(service.listOrigins({ projectId: 'p1' })).toHaveLength(0);
  });

  it('aplica un cambio en sandbox y lo marca como aplicado tras respuesta OK', async () => {
    const store = createMemoryPropertyStore();
    // Propiedad local que no existe en HubSpot -> genera un cambio create.
    store.set('p1', {
      origins: [],
      mappings: [],
      properties: [
        {
          id: 'p-1',
          hubspotName: 'new_prop',
          label: 'Nueva',
          objectType: 'contacts',
          type: 'string',
          fieldType: 'text',
          groupName: 'custom',
          isCustom: true,
          hubspotStatus: 'missing',
        },
      ],
    });
    const api = fakeApi([]);
    const service = createPropertyService(deps(store, api));

    await service.syncHubspot({ projectId: 'p1' });
    const change = service
      .listProperties({ projectId: 'p1' })
      .flatMap((p) => p.pendingChanges ?? [])
      .find((c) => c.operation === 'create');
    expect(change).toBeTruthy();

    const result = await service.applyChange({
      projectId: 'p1',
      changeId: change!.id,
      environment: 'sandbox',
    });

    expect(result.success).toBe(true);
    expect(api.createProperty).toHaveBeenCalledWith('contacts', expect.anything(), 'sandbox');
    const applied = service
      .listProperties({ projectId: 'p1' })
      .flatMap((p) => p.pendingChanges ?? [])
      .find((c) => c.id === change!.id);
    expect(applied?.appliedToSandbox).toBe(true);
    expect(applied?.appliedToProduction).toBe(false);
  });
});
