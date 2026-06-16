import { describe, it, expect } from 'vitest';
import { reconcileDefinitions } from './reconcile';
import type { ChangeFactoryDeps } from './changes';
import type { CustomObjectDefinition } from '@shared/types/custom-objects';
import type { RemoteSchema } from '../connectors/hubspot/schemas';

let counter = 0;
const deps: ChangeFactoryDeps = {
  newId: () => `id-${(counter += 1)}`,
  now: () => '2026-06-16T00:00:00.000Z',
};

function def(over: Partial<CustomObjectDefinition> = {}): CustomObjectDefinition {
  return {
    id: 'o1',
    name: 'machine',
    labels: { singular: 'Máquina', plural: 'Máquinas' },
    primaryDisplayProperty: 'model',
    requiredProperties: ['model'],
    secondaryDisplayProperties: [],
    searchableProperties: [],
    properties: [{ name: 'model', label: 'Modelo', type: 'string', fieldType: 'text' }],
    status: 'draft',
    createdAt: deps.now(),
    updatedAt: deps.now(),
    ...over,
  };
}

function remote(over: Partial<RemoteSchema> = {}): RemoteSchema {
  return {
    objectTypeId: '2-1',
    fullyQualifiedName: 'p1_machine',
    name: 'machine',
    labels: { singular: 'Máquina', plural: 'Máquinas' },
    primaryDisplayProperty: 'model',
    requiredProperties: ['model'],
    secondaryDisplayProperties: [],
    searchableProperties: [],
    archived: false,
    ...over,
  };
}

describe('reconcileDefinitions', () => {
  it('ausente en el portal -> draft + cambio create', () => {
    const result = reconcileDefinitions([def()], [], 'production', deps);
    expect(result.definitions[0]?.status).toBe('draft');
    expect(result.definitions[0]?.pendingChanges?.[0]?.operation).toBe('create');
    expect(result.summary).toEqual({ created: 0, divergent: 0, draft: 1 });
  });

  it('presente y coincidente -> created y guarda objectTypeId del entorno', () => {
    const result = reconcileDefinitions([def()], [remote()], 'sandbox', deps);
    expect(result.definitions[0]?.status).toBe('created');
    expect(result.definitions[0]?.objectTypeId?.sandbox).toBe('2-1');
    expect(result.summary.created).toBe(1);
  });

  it('presente pero distinto -> divergent + update_schema', () => {
    const result = reconcileDefinitions(
      [def({ labels: { singular: 'Equipo', plural: 'Equipos' } })],
      [remote()],
      'production',
      deps,
    );
    expect(result.definitions[0]?.status).toBe('divergent');
    expect(result.definitions[0]?.pendingChanges?.some((c) => c.operation === 'update_schema')).toBe(
      true,
    );
  });

  it('identifica por name, no por objectTypeId', () => {
    const local = def({ objectTypeId: { production: '2-999' } });
    const result = reconcileDefinitions([local], [remote({ objectTypeId: '2-1' })], 'production', deps);
    expect(result.definitions[0]?.status).toBe('created');
    expect(result.definitions[0]?.objectTypeId?.production).toBe('2-1');
  });
});
