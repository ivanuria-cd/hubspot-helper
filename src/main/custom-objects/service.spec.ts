import { describe, it, expect, vi } from 'vitest';
import { createCustomObjectService } from './service';
import { createMemoryCustomObjectStore } from './store';
import type { SchemasApi } from '../connectors/hubspot/schemas';
import type { ObjectUpsertDraftInput } from '@shared/types/custom-objects';

let counter = 0;
function makeService(schemas: Partial<SchemasApi>, environment: 'sandbox' | 'production' = 'sandbox') {
  const store = createMemoryCustomObjectStore();
  const service = createCustomObjectService({
    store,
    schemasApiFor: () => schemas as SchemasApi,
    activeEnvironment: () => environment,
    newId: () => `id-${(counter += 1)}`,
    now: () => '2026-06-16T00:00:00.000Z',
  });
  return { store, service };
}

const draft: ObjectUpsertDraftInput['definition'] = {
  name: 'machine',
  labels: { singular: 'Máquina', plural: 'Máquinas' },
  primaryDisplayProperty: 'model',
  requiredProperties: ['model'],
  properties: [{ name: 'model', label: 'Modelo', type: 'string', fieldType: 'text' }],
};

describe('createCustomObjectService', () => {
  it('upsertDraft crea un borrador con estado draft', () => {
    const { service } = makeService({});
    const created = service.upsertDraft({ projectId: 'p1', definition: draft });
    expect(created.status).toBe('draft');
    expect(created.id).toBeTruthy();
    expect(service.listDefinitions({ projectId: 'p1' })).toHaveLength(1);
  });

  it('sync marca draft + create cuando no existe en el portal', async () => {
    const { service } = makeService({ listSchemas: vi.fn(() => Promise.resolve([])) });
    service.upsertDraft({ projectId: 'p1', definition: draft });
    const summary = await service.syncHubspot({ projectId: 'p1' });
    expect(summary.draft).toBe(1);
    const change = service.listDefinitions({ projectId: 'p1' })[0]?.pendingChanges?.[0];
    expect(change?.operation).toBe('create');
  });

  it('applyChange create guarda el objectTypeId del entorno y no marca el otro', async () => {
    const createSchema = vi.fn(() =>
      Promise.resolve({ status: 201, data: { objectTypeId: '2-7', fullyQualifiedName: 'p1_machine' } }),
    );
    const { service } = makeService(
      { listSchemas: vi.fn(() => Promise.resolve([])), createSchema },
      'sandbox',
    );
    service.upsertDraft({ projectId: 'p1', definition: draft });
    await service.syncHubspot({ projectId: 'p1' });
    const changeId = service.listDefinitions({ projectId: 'p1' })[0]!.pendingChanges![0]!.id;

    const result = await service.applyChange({ projectId: 'p1', changeId, environment: 'sandbox' });

    expect(result.success).toBe(true);
    expect(createSchema).toHaveBeenCalled();
    const def = service.listDefinitions({ projectId: 'p1' })[0]!;
    expect(def.objectTypeId?.sandbox).toBe('2-7');
    expect(def.objectTypeId?.production).toBeUndefined();
    expect(def.status).toBe('created');
    expect(def.pendingChanges?.[0]?.appliedToSandbox).toBe(true);
    expect(def.pendingChanges?.[0]?.appliedToProduction).toBe(false);
  });

  it('update_schema falla si el objeto no existe en el entorno', async () => {
    const updateSchema = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
    const { service } = makeService(
      {
        listSchemas: vi.fn(() =>
          Promise.resolve([
            {
              objectTypeId: '2-1',
              fullyQualifiedName: 'p1_machine',
              name: 'machine',
              labels: { singular: 'Equipo', plural: 'Equipos' },
              primaryDisplayProperty: 'model',
              requiredProperties: ['model'],
              secondaryDisplayProperties: [],
              searchableProperties: [],
              archived: false,
            },
          ]),
        ),
        updateSchema,
      },
      'sandbox',
    );
    // El draft local difiere en labels respecto al remoto -> divergent + update_schema.
    service.upsertDraft({ projectId: 'p1', definition: draft });
    await service.syncHubspot({ projectId: 'p1' });
    const def = service.listDefinitions({ projectId: 'p1' })[0]!;
    const change = def.pendingChanges!.find((c) => c.operation === 'update_schema')!;

    // Aplicar en production (donde no se ha sincronizado/creado) debe fallar.
    const result = await service.applyChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'production',
    });
    expect(result.success).toBe(false);
    expect(updateSchema).not.toHaveBeenCalled();
  });

  it('applyChange propaga el mensaje real del error 4xx de HubSpot', async () => {
    const createSchema = vi.fn(() =>
      Promise.reject({ response: { data: { message: 'name already in use' } } }),
    );
    const { service } = makeService(
      { listSchemas: vi.fn(() => Promise.resolve([])), createSchema },
      'sandbox',
    );
    service.upsertDraft({ projectId: 'p1', definition: draft });
    await service.syncHubspot({ projectId: 'p1' });
    const changeId = service.listDefinitions({ projectId: 'p1' })[0]!.pendingChanges![0]!.id;

    const result = await service.applyChange({ projectId: 'p1', changeId, environment: 'sandbox' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('name already in use');
  });

  it('getDriveMeta refleja lastChangedAt tras una mutación', () => {
    const { service } = makeService({});
    expect(service.getDriveMeta({ projectId: 'p1' })).toEqual({
      lastWrittenAt: null,
      lastChangedAt: null,
    });
    service.upsertDraft({ projectId: 'p1', definition: draft });
    const meta = service.getDriveMeta({ projectId: 'p1' });
    expect(meta.lastChangedAt).toBe('2026-06-16T00:00:00.000Z');
    expect(meta.lastWrittenAt).toBeNull();
  });

  it('markDriveWritten fija lastWrittenAt sin tocar lastChangedAt', () => {
    const { service } = makeService({});
    service.upsertDraft({ projectId: 'p1', definition: draft });
    service.markDriveWritten({ projectId: 'p1' });
    const meta = service.getDriveMeta({ projectId: 'p1' });
    expect(meta.lastWrittenAt).toBe('2026-06-16T00:00:00.000Z');
    expect(meta.lastChangedAt).toBe('2026-06-16T00:00:00.000Z');
  });

  it('applyDriveState reemplaza las definiciones e iguala timestamps', () => {
    const { service } = makeService({});
    service.upsertDraft({ projectId: 'p1', definition: draft });
    service.applyDriveState(
      { projectId: 'p1' },
      {
        objects: [
          {
            id: 'obj-imported',
            name: 'imported',
            labels: { singular: 'Importado', plural: 'Importados' },
            primaryDisplayProperty: 'name',
            requiredProperties: ['name'],
            properties: [{ name: 'name', label: 'Nombre', type: 'string', fieldType: 'text' }],
            status: 'draft',
            createdAt: '2026-06-16T00:00:00.000Z',
            updatedAt: '2026-06-16T00:00:00.000Z',
          },
        ],
      },
    );
    const defs = service.listDefinitions({ projectId: 'p1' });
    expect(defs).toHaveLength(1);
    expect(defs[0]?.id).toBe('obj-imported');
    const meta = service.getDriveMeta({ projectId: 'p1' });
    expect(meta.lastWrittenAt).toBe('2026-06-16T00:00:00.000Z');
    expect(meta.lastChangedAt).toBe('2026-06-16T00:00:00.000Z');
  });
});
