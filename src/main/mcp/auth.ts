import { randomBytes, timingSafeEqual } from 'node:crypto';

/** Persistencia mínima del token, inyectable para testear sin electron-store. */
export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
}

export interface McpAuth {
  /** Devuelve el token actual; lo genera y persiste si aún no existe. */
  ensureToken(): string;
  /** Genera un token nuevo, invalida el anterior y lo persiste. */
  regenerate(): string;
  /** Valida un token candidato en tiempo constante. */
  validate(candidate: string | null | undefined): boolean;
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function createAuth(storage: TokenStorage): McpAuth {
  function ensureToken(): string {
    const existing = storage.getToken();
    if (existing) return existing;
    const token = generateToken();
    storage.setToken(token);
    return token;
  }

  function regenerate(): string {
    const token = generateToken();
    storage.setToken(token);
    return token;
  }

  function validate(candidate: string | null | undefined): boolean {
    const current = storage.getToken();
    if (!current || !candidate) return false;
    const a = Buffer.from(current);
    const b = Buffer.from(candidate);
    // timingSafeEqual exige misma longitud; comparar antes evita su excepción
    // y la diferencia de longitud no filtra información sensible del token.
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  return { ensureToken, regenerate, validate };
}
