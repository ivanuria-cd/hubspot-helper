/**
 * Specs de las tools MCP de gestión de propiedades (SPEC-0005 §19, informe 2026-07-02 hallazgo 10.1).
 * Registra las tools contra un registry propio y el servicio real con store en memoria y APIs fake.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpRegistry } from '../mcp/registry';
import { guidanceRegistry } from '../mcp/guidance';
import { registerPropertyTools } from './mcp-tools';
import { createPropertyService } from './service';
import { createMemoryPropertyStore } from './store';
import type { PropertiesApi, RemoteProperty } from '../connectors/hubspot/properties';
import type { ObjectsApi } from '../connectors/hubspot/objects';
import type { McpContext } from '../mcp/types';

const ctx: McpContext = { projectId: 'p1', sessionId: 's1' };

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

function fakeObjects(): ObjectsApi {
  return { listObjects: vi.fn(() => Promise.resolve([])) };
}

function setup(remote: Omit<RemoteProperty, 'objectType'>[] = []) {
  // registerPropertyTools registra su sección de guía en el singleton: limpiar entre tests.
  guidanceRegistry.clear();
  const registry = new McpRegistry();
  const props = fakeProperties(remote);
  const service = createPropertyService({
    store: createMemoryPropertyStore(),
    propertiesApiFor: () => props,
    objectsApiFor: () => fakeObjects(),
    newId: () => `id-${(idCounter += 1)}`,
    now: () => '2026-07-02T00:00:00.000Z',
  });
  registerPropertyTools(registry, service);
  return { registry, service, props };
}

function call(registry: McpRegistry, name: string, input: unknown): Promise<unknown> {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Tool no registrada: ${name}`);
  return tool.handler(input, ctx);
}

/** Tools de escritura/sync: todas deben declarar el gate de guía (SPEC-0005 §18.2). */
const WRITE_TOOLS = [
  'entries_upsert',
  'entries_delete',
  'entries_upsert_batch',
  'entries_delete_batch',
  'properties_discard_changes_batch',
  'origins_upsert',
  'origins_delete',
  'groups_create',
  'properties_sync',
  'properties_convert_to_new',
  'properties_convert_missing_to_new',
  'properties_apply_change',
  'properties_apply_batch',
  'properties_apply_all',
  'properties_discard_change',
  'properties_request_delete',
  'properties_groups_request_delete',
  'properties_groups_apply_change',
  'properties_groups_discard_change',
];

/** Tools de solo lectura: no deben llevar el gate. */
const READ_TOOLS = [
  'objects_list',
  'hubspot_properties_list',
  'entries_list',
  'origins_list',
  'planning_field_types',
  'properties_pending_changes',
  'properties_export_origin',
  'groups_list',
  'properties_group_pending_changes',
];

