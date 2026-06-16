import { describe, it, expect } from 'vitest';
import {
  buildCreateChange,
  createSchemaBody,
  diffSchema,
  markApplied,
  updateSchemaBody,
} from './changes';
import type { ChangeFactoryDeps } from './changes';
import type { CustomObjectDefinition, SchemaChange } from '@shared/types/custom-objects';
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
    properties: [
      { name: 'model', label: 'Modelo', type: 'string', fieldType: 'text' },
      {
        name: 'serial',
        label: 'Serie',
        type: 'string',
        fieldType: 'text',
        hasUniqueValue: true,
        options: [{ label: '', value: '', displayOrder: 0, hidden: false }],
      },
    ],
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

describe('createSchemaBody', () => {
  it('incluye properties y primaryDisplayProperty; sanea opciones vacías', () => {
    const body = createSchemaBody(def()) as Record<string, unknown>;
    expect(body.name).toBe('machine');
    expect(body.primaryDisplayProperty).toBe('model');
    expect(Array.isArray(body.properties)).toBe(true);
    const props = body.properties as Array<Record<string, unknown>>;
    expect(props).toHaveLength(2);
    expect(props[1]?.hasUniqueValue).toBe(true);
    expect(props[1]?.options).toBeUndefined();
  });

  it('descarta referencias obsoletas en searchable/required (nombres que no existen)', () => {
    const body = createSchemaBody(
      def({
        searchableProperties: ['model', 'Nombre'],
        requiredProperties: ['model', 'inexistente'],
        secondaryDisplayProperties: ['serial', 'Nombre'],
      }),
    ) as Record<string, unknown>;
    expect(body.searchableProperties).toEqual(['model']);
    expect(body.requiredProperties).toEqual(['model']);
    expect(body.secondaryDisplayProperties).toEqual(['serial']);
  });
});

describe('updateSchemaBody', () => {
  it('no incluye name ni tipos de propiedad', () => {
    const body = updateSchemaBody(def()) as Record<string, unknown>;
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('properties');
    expect(body.primaryDisplayProperty).toBe('model');
  });
});

describe('diffSchema', () => {
  it('sin diferencias no genera cambios', () => {
    expect(diffSchema(def(), remote(), deps)).toEqual([]);
  });

  it('etiqueta distinta genera update_schema', () => {
    const changes = diffSchema(def({ labels: { singular: 'Equipo', plural: 'Equipos' } }), remote(), deps);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.operation).toBe('update_schema');
  });
});

describe('buildCreateChange / markApplied', () => {
  it('create nace sin aplicar; markApplied marca el entorno correcto', () => {
    const change = buildCreateChange(def(), deps);
    expect(change.operation).toBe('create');
    expect(change.appliedToSandbox).toBe(false);

    const applied = markApplied(change as SchemaChange, 'sandbox');
    expect(applied.appliedToSandbox).toBe(true);
    expect(applied.appliedToProduction).toBe(false);
  });
});
