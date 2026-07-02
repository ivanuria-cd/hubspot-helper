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
  /**
   * Hook previo a cada reintento (SPEC-0003 §18): el conector descuenta reservoir del limiter
   * para que los reintentos cuenten contra la cuota. No se reencola vía `limiter.schedule`
   * porque hacerlo desde dentro de un job en curso puede producir deadlock con `maxConcurrent`.
   */
  onRetry?: () => Promise<void>;
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

/** Espera antes de reintentar (SPEC-0003 §18): `Retry-After` si llega; si no, 10 s para 429
 * (ventana de rate limit de HubSpot) o backoff exponencial en segundos para 5xx. */
export function retryDelayMs(status: number, retryAfterHeader: unknown, attempt: number): number {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return status === 429 ? 10_000 : 2 ** attempt * 1000;
}

export function createHubSpotClient(options: HubSpotClientOptions): AxiosInstance {
  const { token, baseURL = HUBSPOT_BASE_URL, maxRetries = 3, adapter, delayFn, onRetry } = options;
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
        await wait(retryDelayMs(status, error.response?.headers?.['retry-after'], attempt));
        await onRetry?.();
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
