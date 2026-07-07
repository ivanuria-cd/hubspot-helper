import { createHash } from 'node:crypto';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

const SERVICE = 'revops-app:hubspot';

/** Backend mínimo estilo keytar, inyectable para poder testear sin el keychain del SO. */
export interface KeychainBackend {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export interface TokenStore {
  save(projectId: string, environment: HubSpotEnvironment, token: string): Promise<void>;
  get(projectId: string, environment: HubSpotEnvironment): Promise<string | null>;
  remove(projectId: string, environment: HubSpotEnvironment): Promise<boolean>;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function accountFor(projectId: string, environment: HubSpotEnvironment): string {
  return `${projectId}:${environment}`;
}

export function createTokenStore(backend: KeychainBackend): TokenStore {
  return {
    save(projectId, environment, token) {
      return backend.setPassword(SERVICE, accountFor(projectId, environment), token);
    },
    get(projectId, environment) {
      return backend.getPassword(SERVICE, accountFor(projectId, environment));
    },
    remove(projectId, environment) {
      return backend.deletePassword(SERVICE, accountFor(projectId, environment));
    },
  };
}

export function createKeytarTokenStore(): TokenStore {
  // keytar es un módulo nativo; se carga de forma diferida para no afectar a los tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const keytar = require('keytar') as KeychainBackend;
  return createTokenStore(keytar);
}