describe('registerPropertyTools (tools MCP de propiedades)', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('registra el conjunto completo de tools esperado', () => {
    const { registry } = setup();
    for (const name of [...WRITE_TOOLS, ...READ_TOOLS]) {
      expect(registry.has(name), `falta la tool ${name}`).toBe(true);
    }
    expect(registry.size).toBe(WRITE_TOOLS.length + READ_TOOLS.length);
  });

  it('entries_upsert válido crea la entrada y entries_list la devuelve', async () => {
    const { registry } = setup();
    const created = (await call(registry, 'entries_upsert', {
      entry: {
        objectType: 'contacts',
        name: 'Tier',
        hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
        sources: [],
      },
    })) as { id: string; name: string };
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Tier');

    const listed = (await call(registry, 'entries_list', { objectType: 'contacts' })) as unknown[];
    expect(listed).toHaveLength(1);
  });

  it('entries_upsert con hubspotProperty string devuelve {error:{issues}} sin crear nada (§39.9)', async () => {
    const { registry } = setup();
    const result = (await call(registry, 'entries_upsert', {
      entry: {
        objectType: 'contacts',
        name: 'X',
        hubspotProperty: 'firstname',
        sources: [],
      },
    })) as { error?: { code: string; message: string; issues: unknown[] } };

    expect(result.error).toBeTruthy();
    expect(result.error?.code).toBeTruthy();
    expect(Array.isArray(result.error?.issues)).toBe(true);
    expect(result.error?.issues.length).toBeGreaterThan(0);

    const listed = (await call(registry, 'entries_list', {})) as unknown[];
    expect(listed).toHaveLength(0);
  });

  it('origins_upsert + origins_delete completan el ciclo del origen', async () => {
    const { registry } = setup();
    const origin = (await call(registry, 'origins_upsert', {
      name: 'Salesforce',
      type: 'migration',
      description: 'Migración inicial',
    })) as { id: string; name: string };
    expect(origin.id).toBeTruthy();
    expect(origin.name).toBe('Salesforce');

    let listed = (await call(registry, 'origins_list', {})) as { id: string }[];
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(origin.id);

    await call(registry, 'origins_delete', { originId: origin.id });
    listed = (await call(registry, 'origins_list', {})) as { id: string }[];
    expect(listed).toHaveLength(0);
  });

  it('properties_sync devuelve el summary con missing/blocked/blockers', async () => {
    const { registry } = setup([]);
    await call(registry, 'entries_upsert', {
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
    const summary = (await call(registry, 'properties_sync', {})) as {
      missing: number;
      blocked: number;
      blockers: unknown[];
    };
    expect(summary.missing).toBe(1);
    expect(summary.blocked).toBe(0);
    expect(Array.isArray(summary.blockers)).toBe(true);
  });

  it('las tools de escritura declaran requiresGuidance y las de lectura no (SPEC-0005 §18.2)', () => {
    const { registry } = setup();
    for (const name of WRITE_TOOLS) {
      expect(registry.get(name)?.requiresGuidance, `${name} debe llevar gate`).toBe(true);
    }
    for (const name of READ_TOOLS) {
      expect(registry.get(name)?.requiresGuidance, `${name} no debe llevar gate`).toBeFalsy();
    }
  });

  it('§54.2: properties_apply_change acepta entryId+operation y rechaza referencia ambigua', async () => {
    const { registry, props } = setup();
    await call(registry, 'entries_upsert', {
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
    await call(registry, 'properties_sync', {});
    const entries = (await call(registry, 'entries_list', {})) as Array<{ id: string }>;

    const ok = (await call(registry, 'properties_apply_change', {
      entryId: entries[0].id,
      operation: 'create',
      environment: 'sandbox',
    })) as { success: boolean };
    expect(ok.success).toBe(true);
    expect(props.createProperty).toHaveBeenCalledWith('contacts', expect.anything(), 'sandbox');

    const ambiguous = (await call(registry, 'properties_apply_change', {
      changeId: 'x',
      entryId: entries[0].id,
      operation: 'create',
      environment: 'sandbox',
    })) as { error?: { code: string } };
    expect(ambiguous.error?.code).toBe('invalid-input');

    const none = (await call(registry, 'properties_apply_change', {
      environment: 'sandbox',
    })) as { error?: { code: string } };
    expect(none.error?.code).toBe('invalid-input');
  });

  const newEntry = (registry: McpRegistry, objectType: string, name: string) =>
    call(registry, 'entries_upsert', {
      entry: {
        objectType,
        name,
        hubspotProperty: {
          mode: 'new',
          definition: {
            hubspotName: name,
            label: name,
            type: 'string',
            fieldType: 'text',
            groupName: 'custom',
          },
        },
        sources: [],
      },
    });

  it('§54.2: properties_apply_all aplica todos los pendientes del entorno', async () => {
    const { registry, props } = setup();
    await newEntry(registry, 'contacts', 'a_prop');
    await newEntry(registry, 'contacts', 'b_prop');
    await call(registry, 'properties_sync', {});
    const result = (await call(registry, 'properties_apply_all', { environment: 'sandbox' })) as {
      applied: number;
      failed: number;
    };
    expect(result.applied).toBe(2);
    expect(result.failed).toBe(0);
    expect(props.createProperty).toHaveBeenCalledTimes(2);
  });

  it('§54.2: properties_apply_batch tolera un fallo por ítem sin abortar el lote', async () => {
    const { registry } = setup();
    await newEntry(registry, 'contacts', 'ok_prop');
    await call(registry, 'properties_sync', {});
    const entries = (await call(registry, 'entries_list', {})) as Array<{ id: string }>;
    const res = (await call(registry, 'properties_apply_batch', {
      environment: 'sandbox',
      items: [
        { entryId: entries[0].id, operation: 'create' },
        { entryId: 'inexistente', operation: 'create' },
      ],
    })) as { results: Array<{ ok: boolean }> };
    expect(res.results.map((r) => r.ok)).toEqual([true, false]);
  });

  it('§54.2: properties_apply_batch rechaza referencia ambigua e items vacío', async () => {
    const { registry } = setup();
    const ambiguous = (await call(registry, 'properties_apply_batch', {
      environment: 'sandbox',
      items: [{ changeId: 'x', entryId: 'e', operation: 'create' }],
    })) as { error?: { code: string } };
    expect(ambiguous.error?.code).toBe('invalid-input');
    const empty = (await call(registry, 'properties_apply_batch', {
      environment: 'sandbox',
      items: [],
    })) as { error?: { code: string } };
    expect(empty.error?.code).toBe('invalid-input');
  });

  it('§54.5: properties_pending_changes filtra por objectType y pagina', async () => {
    const { registry } = setup();
    await newEntry(registry, 'contacts', 'c1');
    await newEntry(registry, 'deals', 'd1');
    await call(registry, 'properties_sync', {});
    const contacts = (await call(registry, 'properties_pending_changes', {
      objectType: 'contacts',
    })) as { changes: unknown[]; total: number };
    expect(contacts.total).toBe(1);
    expect(contacts.changes).toHaveLength(1);
    const paged = (await call(registry, 'properties_pending_changes', { limit: 1, offset: 0 })) as {
      changes: unknown[];
      total: number;
      limit: number;
    };
    expect(paged.total).toBe(2);
    expect(paged.changes).toHaveLength(1);
    expect(paged.limit).toBe(1);
  });

  it('§53.2: entries_upsert devuelve error estructurado si el originId no existe', async () => {
    const { registry } = setup();
    const res = (await call(registry, 'entries_upsert', {
      entry: {
        objectType: 'contacts',
        name: 'X',
        hubspotProperty: { mode: 'existing', hubspotName: 'x' },
        sources: [
          { id: 's1', originId: 'no-existe', sourceField: 'F', definition: { kind: 'text' } },
        ],
      },
    })) as { error?: { code: string; issues?: Array<{ code: string }> } };
    expect(res.error?.code).toBe('ENTRY_VALIDATION');
    expect(res.error?.issues?.[0]?.code).toBe('ORIGIN_NOT_FOUND');
  });

  it('§53.3: properties_pending_changes expone blockers vía buildBlocker', async () => {
    const { registry } = setup();
    await call(registry, 'entries_upsert', {
      entry: {
        objectType: 'contacts',
        name: 'Falta',
        hubspotProperty: { mode: 'existing', hubspotName: 'ausente' },
        sources: [],
      },
    });
    await call(registry, 'properties_sync', {});
    const res = (await call(registry, 'properties_pending_changes', {})) as {
      blockers: Array<{ reason: string; remediation: string; hubspotName: string }>;
    };
    expect(res.blockers).toHaveLength(1);
    expect(res.blockers[0].reason).toBe('existing-missing-remote');
    expect(res.blockers[0].remediation).toBe('convert-to-new');
    expect(res.blockers[0].hubspotName).toBe('ausente');
  });
});
