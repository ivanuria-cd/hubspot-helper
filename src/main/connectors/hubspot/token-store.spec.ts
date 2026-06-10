import { describe, it, expect, beforeEach } from 'vitest';
import { createTokenStore, hashToken, type KeychainBackend } from './token-store';

function memoryKeychain(): KeychainBackend {
  const data = new Map<string, string>();
  const key = (service: string, account: string) => `${service}::${account}`;
  return {
    setPassword: (service, account, password) => {
      data.set(key(service, account), password);
      return Promise.resolve();
    },
    getPassword: (service, account) => Promise.resolve(data.get(key(service, account)) ?? null),
    deletePassword: (service, account) => Promise.resolve(data.delete(key(service, account))),
  };
}

describe('token store de HubSpot', () => {
  let store: ReturnType<typeof createTokenStore>;

  beforeEach(() => {
    store = createTokenStore(memoryKeychain());
  });

  it('guarda y recupera el token por proyecto y entorno', async () => {
    await store.save('proj-1', 'production', 'pat-abc');
    await store.save('proj-1', 'sandbox', 'pat-sbx');
    expect(await store.get('proj-1', 'production')).toBe('pat-abc');
    expect(await store.get('proj-1', 'sandbox')).toBe('pat-sbx');
  });

  it('aísla los tokens entre proyectos', async () => {
    await store.save('proj-1', 'production', 'token-1');
    expect(await store.get('proj-2', 'production')).toBeNull();
  });

  it('revoca el token y devuelve true', async () => {
    await store.save('proj-1', 'production', 'token-1');
    expect(await store.remove('proj-1', 'production')).toBe(true);
    expect(await store.get('proj-1', 'production')).toBeNull();
  });

  it('hashToken es determinista y no expone el token', () => {
    const hash = hashToken('pat-abc');
    expect(hash).toBe(hashToken('pat-abc'));
    expect(hash).not.toContain('pat-abc');
    expect(hash).toHaveLength(64);
  });
});
