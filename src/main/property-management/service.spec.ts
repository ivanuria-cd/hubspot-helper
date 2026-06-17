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
    listGroups: vi.fn(() => Promise.resolve([])),
    createGroup: vi.fn((_objectType: string, g: { name: string; label: string }) => Promise.resolve(g)),
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
    const service = createPropertyService(deps(createMemoryPropertyStore(), fakeProperties(), objs));
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
          { id: 'o1', name: 'SF', type: 'migration', objects: [], createdAt: '2026-01-01T00:00:00.000Z' },
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

  it('CRUD de origenes y exportacion JSON v2', () => {
    const store = createMemoryPropertyStore();
    const service = createPropertyService(deps(store, fakeProperties(), fakeObjects()));
    const origin = service.createOrigin({ projectId: 'p1', origin: { name: 'SF', type: 'migration' } });
    expect(service.listOrigins({ projectId: 'p1' })).toHaveLength(1);
    const exported = service.exportJson({ projectId: 'p1', originId: origin.id });
    expect(exported.schema_version).toBe(2);
    expect(exported.origin.name).toBe('SF');
    service.deleteOrigin({ projectId: 'p1', originId: origin.id });
    expect(service.listOrigins({ projectId: 'p1' })).toHaveLength(0);
  });
});
