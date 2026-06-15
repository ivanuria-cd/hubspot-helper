import { describe, it, expect, vi } from 'vitest';

// Mock de electron-store: devuelve un estado con forma v1 (origins/properties/mappings, sin entries).
vi.mock('electron-store', () => ({
  default: class {
    private data: Record<string, unknown> = {
      states: {
        p1: { origins: [{ id: 'o1' }], properties: [{ id: 'x' }], mappings: [{ id: 'm' }] },
      },
    };
    get(key: string, fallback: unknown) {
      return key in this.data ? this.data[key] : fallback;
    }
    set(key: string, value: unknown) {
      this.data[key] = value;
    }
  },
}));

describe('ElectronPropertyStore.get (migración v1 → v2)', () => {
  it('descarta properties/mappings v1 y garantiza entries como array', async () => {
    const { ElectronPropertyStore } = await import('./store');
    const store = new ElectronPropertyStore();
    const state = store.get('p1');
    expect(Array.isArray(state.entries)).toBe(true);
    expect(state.entries).toHaveLength(0);
    expect(state.origins).toHaveLength(1);
    expect((state as unknown as { properties?: unknown }).properties).toBeUndefined();
  });

  it('proyecto inexistente devuelve estado vacío', async () => {
    const { ElectronPropertyStore } = await import('./store');
    const store = new ElectronPropertyStore();
    expect(store.get('desconocido')).toEqual({ origins: [], entries: [] });
  });
});
