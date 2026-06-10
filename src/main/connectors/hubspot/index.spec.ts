import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HubSpotConfig, HubSpotEnvironment } from '@shared/types/hubspot';
import { createHubSpotConnector, type HubSpotConfigStore } from './index';
import type { TokenStore } from './token-store';

vi.mock('electron-store', () => ({
  default: class {
    private data: Record<string, unknown> = {};
    get(key: string, fallback: unknown) {
      return key in this.data ? this.data[key] : fallback;
    }
    set(key: string, value: unknown) {
      this.data[key] = value;
    }
  },
}));

function memoryConfigs(): HubSpotConfigStore {
  const data = new Map<string, HubSpotConfig>();
  return {
    get: (id) => data.get(id) ?? null,
    set: (id, cfg) => void data.set(id, cfg),
    delete: (id) => void data.delete(id),
  };
}

function memoryTokens(): TokenStore & { peek: (p: string, e: HubSpotEnvironment) => string | null } {
  const data = new Map<string, string>();
  const key = (p: string, e: HubSpotEnvironment) => `${p}:${e}`;
  return {
    save: (p, e, token) => {
      data.set(key(p, e), token);
      return Promise.resolve();
    },
    get: (p, e) => Promise.resolve(data.get(key(p, e)) ?? null),
    remove: (p, e) => Promise.resolve(data.delete(key(p, e))),
    peek: (p, e) => data.get(key(p, e)) ?? null,
  };
}

describe('conector HubSpot (façade)', () => {
  let tokens: ReturnType<typeof memoryTokens>;
  let connector: ReturnType<typeof createHubSpotConnector>;

  beforeEach(() => {
    tokens = memoryTokens();
    connector = createHubSpotConnector({
      tokens,
      configs: memoryConfigs(),
      verify: () => Promise.resolve({ portalId: '7', portalName: 'acme.com' }),
      now: () => '2026-06-09T00:00:00.000Z',
    });
  });

  it('guarda el token y persiste la config sin el token en claro', async () => {
    const result = await connector.saveToken({
      projectId: 'p1',
      environment: 'production',
      token: 'pat-secreto',
    });

    expect(result.success).toBe(true);
    expect(result.portalId).toBe('7');

    const status = connector.getStatus('p1');
    expect(status?.environments.production?.portalName).toBe('acme.com');
    expect(status?.environments.production?.tokenHash).not.toContain('pat-secreto');
    expect(tokens.peek('p1', 'production')).toBe('pat-secreto');
  });

  it('devuelve error si la verificación falla y no persiste config', async () => {
    const failing = createHubSpotConnector({
      tokens: memoryTokens(),
      configs: memoryConfigs(),
      verify: () => Promise.reject(new Error('Token inválido')),
    });
    const result = await failing.saveToken({ projectId: 'p1', environment: 'production', token: 'malo' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Token inválido');
    expect(failing.getStatus('p1')).toBeNull();
  });

  it('cambia el entorno activo', async () => {
    await connector.saveToken({ projectId: 'p1', environment: 'production', token: 'a' });
    await connector.saveToken({ projectId: 'p1', environment: 'sandbox', token: 'b' });
    expect(connector.setEnvironment({ projectId: 'p1', environment: 'sandbox' }).success).toBe(true);
    expect(connector.getStatus('p1')?.activeEnvironment).toBe('sandbox');
  });

  it('revoca el token de un entorno', async () => {
    await connector.saveToken({ projectId: 'p1', environment: 'production', token: 'a' });
    await connector.revokeToken({ projectId: 'p1', environment: 'production' });
    expect(connector.getStatus('p1')?.environments.production).toBeUndefined();
    expect(tokens.peek('p1', 'production')).toBeNull();
  });

  it('getStatus es null cuando no hay configuración', () => {
    expect(connector.getStatus('desconocido')).toBeNull();
  });
});
