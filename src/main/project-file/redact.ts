/** Saneado de secretos en la escritura del `.rvproj` (SPEC-0013 §2.6). */

const SECRET_KEYS = new Set(
  [
    'pat',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'clientsecret',
    'apikey',
    'secret',
    'password',
    'privatekey',
    'authorization',
  ].map((k) => k.toLowerCase()),
);

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.has(key.toLowerCase())) continue;
      out[key] = redactSecrets(val);
    }
    return out as T;
  }
  return value;
}
