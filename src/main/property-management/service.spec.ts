import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPropertyService } from './service';
import { createMemoryPropertyStore, type PropertyStore } from './store';
import type { PropertiesApi, RemoteProperty } from '../connectors/hubspot/properties';
import type { ObjectsApi } from '../connectors/hubspot/objects';
import type { HubSpotObject } from '@shared/types/properties';

let idCounter = 0;

function fakeProperties(remote: Omit<RemoteProperty, 'objectType'>[] = []): PropertiesApi {
  return {
    listProperties: vi.fn((objectType: string) =>
      Promise.resolve(remote.map((r) => ({ ...r, objectType }))),
    ),
    createProperty: vi.fn(() => Promise.resolve({ status: 201, data: {} })),
    patchProperty: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    deleteProperty: vi.fn(() => Promise.resolve({ status: 204, data: {} })),
    listGroups: vi.fn(() => Promise.resolve([])),
    createGroup: vi.fn((_objectType: string, g: { name: string; label: string }) =>
      Promise.resolve(g),
    ),
    deleteGroup: vi.fn(() => Promise.resolve({ status: 204, data: {} })),
  };
}

function fakeObjects(objects: HubSpotObject[] = []): ObjectsApi {
  return { listObjects: vi.fn(() => Promise.resolve(objects)) };
}

function deps(store: PropertyStore, props: PropertiesApi, objs: ObjectsApi) {
  return {
    store,
    propertiesApiFor: () => props,
    objectsApiFor: () => objs,
    newId: () => `id-${(idCounter += 1)}`,
    now: () => '2026-06-11T00:00:00.000Z',
  };
}

