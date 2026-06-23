import { describe, it, expect } from 'vitest';
import { redactSecrets } from './redact';

describe('redactSecrets', () => {
  it('elimina claves de secreto anidadas y en arrays', () => {
    const input = {
      portalId: '123',
      token: 'abc',
      nested: { refreshToken: 'r', keep: 1 },
      list: [{ apiKey: 'k', name: 'x' }],
    };
    const out = redactSecrets(input) as Record<string, unknown>;
    expect(out.portalId).toBe('123');
    expect('token' in out).toBe(false);
    expect((out.nested as Record<string, unknown>).keep).toBe(1);
    expect('refreshToken' in (out.nested as object)).toBe(false);
    expect('apiKey' in (out.list as Record<string, unknown>[])[0]).toBe(false);
    expect((out.list as Record<string, unknown>[])[0].name).toBe('x');
  });

  it('es insensible a mayúsculas en los nombres de clave', () => {
    const out = redactSecrets({ PAT: 'x', AccessToken: 'y', ok: true }) as Record<string, unknown>;
    expect('PAT' in out).toBe(false);
    expect('AccessToken' in out).toBe(false);
    expect(out.ok).toBe(true);
  });
});
