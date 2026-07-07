/**
 * Specs de las tools MCP del mapa editable (SPEC-0016 §4.5 / D5). Registra contra un registry propio,
 * un servicio real (store en memoria) y un orquestador de Drive fake.
 */
import { describe, it, expect, vi } from 'vitest';
import { McpRegistry } from '../mcp/registry';
import { guidanceRegistry } from '../mcp/guidance';
import { registerPlanningTools, type PlanningDriveOps } from './planning-mcp-tools';
import { createPropertyService } from './service';
import { createMemoryPropertyStore } from './store';
import type { PropertiesApi } from '../connectors/hubspot/properties';
import type { ObjectsApi } from '../connectors/hubspot/objects';
import type { McpContext } from '../mcp/types';
import type { DataOrigin } from '@shared/types/properties';

const ctx: McpContext = { projectId: 'p1', sessionId: 's1' };

function fakeProperties(): PropertiesApi {
  return {
    listProperties: vi.fn(() => Promise.resolve([])),
    createProperty: vi.fn(() => Promise.resolve({ status: 201, data: {} })),
    patchProperty: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    deleteProperty: vi.fn(() => Promise.resolve({ status: 204, data: {} })),
    listGroups: vi.fn(() => Promise.resolve([])),
    createGroup: vi.fn((_o: string, g: { name: string; label: string }) => Promise.resolve(g)),
    deleteGroup: vi.fn(() => Promise.resolve({ status: 204, data: {} })),
  };
}

function fakeObjects(): ObjectsApi {
  return { listObjects: vi.fn(() => Promise.resolve([])) };
}

function fakeDrive(): PlanningDriveOps {
  return {
    writePlanningMap: vi.fn(() => Promise.resolve({ success: true, spreadsheetId: 'sid' })),
    importPlanningMap: vi.fn(() =>
      Promise.resolve({ success: true, changelog: { changes: [], needsAction: [] } }),
    ),
    applyPlanningImport: vi.fn(() => Promise.resolve({ success: true, applied: 1, blocked: [] })),
  };
}

function setup() {
  guidanceRegistry.clear();
  let n = 0;
  const registry = new McpRegistry();
  const service = createPropertyService({
    store: createMemoryPropertyStore(),
    propertiesApiFor: () => fakeProperties(),
    objectsApiFor: () => fakeObjects(),
    newId: () => `id-${(n += 1)}`,
    now: () => '2026-07-07T00:00:00.000Z',
  });
  const drive = fakeDrive();
  registerPlanningTools(registry, { service, drive });
  return { registry, service, drive };
}

function call(registry: McpRegistry, name: string, input: unknown): Promise<unknown> {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Tool no registrada: ${name}`);
  return tool.handler(input, ctx);
}

const GATED = ['planning_write_map', 'planning_apply_import', 'origins_set_object_fields'];
const READ = ['planning_import_map', 'planning_resolve_field_type'];

describe('registerPlanningTools (SPEC-0016 §4.5)', () => {
  it('registra las 5 tools del mapa editable', () => {
    const { registry } = setup();
    for (const name of [...GATED, ...READ]) {
      expect(registry.has(name), `falta la tool ${name}`).toBe(true);
    }
  });

  it('las tools que mutan llevan requiresGuidance; las de lectura no', () => {
    const { registry } = setup();
    for (const name of GATED) {
      expect(registry.get(name)?.requiresGuidance, `${name} debe llevar gate`).toBe(true);
    }
    for (const name of READ) {
      expect(registry.get(name)?.requiresGuidance, `${name} no debe llevar gate`).toBeFalsy();
    }
  });

  it('planning_import_map delega en el orquestador y devuelve el changelog', async () => {
    const { registry, drive } = setup();
    const result = (await call(registry, 'planning_import_map', {})) as { success: boolean };
    expect(drive.importPlanningMap).toHaveBeenCalledWith('p1');
    expect(result.success).toBe(true);
  });

  it('planning_apply_import pasa las resolutions al orquestador', async () => {
    const { registry, drive } = setup();
    const resolutions = [
      {
        objectType: 'contacts',
        entryName: 'Segmento',
        config: { type: 'enumeration', fieldType: 'select' },
      },
    ];
    await call(registry, 'planning_apply_import', { resolutions });
    expect(drive.applyPlanningImport).toHaveBeenCalledWith('p1', resolutions);
  });

  it('planning_resolve_field_type resuelve una config concreta de un tipo ambiguo', async () => {
    const { registry } = setup();
    const result = (await call(registry, 'planning_resolve_field_type', {
      key: 'choice',
      fieldType: 'select',
    })) as { resolved?: { type: string; fieldType: string } };
    expect(result.resolved).toEqual({ type: 'enumeration', fieldType: 'select' });
  });

  it('origins_set_object_fields puebla el catalogo de campos del objeto', async () => {
    const { registry, service } = setup();
    const origin = service.createOrigin({
      projectId: 'p1',
      origin: { name: 'PD', type: 'migration' },
    });
    service.updateOrigin({
      projectId: 'p1',
      origin: { ...origin, objects: [{ id: 'o1', name: 'People' }] },
    });
    const updated = (await call(registry, 'origins_set_object_fields', {
      originId: origin.id,
      objectId: 'o1',
      fields: ['email', 'name'],
    })) as DataOrigin;
    expect(updated.objects?.[0]?.fields).toEqual(['email', 'name']);
  });
});