describe('PropertyService (entradas)', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('lista objetos del conector', async () => {
    const objs = fakeObjects([{ objectType: 'contacts', label: 'Contactos', custom: false }]);
    const service = createPropertyService(
      deps(createMemoryPropertyStore(), fakeProperties(), objs),
    );
    const result = await service.listObjects({ projectId: 'p1' });
    expect(result[0]?.objectType).toBe('contacts');
  });

  it('upsert + listEntries filtra por objeto', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Tier',
        hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
        sources: [],
      },
    });
    expect(service.listEntries({ projectId: 'p1' })).toHaveLength(1);
    expect(service.listEntries({ projectId: 'p1', objectType: 'deals' })).toHaveLength(0);
  });

  it('sync con entrada nueva -> missing + create, y applyChange en sandbox la marca', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'new_prop',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'custom',
          },
        },
        sources: [],
      },
    });

    const summary = await service.syncHubspot({ projectId: 'p1' });
    expect(summary.missing).toBe(1);

    const change = service
      .listEntries({ projectId: 'p1' })
      .flatMap((e) => e.pendingChanges ?? [])
      .find((c) => c.operation === 'create');
    expect(change).toBeTruthy();

    const result = await service.applyChange({
      projectId: 'p1',
      changeId: change!.id,
      environment: 'sandbox',
    });
    expect(result.success).toBe(true);
    expect(props.createProperty).toHaveBeenCalledWith('contacts', expect.anything(), 'sandbox');

    const applied = service
      .listEntries({ projectId: 'p1' })
      .flatMap((e) => e.pendingChanges ?? [])
      .find((c) => c.id === change!.id);
    expect(applied?.appliedToSandbox).toBe(true);
    expect(applied?.appliedToProduction).toBe(false);
  });

  it('§54.2: applyChange referencia el cambio por entryId + operation', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'new_prop',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'custom',
          },
        },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    const entry = service.listEntries({ projectId: 'p1' })[0];

    const result = await service.applyChange({
      projectId: 'p1',
      entryId: entry.id,
      operation: 'create',
      environment: 'sandbox',
    });
    expect(result.success).toBe(true);
    const applied = service
      .listEntries({ projectId: 'p1' })[0]
      .pendingChanges?.find((c) => c.operation === 'create');
    expect(applied?.appliedToSandbox).toBe(true);
  });

  it('§54.3: un re-sync no revierte appliedToSandbox ni cambia el id del create aplicado', async () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties([]), fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'new_prop',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'custom',
          },
        },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    const entry = service.listEntries({ projectId: 'p1' })[0];
    await service.applyChange({
      projectId: 'p1',
      entryId: entry.id,
      operation: 'create',
      environment: 'sandbox',
    });
    const before = service
      .listEntries({ projectId: 'p1' })[0]
      .pendingChanges!.find((c) => c.operation === 'create')!;

    await service.syncHubspot({ projectId: 'p1' });
    const after = service
      .listEntries({ projectId: 'p1' })[0]
      .pendingChanges!.find((c) => c.operation === 'create')!;
    expect(after.id).toBe(before.id);
    expect(after.appliedToSandbox).toBe(true);
  });

  it('§54.2: applyChangeBatch aplica en lote y un fallo por ítem no aborta el resto', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'A',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'a',
            label: 'A',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    const entry = service.listEntries({ projectId: 'p1' })[0];
    const { results } = await service.applyChangeBatch({
      projectId: 'p1',
      environment: 'sandbox',
      refs: [
        { entryId: entry.id, operation: 'create' },
        { entryId: 'nope', operation: 'create' },
      ],
    });
    expect(results.map((r) => r.ok)).toEqual([true, false]);
    expect(props.createProperty).toHaveBeenCalledTimes(1);
  });

  it('§54.2: applyAllChanges aplica todos los pendientes de un objeto y cuenta aplicados', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    const service = createPropertyService(deps(store, props, fakeObjects()));
    for (const n of ['a', 'b']) {
      service.upsertEntry({
        projectId: 'p1',
        entry: {
          objectType: 'contacts',
          name: n,
          hubspotProperty: {
            mode: 'new',
            definition: {
              hubspotName: n,
              label: n,
              type: 'string',
              fieldType: 'text',
              groupName: 'g',
            },
          },
          sources: [],
        },
      });
    }
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'deals',
        name: 'z',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'z',
            label: 'z',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    const result = await service.applyAllChanges({
      projectId: 'p1',
      environment: 'sandbox',
      objectType: 'contacts',
    });
    expect(result.applied).toBe(2);
    expect(result.failed).toBe(0);
    expect(props.createProperty).toHaveBeenCalledTimes(2);
  });

  it('getDriveMeta refleja cambios y markDriveWritten limpia el dirty', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));

    expect(service.getDriveMeta({ projectId: 'p1' })).toEqual({
      lastWrittenAt: null,
      lastChangedAt: null,
    });

    service.createOrigin({ projectId: 'p1', origin: { name: 'SF', type: 'migration' } });
    const afterChange = service.getDriveMeta({ projectId: 'p1' });
    expect(afterChange.lastChangedAt).toBe('2026-06-11T00:00:00.000Z');
    expect(afterChange.lastWrittenAt).toBeNull();

    service.markDriveWritten({ projectId: 'p1' });
    const afterWrite = service.getDriveMeta({ projectId: 'p1' });
    expect(afterWrite.lastWrittenAt).toBe('2026-06-11T00:00:00.000Z');
  });

  it('applyDriveState reemplaza estado y deja lastWritten === lastChanged', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));

    service.applyDriveState(
      { projectId: 'p1' },
      {
        origins: [
          {
            id: 'o1',
            name: 'SF',
            type: 'migration',
            objects: [],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        entries: [
          {
            id: 'e1',
            objectType: 'contacts',
            name: 'Tier',
            hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
            sources: [],
            hubspotStatus: 'exists',
            pendingChanges: [],
          },
        ],
      },
    );

    expect(service.listOrigins({ projectId: 'p1' })).toHaveLength(1);
    expect(service.listEntries({ projectId: 'p1' })).toHaveLength(1);
    const meta = service.getDriveMeta({ projectId: 'p1' });
    expect(meta.lastWrittenAt).toBe('2026-06-11T00:00:00.000Z');
    expect(meta.lastChangedAt).toBe(meta.lastWrittenAt);
  });

  it('§39: upsertEntry rechaza hubspotProperty como string', () => {
    const service = createPropertyService(
      deps(createMemoryPropertyStore(), fakeProperties(), fakeObjects()),
    );
    expect(() =>
      service.upsertEntry({
        projectId: 'p1',
        entry: {
          objectType: 'contacts',
          name: 'X',
          hubspotProperty: 'firstname' as never,
          sources: [],
        },
      }),
    ).toThrow(/hubspotProperty/);
  });

  it('§39: upsertEntry rechaza sources como array de strings', () => {
    const service = createPropertyService(
      deps(createMemoryPropertyStore(), fakeProperties(), fakeObjects()),
    );
    expect(() =>
      service.upsertEntry({
        projectId: 'p1',
        entry: {
          objectType: 'contacts',
          name: 'X',
          hubspotProperty: { mode: 'existing', hubspotName: 'firstname' },
          sources: ['0bc11910' as never],
        },
      }),
    ).toThrow(/sources/);
  });

  it('upsertEntry rechaza un originId inexistente en sources', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    expect(() =>
      service.upsertEntry({
        projectId: 'p1',
        entry: {
          objectType: 'contacts',
          name: 'X',
          hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
          sources: [
            { id: 's1', originId: 'no-existe', sourceField: 'F', definition: { kind: 'text' } },
          ],
        },
      }),
    ).toThrow(/Origen no encontrado/);
  });

  it('upsertEntry acepta un source cuyo originId existe', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    const origin = service.createOrigin({
      projectId: 'p1',
      origin: { name: 'SF', type: 'migration' },
    });
    const entry = service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'X',
        hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
        sources: [
          { id: 's1', originId: origin.id, sourceField: 'F', definition: { kind: 'text' } },
        ],
      },
    });
    expect(entry.sources[0]?.originId).toBe(origin.id);
  });

  it('§41: editar el destino de una entrada limpia los cambios pendientes huérfanos', async () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties([]), fakeObjects()));
    const created = service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'np_old',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    expect(
      (service.listEntries({ projectId: 'p1' })[0]?.pendingChanges ?? []).length,
    ).toBeGreaterThan(0);

    service.upsertEntry({
      projectId: 'p1',
      entry: {
        id: created.id,
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'np_new',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    expect(service.listEntries({ projectId: 'p1' })[0]?.pendingChanges).toEqual([]);
  });

  it('§44: rechaza dos entradas nuevas que crean el mismo hubspotName', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    const def = (hubspotName: string) =>
      ({
        mode: 'new',
        definition: { hubspotName, label: 'X', type: 'string', fieldType: 'text', groupName: 'g' },
      }) as const;
    service.upsertEntry({
      projectId: 'p1',
      entry: { objectType: 'contacts', name: 'A', hubspotProperty: def('dup_name'), sources: [] },
    });
    expect(() =>
      service.upsertEntry({
        projectId: 'p1',
        entry: { objectType: 'contacts', name: 'B', hubspotProperty: def('dup_name'), sources: [] },
      }),
    ).toThrow(/dup_name/);
  });

  it('§47: syncHubspot no pisa una entrada creada durante el sync (relectura del store)', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Previa',
        hubspotProperty: { mode: 'existing', hubspotName: 'prev' },
        sources: [],
      },
    });
    // listProperties inserta una entrada nueva "en mitad" del sync (simula UI/MCP concurrentes).
    (props.listProperties as ReturnType<typeof vi.fn>).mockImplementation(() => {
      service.upsertEntry({
        projectId: 'p1',
        entry: {
          objectType: 'deals',
          name: 'Concurrente',
          hubspotProperty: { mode: 'existing', hubspotName: 'conc' },
          sources: [],
        },
      });
      return Promise.resolve([]);
    });
    await service.syncHubspot({ projectId: 'p1' });
    const names = service.listEntries({ projectId: 'p1' }).map((e) => e.name);
    expect(names).toContain('Concurrente');
    expect(names).toContain('Previa');
  });

  it('§53.1: applyGroupChange no pisa una entrada creada durante el borrado (relectura del store)', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]); // grupo vacío en el entorno destino
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.requestGroupDelete({ projectId: 'p1', objectType: 'contacts', groupName: 'g1' });
    const change = service.listGroupChanges({ projectId: 'p1' })[0];
    // listProperties (dentro de applyGroupChange) inserta una entrada concurrente.
    (props.listProperties as ReturnType<typeof vi.fn>).mockImplementation(() => {
      service.upsertEntry({
        projectId: 'p1',
        entry: {
          objectType: 'deals',
          name: 'Concurrente',
          hubspotProperty: { mode: 'existing', hubspotName: 'conc' },
          sources: [],
        },
      });
      return Promise.resolve([]);
    });
    const result = await service.applyGroupChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'production',
    });
    expect(result.success).toBe(true);
    expect(service.listEntries({ projectId: 'p1' }).map((e) => e.name)).toContain('Concurrente');
    expect(service.listGroupChanges({ projectId: 'p1' })).toHaveLength(0);
  });

  it('§47: updateOrigin lanza si el id no existe y devuelve el origen fusionado si existe', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    expect(() =>
      service.updateOrigin({
        projectId: 'p1',
        origin: { id: 'no-existe', name: 'X', type: 'user', createdAt: '2026-06-11T00:00:00.000Z' },
      }),
    ).toThrow('Origen no encontrado');
    const created = service.createOrigin({
      projectId: 'p1',
      origin: { name: 'CRM', type: 'integration', description: 'desc' },
    });
    const updated = service.updateOrigin({
      projectId: 'p1',
      origin: { id: created.id, name: 'CRM v2', type: 'integration', createdAt: created.createdAt },
    });
    expect(updated.name).toBe('CRM v2');
    expect(updated.description).toBe('desc');
  });

  it('SPEC-0016 D2: setObjectFields normaliza y exige origen/objeto existentes', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    const origin = service.createOrigin({
      projectId: 'p1',
      origin: { name: 'Pipedrive', type: 'migration' },
    });
    service.updateOrigin({
      projectId: 'p1',
      origin: { ...origin, objects: [{ id: 'obj1', name: 'People' }] },
    });

    expect(() =>
      service.setObjectFields({ projectId: 'p1', originId: 'nope', objectId: 'obj1', fields: [] }),
    ).toThrow('Origen no encontrado');
    expect(() =>
      service.setObjectFields({
        projectId: 'p1',
        originId: origin.id,
        objectId: 'nope',
        fields: [],
      }),
    ).toThrow('Objeto de origen no encontrado');

    const updated = service.setObjectFields({
      projectId: 'p1',
      originId: origin.id,
      objectId: 'obj1',
      fields: [' email ', 'email', 'first_name', ''],
    });
    expect(updated.objects?.[0]?.fields).toEqual(['email', 'first_name']);
  });

  it('H1: syncHubspot salta un objeto cuyo listProperties falla, sin abortar', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    // El objeto 'broken' lanza; 'contacts' responde vacío.
    (props.listProperties as ReturnType<typeof vi.fn>).mockImplementation((objectType: string) => {
      if (objectType === 'broken') return Promise.reject(new Error('400'));
      return Promise.resolve([]);
    });
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'broken',
        name: 'Resto',
        hubspotProperty: { mode: 'existing', hubspotName: 'x' },
        sources: [],
      },
    });
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'np',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    const summary = await service.syncHubspot({ projectId: 'p1' });
    // No lanza; reconcilia solo 'contacts' (1 missing) y deja la entrada de 'broken' intacta.
    expect(summary.missing).toBe(1);
    expect(service.listEntries({ projectId: 'p1' })).toHaveLength(2);
  });

  it('H2: applyChange (create) garantiza el grupo en el entorno destino si falta', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    (props.listGroups as ReturnType<typeof vi.fn>).mockResolvedValue([]); // grupo ausente
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'np',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'gym_information',
          },
        },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    const change = service
      .listEntries({ projectId: 'p1' })
      .flatMap((e) => e.pendingChanges ?? [])[0];
    await service.applyChange({ projectId: 'p1', changeId: change.id, environment: 'production' });
    expect(props.createGroup).toHaveBeenCalledWith(
      'contacts',
      { name: 'gym_information', label: 'gym_information' },
      'production',
    );
  });

  it('requestDelete genera un cambio delete al sincronizar y applyChange archiva en HubSpot', async () => {
    const store = createMemoryPropertyStore();
    // La propiedad destino existe en HubSpot (remoto), para que el borrado tenga efecto.
    const props = fakeProperties([
      { name: 'custom_tier', label: 'Tier', type: 'string', fieldType: 'text', groupName: 'g' },
    ]);
    const service = createPropertyService(deps(store, props, fakeObjects()));
    const entry = service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Tier',
        hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
        sources: [],
      },
    });

    expect(service.requestDelete({ projectId: 'p1', entryId: entry.id })).toEqual({
      success: true,
    });
    await service.syncHubspot({ projectId: 'p1' });
    const change = service
      .listEntries({ projectId: 'p1' })
      .flatMap((e) => e.pendingChanges ?? [])
      .find((c) => c.operation === 'delete');
    expect(change).toBeTruthy();

    const result = await service.applyChange({
      projectId: 'p1',
      changeId: change!.id,
      environment: 'production',
    });
    expect(result.success).toBe(true);
    expect(props.deleteProperty).toHaveBeenCalledWith('contacts', 'custom_tier', 'production');
  });

  it('requestDelete devuelve error si la entrada no existe', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    expect(service.requestDelete({ projectId: 'p1', entryId: 'nope' })).toEqual({
      success: false,
      error: 'Entrada no encontrada',
    });
  });

  it('H3: discardChange devuelve error si el changeId no existe', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    expect(service.discardChange({ projectId: 'p1', changeId: 'no-existe' })).toEqual({
      success: false,
      error: 'Cambio no encontrado',
    });
  });

  it('§38: applyChange (create) ya existente en el entorno reconcilia y aplica el update', async () => {
    const store = createMemoryPropertyStore();
    // En producción no existe (estado §37); en sandbox existe con etiqueta distinta.
    const props = fakeProperties([]);
    (props.listProperties as ReturnType<typeof vi.fn>).mockImplementation(
      (objectType: string, environment?: string) => {
        if (environment === 'sandbox') {
          return Promise.resolve([
            {
              name: 'x',
              objectType,
              label: 'Vieja',
              type: 'string',
              fieldType: 'text',
              groupName: 'g',
              options: [],
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    (props.createProperty as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        status: 409,
        data: {
          category: 'OBJECT_ALREADY_EXISTS',
          message: "A property named 'x' already exists.",
        },
      },
    });
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'X',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'x',
            label: 'X',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    const change = service
      .listEntries({ projectId: 'p1' })
      .flatMap((e) => e.pendingChanges ?? [])[0];
    const result = await service.applyChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'sandbox',
    });
    expect(result.success).toBe(true);
    // La etiqueta difiere ('X' vs 'Vieja') → se aplica un patch de actualización en sandbox.
    expect(props.patchProperty).toHaveBeenCalledWith('contacts', 'x', { label: 'X' }, 'sandbox');
    const applied = service
      .listEntries({ projectId: 'p1' })
      .flatMap((e) => e.pendingChanges ?? [])
      .find((c) => c.id === change.id);
    expect(applied?.appliedToSandbox).toBe(true);
  });

  it('§37 (corregido): syncHubspot reconcilia contra el entorno activo (sin forzar production)', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Tier',
        hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
        sources: [],
      },
    });
    await service.syncHubspot({ projectId: 'p1' });
    expect(props.listProperties).toHaveBeenCalledWith('contacts', undefined);
  });

  it('§37.6: productionView reconcilia contra producción sin persistir el estado', async () => {
    const store = createMemoryPropertyStore();
    const props = fakeProperties([]);
    (props.listProperties as ReturnType<typeof vi.fn>).mockImplementation(
      (objectType: string, environment?: string) =>
        Promise.resolve(
          environment === 'production'
            ? [
                {
                  name: 'custom_tier',
                  objectType,
                  label: 'Tier',
                  type: 'string',
                  fieldType: 'text',
                  groupName: 'g',
                  options: [],
                },
              ]
            : [],
        ),
    );
    const service = createPropertyService(deps(store, props, fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Tier',
        hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
        sources: [],
      },
    });
    // Entorno activo (undefined ⇒ sin remotos): estado persistido = missing.
    await service.syncHubspot({ projectId: 'p1' });
    expect(service.listEntries({ projectId: 'p1' })[0].hubspotStatus).toBe('missing');
    // Vista de producción: la propiedad existe en producción ⇒ exists.
    const prod = await service.productionView({ projectId: 'p1' });
    expect(prod[0].hubspotStatus).toBe('exists');
    expect(props.listProperties).toHaveBeenCalledWith('contacts', 'production');
    // No persiste: el estado persistido sigue en missing.
    expect(service.listEntries({ projectId: 'p1' })[0].hubspotStatus).toBe('missing');
  });

  it('sync expone blockers para entradas existing sin remoto (SPEC-0006 §35)', async () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties([]), fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Numero de historia',
        hubspotProperty: { mode: 'existing', hubspotName: 'h_clinica' },
        sources: [],
      },
    });
    const summary = await service.syncHubspot({ projectId: 'p1' });
    expect(summary.blocked).toBe(1);
    expect(summary.blockers[0]?.hubspotName).toBe('h_clinica');
    expect(summary.blockers[0]?.remediation).toBe('convert-to-new');
  });

  it('convertEntryToNew sin definición cacheada siembra una mínima válida y genera create al sincronizar', async () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties([]), fakeObjects()));
    const entry = service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Primer apellido',
        hubspotProperty: { mode: 'existing', hubspotName: 'primer_apellido' },
        sources: [],
      },
    });

    const res = service.convertEntryToNew({ projectId: 'p1', entryId: entry.id });
    expect(res).toEqual({ success: true, seeded: true });

    const converted = service.listEntries({ projectId: 'p1' })[0];
    expect(converted?.hubspotProperty.mode).toBe('new');
    expect(
      converted?.hubspotProperty.mode === 'new' && converted.hubspotProperty.definition.hubspotName,
    ).toBe('primer_apellido');

    const summary = await service.syncHubspot({ projectId: 'p1' });
    expect(summary.blocked).toBe(0);
    const change = service
      .listEntries({ projectId: 'p1' })
      .flatMap((e) => e.pendingChanges ?? [])
      .find((c) => c.operation === 'create');
    expect(change).toBeTruthy();
  });

  it('convertEntryToNew reutiliza la definición cacheada (no seeded)', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties([]), fakeObjects()));
    const entry = service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Tier',
        hubspotProperty: {
          mode: 'existing',
          hubspotName: 'custom_tier',
          definition: {
            hubspotName: 'custom_tier',
            label: 'Tier',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    const res = service.convertEntryToNew({ projectId: 'p1', entryId: entry.id });
    expect(res).toEqual({ success: true, seeded: false });
  });

  it('convertEntryToNew es idempotente sobre una entrada ya new', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties([]), fakeObjects()));
    const entry = service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'Nueva',
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: 'np',
            label: 'Nueva',
            type: 'string',
            fieldType: 'text',
            groupName: 'g',
          },
        },
        sources: [],
      },
    });
    expect(service.convertEntryToNew({ projectId: 'p1', entryId: entry.id })).toEqual({
      success: true,
      seeded: false,
    });
  });

  it('convertMissingToNew convierte en bloque y respeta el filtro por objeto', async () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties([]), fakeObjects()));
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'contacts',
        name: 'A',
        hubspotProperty: { mode: 'existing', hubspotName: 'a' },
        sources: [],
      },
    });
    service.upsertEntry({
      projectId: 'p1',
      entry: {
        objectType: 'companies',
        name: 'B',
        hubspotProperty: { mode: 'existing', hubspotName: 'b' },
        sources: [],
      },
    });
    // El estado `missing` lo fija la sincronización (ambos objetos sin remoto).
    await service.syncHubspot({ projectId: 'p1' });
    const res = service.convertMissingToNew({ projectId: 'p1', objectType: 'contacts' });
    expect(res).toEqual({ converted: 1, seeded: 1 });
    const byObject = service.listEntries({ projectId: 'p1' });
    expect(byObject.find((e) => e.objectType === 'contacts')?.hubspotProperty.mode).toBe('new');
    expect(byObject.find((e) => e.objectType === 'companies')?.hubspotProperty.mode).toBe(
      'existing',
    );
  });

  it('CRUD de origenes y exportacion JSON v2', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    const origin = service.createOrigin({
      projectId: 'p1',
      origin: { name: 'SF', type: 'migration' },
    });
    expect(service.listOrigins({ projectId: 'p1' })).toHaveLength(1);
    const exported = service.exportJson({ projectId: 'p1', originId: origin.id });
    expect(exported.schema_version).toBe(2);
    expect(exported.origin.name).toBe('SF');
    service.deleteOrigin({ projectId: 'p1', originId: origin.id });
    expect(service.listOrigins({ projectId: 'p1' })).toHaveLength(0);
  });
});

