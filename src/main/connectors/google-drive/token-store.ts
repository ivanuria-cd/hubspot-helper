import type { TokenSet } from './auth';

const SERVICE = 'revops-app:google-drive';

/** Backend mínimo estilo keytar, inyectable para poder testear sin el keychain del SO. */
export interface KeychainBackend {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export interface GoogleTokenStore {
  save(projectId: string, tokens: TokenSet): Promise<void>;
  get(projectId: string): Promise<TokenSet | null>;
  remove(projectId: string): Promise<boolean>;
}

export function createGoogleTokenStore(backend: KeychainBackend): GoogleTokenStore {
  return {
    save(projectId, tokens) {
      return backend.setPassword(SERVICE, projectId, JSON.stringify(tokens));
    },
    async get(projectId) {
      const raw = await backend.getPassword(SERVICE, projectId);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as TokenSet;
      } catch {
        return null;
      }
    },
    remove(projectId) {
      return backend.deletePassword(SERVICE, projectId);
    },
  };
}

export function createKeytarGoogleTokenStore(): GoogleTokenStore {
  // keytar es un módulo nativo; se carga de forma diferida para no afectar a los tests.
  const keytar = require('keytar') as KeychainBackend;
  return createGoogleTokenStore(keytar);
}
