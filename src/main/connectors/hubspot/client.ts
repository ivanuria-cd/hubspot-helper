import axios, { type AxiosAdapter, type AxiosError, type AxiosInstance } from 'axios';

export const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
export const REDACTED = '[REDACTED]';

export interface HubSpotClientOptions {
  token: string;
  baseURL?: string;
  maxRetries?: number;
  /** Adaptador axios inyectable para tests. */
  adapter?: AxiosAdapter;
  /** Función de espera inyectable para tests (evita esperas reales en el backoff). */
  delayFn?: (ms: number) => Promise<void>;
}

function isRetriable(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** Sustituye cualquier aparición del token por `[REDACTED]` en textos de log/error. */
export function redactToken(value: string, token: string): string {
  return token ? value.split(token).join(REDACTED) : value;
}

interface RetryConfig {
  __retryCount?: number;
}

export function createHubSpotClient(options: HubSpotClientOptions): AxiosInstance {
  const { token, baseURL = HUBSPOT_BASE_URL, maxRetries = 3, adapter, delayFn } = options;
  const wait = delayFn ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const instance = axios.create({ baseURL, adapter, timeout: 30_000 });

  instance.interceptors.request.use((config) => {
    config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as (typeof error.config & RetryConfig) | undefined;
    const status = error.response?.status;
    if (config && status !== undefined && isRetriable(status)) {
      const attempt = config.__retryCount ?? 0;
      if (attempt < maxRetries) {
        config.__retryCount = attempt + 1;
        await wait(2 ** attempt * 100);
        return instance.request(config);
      }
    }
    if (typeof error.message === 'string') {
      error.message = redactToken(error.message, token);
    }
    return Promise.reject(error);
  });

  return instance;
}
