import Bottleneck from 'bottleneck';

/**
 * Cola de peticiones a HubSpot. El límite estándar es 110 req / 10 s; se deja
 * margen (100) para no rozar el tope y se limita la concurrencia.
 */
export interface RateLimiterOptions {
  reservoir?: number;
  refreshInterval?: number;
  maxConcurrent?: number;
}

export function createRateLimiter(options: RateLimiterOptions = {}): Bottleneck {
  const reservoir = options.reservoir ?? 100;
  return new Bottleneck({
    reservoir,
    reservoirRefreshAmount: reservoir,
    reservoirRefreshInterval: options.refreshInterval ?? 10_000,
    maxConcurrent: options.maxConcurrent ?? 8,
  });
}
