import { describe, it, expect } from 'vitest';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { createHubSpotClient, redactToken } from './client';

function adapterReturning(handler: (config: InternalAxiosRequestConfig) => { status: number; data?: unknown }): {
  adapter: AxiosAdapter;
  configs: InternalAxiosRequestConfig[];
} {
  const configs: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = (config) => {
    configs.push(config);
    const { status, data } = handler(config);
    const response = { data: data ?? {}, status, statusText: '', headers: {}, config };
    // Replica el `settle` de axios: los adaptadores reales rechazan en estados no-2xx.
    if (status >= 200 && status < 300) return Promise.resolve(response);
    return Promise.reject(new AxiosError('Request failed', String(status), config, undefined, response));
  };
  return { adapter, configs };
}

describe('cliente HTTP de HubSpot', () => {
  it('añade el header Authorization Bearer con el token', async () => {
    const { adapter, configs } = adapterReturning(() => ({ status: 200, data: { ok: true } }));
    const client = createHubSpotClient({ token: 'pat-xyz', adapter });

    const res = await client.get('/crm/v3/objects/contacts');

    expect(res.status).toBe(200);
    expect(configs[0].headers.get('Authorization')).toBe('Bearer pat-xyz');
  });

  it('reintenta en 429 y termina con éxito', async () => {
    let calls = 0;
    const { adapter } = adapterReturning(() => {
      calls += 1;
      return { status: calls === 1 ? 429 : 200, data: { calls } };
    });
    const client = createHubSpotClient({ token: 't', adapter, delayFn: () => Promise.resolve() });

    const res = await client.get('/x');

    expect(calls).toBe(2);
    expect(res.status).toBe(200);
  });

  it('reintenta en 5xx hasta agotar maxRetries y luego falla', async () => {
    let calls = 0;
    const { adapter } = adapterReturning(() => {
      calls += 1;
      return { status: 503 };
    });
    const client = createHubSpotClient({ token: 't', adapter, maxRetries: 2, delayFn: () => Promise.resolve() });

    await expect(client.get('/x')).rejects.toBeTruthy();
    expect(calls).toBe(3);
  });

  it('redacta el token en los mensajes', () => {
    expect(redactToken('falló con token abc-123 en el header', 'abc-123')).toBe(
      'falló con token [REDACTED] en el header',
    );
  });
});
