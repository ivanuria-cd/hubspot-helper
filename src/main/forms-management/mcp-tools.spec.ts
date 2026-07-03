/**
 * Specs de las tools MCP de gestión de formularios (SPEC-0005 §19, informe 2026-07-02 hallazgo 10.1).
 * Registra las tools contra un registry propio y el servicio real con store en memoria y API fake.
 */
import { describe, it, expect, vi } from 'vitest';
import { McpRegistry } from '../mcp/registry';
import { registerFormTools } from './mcp-tools';
import { createFormService } from './service';
import { createMemoryFormsStore } from './store';
import type { FormsApi } from '../connectors/hubspot/forms';
import type { McpContext } from '../mcp/types';
import type { DataOrigin } from '@shared/types/properties';

const ctx: McpContext = { projectId: 'p1', sessionId: 's1' };

const origins: DataOrigin[] = [
  { id: 'o1', name: 'Origen 1', type: 'integration', createdAt: '2026-06-16T00:00:00Z' },
];

function setup() {
  let counter = 0;
  const store = createMemoryFormsStore();
  const api: FormsApi = {
    listForms: vi.fn(() => Promise.resolve([])),
    getForm: vi.fn(() => Promise.reject(new Error('no usado'))),
    createForm: vi.fn(() => Promise.resolve({ status: 201, data: { id: 'new-form' } })),
    patchForm: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    getConsentTemplate: vi.fn(() => Promise.resolve(null)),
    listLegacyForms: vi.fn(() => Promise.resolve([])),
  };
  const service = createFormService({
    store,
    formsApiFor: () => api,
    subscriptionsApiFor: () => ({ listDefinitions: vi.fn(() => Promise.resolve([])) }),
    entriesFor: () => [],
    originsFor: () => origins,
    newId: () => `id-${(counter += 1)}`,
    now: () => '2026-07-02T00:00:00.000Z',
  });
  const registry = new McpRegistry();
  registerFormTools(registry, service);
  return { registry, service, api };
}

function call(registry: McpRegistry, name: string, input: unknown): Promise<unknown> {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Tool no registrada: ${name}`);
  return tool.handler(input, ctx);
}

/** Las 7 tools de escritura/sync con gate de guía (SPEC-0008 §29). */
const WRITE_TOOLS = [
  'forms_sync',
  'forms_link_origin',
  'forms_create_definition',
  'forms_update_definition',
  'forms_edit_pending_change',
  'forms_add_missing_fields',
  'forms_discard_change',
];

/** Tools de solo lectura: no deben llevar el gate. */
const READ_TOOLS = [
  'forms_list',
  'forms_get',
  'forms_coverage',
  'forms_subscription_types',
  'forms_pending_changes',
];

describe('registerFormTools (tools MCP de formularios)', () => {
  it('registra el conjunto completo de tools esperado', () => {
    const { registry } = setup();
    for (const name of [...WRITE_TOOLS, ...READ_TOOLS]) {
      expect(registry.has(name), `falta la tool ${name}`).toBe(true);
    }
    expect(registry.size).toBe(WRITE_TOOLS.length + READ_TOOLS.length);
  });

  it('forms_list devuelve vacío en un proyecto sin formularios', async () => {
    const { registry } = setup();
    const listed = (await call(registry, 'forms_list', {})) as unknown[];
    expect(listed).toEqual([]);
  });

  it('forms_create_definition crea un cambio pendiente create_form', async () => {
    const { registry } = setup();
    const change = (await call(registry, 'forms_create_definition', {
      definition: {
        name: 'Newsletter',
        objectType: 'contacts',
        originIds: ['o1'],
        fields: [
          { hubspotName: 'email', label: 'Email', fieldType: 'email', required: true, hidden: false },
        ],
      },
    })) as { id: string; operation: string };
    expect(change.id).toBeTruthy();
    expect(change.operation).toBe('create_form');

    const pending = (await call(registry, 'forms_pending_changes', {})) as { id: string }[];
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(change.id);
  });

  it('forms_link_origin rechaza un origen inexistente (assertOriginsExist, SPEC-0008 §29)', async () => {
    const { registry } = setup();
    await expect(
      (async () =>
        call(registry, 'forms_link_origin', {
          formId: 'f1',
          originIds: ['no-existe'],
          objectType: 'contacts',
        }))(),
    ).rejects.toThrow('Origen(es) inexistente(s): no-existe');
  });

  it('las 7 tools de escritura/sync declaran requiresGuidance y las de lectura no', () => {
    const { registry } = setup();
    for (const name of WRITE_TOOLS) {
      expect(registry.get(name)?.requiresGuidance, `${name} debe llevar gate`).toBe(true);
    }
    for (const name of READ_TOOLS) {
      expect(registry.get(name)?.requiresGuidance, `${name} no debe llevar gate`).toBeFalsy();
    }
  });
});
