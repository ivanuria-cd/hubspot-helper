import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGoogleCredentialsManager,
  type ClientIdStore,
  type SecretBackend,
} from './credentials-store';

function memoryClientId(initial?: string): ClientIdStore {
  let value = initial;
  return {
    get: () => value,
    set: (v) => {
      value = v;
    },
    delete: () => {
      value = undefined;
    },
  };
}

function memorySecret(initial: string | null = null): SecretBackend {
  let value = initial;
  return {
    get: () => Promise.resolve(value),
    set: (v) => {
      value = v;
      return Promise.resolve();
    },
    delete: () => {
      value = null;
      return Promise.resolve();
    },
  };
}

describe('GoogleCredentialsManager', () => {
  let clientIdStore: ClientIdStore;
  let secretBackend: SecretBackend;

  beforeEach(() => {
    clientIdStore = memoryClientId();
    secretBackend = memorySecret();
  });

  it('resuelve el fallback de .env cuando no hay valor en la app', async () => {
    const m = createGoogleCredentialsManager({
      clientIdStore,
      secretBackend,
      env: { clientId: 'env-id', clientSecret: 'env-secret' },
    });
    await m.ready();
    expect(m.resolve()).toEqual({ clientId: 'env-id', clientSecret: 'env-secret' });
    expect(m.status().clientId.source).toBe('env');
    expect(m.status().clientSecret.source).toBe('env');
  });

  it('el valor de la app tiene prioridad sobre .env y enmascara el preview', async () => {
    const m = createGoogleCredentialsManager({
      clientIdStore,
      secretBackend,
      env: { clientId: 'env-id' },
    });
    await m.set({ clientId: '1234567890.apps.googleusercontent.com', clientSecret: 'shhh' });
    expect(m.resolve()).toEqual({
      clientId: '1234567890.apps.googleusercontent.com',
      clientSecret: 'shhh',
    });
    const status = m.status();
    expect(status.clientId.source).toBe('app');
    expect(status.clientId.preview).toBe('····.com');
    expect(status.clientSecret).toEqual({ set: true, source: 'app' });
  });

  it('set con string vacío borra el valor de la app y revierte a .env', async () => {
    const m = createGoogleCredentialsManager({
      clientIdStore,
      secretBackend,
      env: { clientId: 'env-id' },
    });
    await m.set({ clientId: 'app-id' });
    expect(m.status().clientId.source).toBe('app');
    await m.set({ clientId: '' });
    expect(m.status().clientId.source).toBe('env');
    expect(m.resolve().clientId).toBe('env-id');
  });

  it('clear borra ambos campos de la app', async () => {
    const m = createGoogleCredentialsManager({ clientIdStore, secretBackend, env: {} });
    await m.set({ clientId: 'app-id', clientSecret: 'app-secret' });
    await m.clear();
    const status = m.status();
    expect(status.clientId.source).toBe('none');
    expect(status.clientSecret.source).toBe('none');
    expect(m.resolve()).toEqual({ clientId: '', clientSecret: undefined });
  });

  it('carga el secreto persistido en keytar al hacer ready()', async () => {
    const m = createGoogleCredentialsManager({
      clientIdStore: memoryClientId('stored-id'),
      secretBackend: memorySecret('stored-secret'),
      env: {},
    });
    await m.ready();
    expect(m.resolve()).toEqual({ clientId: 'stored-id', clientSecret: 'stored-secret' });
    expect(m.status().clientSecret.source).toBe('app');
  });
});