describe('PropertyService (borrado de grupos, SPEC-0006 §33)', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('requestGroupDelete crea un cambio pendiente y listGroupChanges lo devuelve', () => {
    const service = createPropertyService(
      deps(createMemoryPropertyStore(), fakeProperties(), fakeObjects()),
    );
    expect(
      service.requestGroupDelete({
        projectId: 'p1',
        objectType: 'contacts',
        groupName: 'gym_info',
        label: 'Gimnasio',
      }),
    ).toEqual({ success: true });
    const changes = service.listGroupChanges({ projectId: 'p1' });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      objectType: 'contacts',
      groupName: 'gym_info',
      appliedToProduction: false,
    });
  });

  it('requestGroupDelete rechaza un duplicado para el mismo objeto/grupo', () => {
    const service = createPropertyService(
      deps(createMemoryPropertyStore(), fakeProperties(), fakeObjects()),
    );
    service.requestGroupDelete({ projectId: 'p1', objectType: 'contacts', groupName: 'gym_info' });
    expect(
      service.requestGroupDelete({
        projectId: 'p1',
        objectType: 'contacts',
        groupName: 'gym_info',
      }),
    ).toEqual({ success: false, error: 'Ya hay un borrado pendiente para ese grupo' });
  });

  it('applyGroupChange rechaza si el grupo no está vacío y no llama a deleteGroup', async () => {
    // Una propiedad remota pertenece al grupo ⇒ no vacío.
    const props = fakeProperties([
      { name: 'p', label: 'P', type: 'string', fieldType: 'text', groupName: 'gym_info' },
    ]);
    const service = createPropertyService(deps(createMemoryPropertyStore(), props, fakeObjects()));
    service.requestGroupDelete({ projectId: 'p1', objectType: 'contacts', groupName: 'gym_info' });
    const change = service.listGroupChanges({ projectId: 'p1' })[0];
    const result = await service.applyGroupChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'production',
    });
    expect(result.success).toBe(false);
    expect(props.deleteGroup).not.toHaveBeenCalled();
    // El cambio sigue pendiente al no aplicarse.
    expect(service.listGroupChanges({ projectId: 'p1' })).toHaveLength(1);
  });

  it('applyGroupChange en producción borra el grupo vacío y retira el cambio', async () => {
    const props = fakeProperties([]); // sin propiedades ⇒ grupo vacío
    const service = createPropertyService(deps(createMemoryPropertyStore(), props, fakeObjects()));
    service.requestGroupDelete({ projectId: 'p1', objectType: 'contacts', groupName: 'gym_info' });
    const change = service.listGroupChanges({ projectId: 'p1' })[0];
    const result = await service.applyGroupChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'production',
    });
    expect(result.success).toBe(true);
    expect(props.deleteGroup).toHaveBeenCalledWith('contacts', 'gym_info', 'production');
    expect(service.listGroupChanges({ projectId: 'p1' })).toHaveLength(0);
  });

  it('applyGroupChange en sandbox marca el flag sin retirar el cambio', async () => {
    const service = createPropertyService(
      deps(createMemoryPropertyStore(), fakeProperties([]), fakeObjects()),
    );
    service.requestGroupDelete({ projectId: 'p1', objectType: 'contacts', groupName: 'gym_info' });
    const change = service.listGroupChanges({ projectId: 'p1' })[0];
    await service.applyGroupChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'sandbox',
    });
    const after = service.listGroupChanges({ projectId: 'p1' });
    expect(after).toHaveLength(1);
    expect(after[0].appliedToSandbox).toBe(true);
    expect(after[0].appliedToProduction).toBe(false);
  });

  it('discardGroupChange retira el cambio; error si no existe', () => {
    const service = createPropertyService(
      deps(createMemoryPropertyStore(), fakeProperties(), fakeObjects()),
    );
    service.requestGroupDelete({ projectId: 'p1', objectType: 'contacts', groupName: 'gym_info' });
    const change = service.listGroupChanges({ projectId: 'p1' })[0];
    expect(service.discardGroupChange({ projectId: 'p1', changeId: change.id })).toEqual({
      success: true,
    });
    expect(service.listGroupChanges({ projectId: 'p1' })).toHaveLength(0);
    expect(service.discardGroupChange({ projectId: 'p1', changeId: 'nope' })).toEqual({
      success: false,
      error: 'Cambio no encontrado',
    });
  });
});
