import { describe, it, expect, beforeEach } from 'vitest';
import { createGoogleTokenStore, type KeychainBackend } from './token-store';
import type { TokenSet } from './auth';

function memoryKeychain(): KeychainBackend & { raw: Map<string, string> } {
  const data = new Map<string, string>();
  const key = (service: string, account: string) => `${service}::${account}`;
  return {
    raw: data,
    setPassword: (service, account, password) => {
      data.set(key(service, account), password);
      return Promise.resolve();
    },
    getPassword: (service, account) => Promise.resolve(data.get(key(service, account)) ?? null),
    deletePassword: (service, account) => Promise.resolve(data.delete(key(service, account))),
  };
}

const tokens: TokenSet = { accessToken: 'a', refreshToken: 'r', expiresAt: 1000 };

describe('token store de Google Drive', () => {
  let backend: ReturnType<typeof memoryKeychain>;
  let store: ReturnType<typeof createGoogleTokenStore>;

  beforeEach(() => {
    backend = memoryKeychain();
    store = createGoogleTokenStore(backend);
  });

  it('guarda y recupera el TokenSet por proyecto', async () => {
    await store.save('p1', tokens);
    expect(await store.get('p1')).toEqual(tokens);
  });

  it('aísla los tokens entre proyectos', async () => {
    await store.save('p1', tokens);
    expect(await store.get('p2')).toBeNull();
  });

  it('elimina el token', async () => {
    await store.save('p1', tokens);
    expect(await store.remove('p1')).toBe(true);
    expect(await store.get('p1')).toBeNull();
  });

  it('devuelve null si el contenido almacenado no es JSON válido', async () => {
    await backend.setPassword('revops-app:google-drive', 'p1', 'no-es-json');
    expect(await store.get('p1')).toBeNull();
  });
});
