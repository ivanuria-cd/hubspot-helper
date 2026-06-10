import { describe, it, expect, beforeEach } from 'vitest';
import { createAuth, generateToken, type TokenStorage } from './auth';

function memoryStorage(): TokenStorage {
  let token: string | null = null;
  return {
    getToken: () => token,
    setToken: (value) => {
      token = value;
    },
  };
}

describe('auth MCP', () => {
  it('generateToken produce 64 hex (256 bits) y es único', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  describe('createAuth', () => {
    let auth: ReturnType<typeof createAuth>;
    let storage: TokenStorage;

    beforeEach(() => {
      storage = memoryStorage();
      auth = createAuth(storage);
    });

    it('ensureToken genera y persiste un token estable', () => {
      const first = auth.ensureToken();
      const second = auth.ensureToken();
      expect(first).toBe(second);
      expect(storage.getToken()).toBe(first);
    });

    it('valida el token correcto y rechaza el incorrecto', () => {
      const token = auth.ensureToken();
      expect(auth.validate(token)).toBe(true);
      expect(auth.validate('incorrecto')).toBe(false);
      expect(auth.validate('')).toBe(false);
      expect(auth.validate(null)).toBe(false);
      expect(auth.validate(undefined)).toBe(false);
    });

    it('regenerate invalida el token anterior', () => {
      const old = auth.ensureToken();
      const next = auth.regenerate();
      expect(next).not.toBe(old);
      expect(auth.validate(old)).toBe(false);
      expect(auth.validate(next)).toBe(true);
    });

    it('rechaza cualquier token cuando no hay ninguno almacenado', () => {
      expect(auth.validate('lo-que-sea')).toBe(false);
    });
  });
});
