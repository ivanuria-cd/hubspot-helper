import { describe, it, expect, vi } from 'vitest';
import { refreshDrive, type RefreshFeature } from './drive-refresh';

function feature(over: Partial<RefreshFeature> & { featureKey: string }): RefreshFeature {
  return {
    name: over.featureKey,
    hasData: () => true,
    isStale: () => true,
    write: vi.fn().mockResolvedValue({ success: true }),
    ...over,
  };
}

describe('refreshDrive', () => {
  it('no conectado: no escribe nada', async () => {
    const write = vi.fn().mockResolvedValue({ success: true });
    const res = await refreshDrive(false, [feature({ featureKey: 'a', write })]);
    expect(res).toEqual({ connected: false, upToDate: true, items: [] });
    expect(write).not.toHaveBeenCalled();
  });

  it('todo al día: upToDate sin escrituras', async () => {
    const write = vi.fn().mockResolvedValue({ success: true });
    const res = await refreshDrive(true, [feature({ featureKey: 'a', isStale: () => false, write })]);
    expect(res.upToDate).toBe(true);
    expect(res.items).toHaveLength(0);
    expect(write).not.toHaveBeenCalled();
  });

  it('omite las que no tienen datos', async () => {
    const write = vi.fn().mockResolvedValue({ success: true });
    const res = await refreshDrive(true, [feature({ featureKey: 'a', hasData: () => false, write })]);
    expect(res.upToDate).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it('actualiza las desactualizadas (dirty o faltantes)', async () => {
    const res = await refreshDrive(true, [
      feature({ featureKey: 'a', name: 'A' }),
      feature({ featureKey: 'b', name: 'B', isStale: () => false }),
      feature({ featureKey: 'c', name: 'C' }),
    ]);
    expect(res.items.map((i) => i.featureKey)).toEqual(['a', 'c']);
    expect(res.items.every((i) => i.status === 'updated')).toBe(true);
    expect(res.upToDate).toBe(false);
  });

  it('marca error sin abortar las demás', async () => {
    const res = await refreshDrive(true, [
      feature({ featureKey: 'a', name: 'A', write: vi.fn().mockResolvedValue({ success: false, error: 'boom' }) }),
      feature({ featureKey: 'b', name: 'B' }),
    ]);
    expect(res.items[0]).toEqual({ featureKey: 'a', name: 'A', status: 'error', error: 'boom' });
    expect(res.items[1]).toMatchObject({ featureKey: 'b', status: 'updated' });
  });
});
