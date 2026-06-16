/**
 * Gestión de las credenciales OAuth de Google (SPEC-0004 §13). Globales de la app:
 * `clientId` en electron-store; `clientSecret` en el llavero del SO (keytar). `.env` actúa como
 * fallback de solo lectura. La caché en memoria permite que el conector resuelva las credenciales
 * de forma síncrona (`resolve`) tras `ready()`. El estado expuesto al renderer va enmascarado.
 */
import Store from 'electron-store';
import type {
  GoogleCredentialSource,
  GoogleCredentialsInput,
  GoogleCredentialsStatus,
} from '@shared/types/gdrive';

export interface GoogleCredentials {
  clientId: string;
  clientSecret?: string;
}

/** electron-store síncrono para el `clientId` (no secreto). */
export interface ClientIdStore {
  get(): string | undefined;
  set(value: string): void;
  delete(): void;
}

/** Backend estilo keytar para el `clientSecret`. */
export interface SecretBackend {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  delete(): Promise<void>;
}

export interface GoogleCredentialsManagerDeps {
  clientIdStore: ClientIdStore;
  secretBackend: SecretBackend;
  env: { clientId?: string; clientSecret?: string };
}

function nonEmpty(value?: string | null): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : undefined;
}

function preview(value?: string): string {
  const v = value ?? '';
  return v.length > 4 ? `····${v.slice(-4)}` : v;
}

export interface GoogleCredentialsManager {
  ready(): Promise<void>;
  resolve(): GoogleCredentials;
  status(): GoogleCredentialsStatus;
  set(input: GoogleCredentialsInput): Promise<{ success: boolean; error?: string }>;
  clear(): Promise<{ success: boolean; error?: string }>;
}

export function createGoogleCredentialsManager(
  deps: GoogleCredentialsManagerDeps,
): GoogleCredentialsManager {
  let appClientId = nonEmpty(deps.clientIdStore.get());
  let appSecret: string | undefined;
  let readyPromise: Promise<void> | null = null;

  function load(): Promise<void> {
    if (!readyPromise) {
      readyPromise = deps.secretBackend.get().then((value) => {
        appSecret = nonEmpty(value);
      });
    }
    return readyPromise;
  }

  function resolve(): GoogleCredentials {
    return {
      clientId: appClientId ?? nonEmpty(deps.env.clientId) ?? '',
      clientSecret: appSecret ?? nonEmpty(deps.env.clientSecret),
    };
  }

  function status(): GoogleCredentialsStatus {
    const envClientId = nonEmpty(deps.env.clientId);
    const envSecret = nonEmpty(deps.env.clientSecret);
    const clientIdSource: GoogleCredentialSource = appClientId ? 'app' : envClientId ? 'env' : 'none';
    const secretSource: GoogleCredentialSource = appSecret ? 'app' : envSecret ? 'env' : 'none';
    return {
      clientId: {
        set: clientIdSource !== 'none',
        source: clientIdSource,
        preview: preview(appClientId ?? envClientId),
      },
      clientSecret: { set: secretSource !== 'none', source: secretSource },
    };
  }

  async function set(input: GoogleCredentialsInput): Promise<{ success: boolean; error?: string }> {
    try {
      if (input.clientId !== undefined) {
        const value = nonEmpty(input.clientId);
        if (value) {
          deps.clientIdStore.set(value);
          appClientId = value;
        } else {
          deps.clientIdStore.delete();
          appClientId = undefined;
        }
      }
      if (input.clientSecret !== undefined) {
        const value = nonEmpty(input.clientSecret);
        if (value) {
          await deps.secretBackend.set(value);
          appSecret = value;
        } else {
          await deps.secretBackend.delete();
          appSecret = undefined;
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error al guardar credenciales' };
    }
  }

  async function clear(): Promise<{ success: boolean; error?: string }> {
    return set({ clientId: '', clientSecret: '' });
  }

  return { ready: load, resolve, status, set, clear };
}

// ---------------------------------------------------------------------------
// Wiring real (electron-store + keytar). No se ejercita en tests.
// ---------------------------------------------------------------------------

const KEYTAR_SERVICE = 'revops-app:google-drive-credentials';
const SECRET_ACCOUNT = 'client_secret';

interface CredentialsSchema {
  clientId?: string;
}

interface KeytarLike {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export function createElectronGoogleCredentialsManager(): GoogleCredentialsManager {
  const store = new Store<CredentialsSchema>({ name: 'gdrive-credentials', defaults: {} });
  const clientIdStore: ClientIdStore = {
    get: () => store.get('clientId'),
    set: (value) => store.set('clientId', value),
    delete: () => store.delete('clientId'),
  };
  const secretBackend: SecretBackend = {
    get: () => (require('keytar') as KeytarLike).getPassword(KEYTAR_SERVICE, SECRET_ACCOUNT),
    set: (value) => (require('keytar') as KeytarLike).setPassword(KEYTAR_SERVICE, SECRET_ACCOUNT, value),
    delete: async () => {
      await (require('keytar') as KeytarLike).deletePassword(KEYTAR_SERVICE, SECRET_ACCOUNT);
    },
  };
  return createGoogleCredentialsManager({
    clientIdStore,
    secretBackend,
    env: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
  });
}
