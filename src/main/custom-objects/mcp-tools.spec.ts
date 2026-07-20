/**
 * Specs de las tools MCP de objetos custom (SPEC-0005 §19, informe 2026-07-02 hallazgo 10.1).
 * Registra las tools contra un registry propio y el servicio real con store en memoria y API fake.
 */
import { describe, it, expect, vi } from 'vitest';
import { McpRegistry } from '../mcp/registry';
import { guidanceRegistry } from '../mcp/guidance';
import { registerCustomObjectTools } from './mcp-tools';
import { createCustomObjectService } from './service';
import { createMemoryCustomObjectStore } from './store';
import type { SchemasApi } from '../connectors/hubspot/schemas';
import type { ObjectUpsertDraftInput } from '@shared/types/custom-objects';
import type { McpContext } from '../mcp/types';

const ctx: McpContext = { projectId: 'p1', sessionId: 's1' };

function setup(schemas: Partial<SchemasApi> = {}) {
  guidanceRegistry.clear();
  let counter = 0;
  const service = createCustomObjectService({
    store: createMemoryCustomObjectStore(),
    schemasApiFor: () =>
      ({ listSchemas: vi.fn(() => Promise.resolve([])), ...schemas }) as SchemasApi,
    activeEnvironment: () => 'sandbox',
    newId: () => `id-${(counter += 1)}`,
    now: () => '2026-07-02T00:00:00.000Z',
  });
  const registry = new McpRegistry();
  registerCustomObjectTools(registry, service);
  return { registry, service };
}

function call(registry: McpRegistry, name: string, input: unknown): Promise<unknown> {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Tool no registrada: ${name}`);
  return tool.handler(input, ctx);
}

const draft: ObjectUpsertDraftInput['definition'] = {
  name: 'machine',
  labels: { singular: 'Máquina', plural: 'Máquinas' },
  primaryDisplayProperty: 'model',
  requiredProperties: ['model'],
  properties: [{ name: 'model', label: 'Modelo', type: 'string', fieldType: 'text' }],
};

/** Las 5 tools de escritura/sync con gate de guía (SPEC-0007 §20). */
const WRITE_TOOLS = [
  'custom_objects_upsert_draft',
  'custom_objects_apply_change',
  'custom_objects_discard_change',
  'custom_objects_sync',
  'custom_objects_delete_draft',
];

/** Tools de solo lectura: no deben llevar el gate. */
const READ_TOOLS = ['custom_objects_list', 'custom_objects_get', 'custom_objects_pending_changes'];

describe('registerCustomObjectTools (tools MCP de objetos custom)', () => {
  it('registra el conjunto completo de tools esperado', () => {
    const { registry } = setup();
    for (const name of [...WRITE_TOOLS, ...READ_TOOLS]) {
      expect(registry.has(name), `falta la tool ${name}`).toBe(true);
    }
    expect(registry.size).toBe(WRITE_TOOLS.length + READ_TOOLS.length);
  });

  it('custom_objects_upsert_draft crea un borrador con estado draft', async () => {
    const { registry } = setup();
    const created = (await call(registry, 'custom_objects_upsert_draft', {
      definition: draft,
    })) as {
      id: string;
      status: string;
      name: string;
    };
    expect(created.id).toBeTruthy();
    expect(created.status).toBe('draft');
    expect(created.name).toBe('machine');
  });

  it('custom_objects_list devuelve el borrador y custom_objects_get lo encuentra por nombre', async () => {
    const { registry } = setup();
    const created = (await call(registry, 'custom_objects_upsert_draft', {
      definition: draft,
    })) as {
      id: string;
    };

    const listed = (await call(registry, 'custom_objects_list', {})) as {
      id: string;
      name: string;
    }[];
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);

    const found = (await call(registry, 'custom_objects_get', { name: 'machine' })) as {
      id: string;
    } | null;
    expect(found?.id).toBe(created.id);
  });

  it('custom_objects_delete_draft elimina el borrador del estado local', async () => {
    const { registry } = setup();
    const created = (await call(registry, 'custom_objects_upsert_draft', {
      definition: draft,
    })) as {
      id: string;
    };

    const result = (await call(registry, 'custom_objects_delete_draft', {
      objectId: created.id,
    })) as {
      success: boolean;
    };
    expect(result.success).toBe(true);

    const listed = (await call(registry, 'custom_objects_list', {})) as unknown[];
    expect(listed).toHaveLength(0);
  });

  it('las 5 tools de escritura/sync declaran requiresGuidance y las de lectura no', () => {
    const { registry } = setup();
    for (const name of WRITE_TOOLS) {
      expect(registry.get(name)?.requiresGuidance, `${name} debe llevar gate`).toBe(true);
    }
    for (const name of READ_TOOLS) {
      expect(registry.get(name)?.requiresGuidance, `${name} no debe llevar gate`).toBeFalsy();
    }
  });
});
