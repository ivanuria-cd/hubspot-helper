/**
 * Reintentos con backoff para las llamadas a Drive/Docs/Sheets (SPEC-0004 §25).
 * Homogéneo con el cliente HubSpot: 429/5xx son retriables; el resto propaga.
 */

export interface DriveRetryOptions {
  maxRetries?: number;
  /** Función de espera inyectable para tests. */
  delayFn?: (ms: number) => Promise<void>;
}

function statusOf(error: unknown): number | undefined {
  const err = error as { response?: { status?: number }; code?: number | string };
  if (typeof err?.response?.status === 'number') return err.response.status;
  const code = Number(err?.code);
  return Number.isFinite(code) ? code : undefined;
}

function isRetriable(status: number | undefined): boolean {
  return status === 429 || (status !== undefined && status >= 500 && status <= 599);
}

export async function withDriveRetry<T>(
  fn: () => Promise<T>,
  options: DriveRetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const wait =
    options.delayFn ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries || !isRetriable(statusOf(error))) throw error;
      await wait(2 ** attempt * 1000);
      attempt += 1;
    }
  }
}

/** Envuelve cada método async de un objeto con `withDriveRetry`. */
export function retried<T extends object>(api: T, options: DriveRetryOptions = {}): T {
  const out = {} as Record<string, unknown>;
  for (const key of Object.keys(api)) {
    const value = (api as Record<string, unknown>)[key];
    out[key] =
      typeof value === 'function'
        ? (...args: unknown[]) =>
            withDriveRetry(() => (value as (...a: unknown[]) => Promise<unknown>)(...args), options)
        : value;
  }
  return out as T;
}
