import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGroupsStore } from './groups-store';
import type { GroupDeleteChange } from '@shared/types/properties';

function change(id: string, objectType: string): GroupDeleteChange {
  return {
    id,
    objectType,
    groupName: 'g',
    summary: 's',
    appliedToSandbox: false,
    appliedToProduction: false,
    createdAt: 'x',
  };
}

function setApi(overrides: Record<string, unknown> = {}) {
  const api = {
    groupsList: vi.fn().mockResolvedValue([{ name: 'g1', label: 'G1' }]),
    hubspotPropertiesList: vi.fn().mockResolvedValue([{ groupName: 'g1' }, { groupName: '' }]),
    groupChanges: vi.fn().mockResolvedValue([change('c1', 'contacts'), change('c2', 'deals')]),
    groupRequestDelete: vi.fn().mockResolvedValue({ success: true }),
    groupApplyChange: vi.fn().mockResolvedValue({ success: true }),
    groupDiscardChange: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  (globalThis as unknown as { window: { api: unknown } }).window = { api };
  return api;
}

beforeEach(() => {
  useGroupsStore.setState({
    groups: [],
    usedGroups: new Set(),
    changes: [],
    loading: false,
    error: null,
  });
});

describe('groups-store (SPEC-0006 §53.12)', () => {
  it('load agrega grupos, usedGroups (sin vacíos) y filtra changes por objectType', async () => {
    setApi();
    await useGroupsStore.getState().load('p1', 'contacts');
    const s = useGroupsStore.getState();
    expect(s.groups.map((g) => g.name)).toEqual(['g1']);
    expect([...s.usedGroups]).toEqual(['g1']);
    expect(s.changes.map((c) => c.id)).toEqual(['c1']);
    expect(s.error).toBeNull();
    expect(s.loading).toBe(false);
  });

  it('load captura el error sin lanzar y baja loading', async () => {
    setApi({ groupsList: vi.fn().mockRejectedValue(new Error('boom')) });
    await useGroupsStore.getState().load('p1', 'contacts');
    expect(useGroupsStore.getState().error).toBe('boom');
    expect(useGroupsStore.getState().loading).toBe(false);
  });

  it('requestDelete/applyChange reenvían al api y devuelven el resultado', async () => {
    const api = setApi();
    const r1 = await useGroupsStore
      .getState()
      .requestDelete({ projectId: 'p1', objectType: 'contacts', groupName: 'g1' });
    expect(r1.success).toBe(true);
    expect(api.groupRequestDelete).toHaveBeenCalled();
    const r2 = await useGroupsStore.getState().applyChange('p1', 'c1', 'sandbox');
    expect(r2.success).toBe(true);
    expect(api.groupApplyChange).toHaveBeenCalledWith({
      projectId: 'p1',
      changeId: 'c1',
      environment: 'sandbox',
    });
  });
});
