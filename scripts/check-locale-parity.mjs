/**
 * Paridad de claves de `src/renderer/locales/<locale>/common.json` contra `es` (SPEC-0014 §7).
 * `es` es el canónico; `_fallbackProbe` solo existe en `es` (sonda del fallback, SPEC-0009).
 * Uso: node scripts/check-locale-parity.mjs  → exit 1 si hay claves faltantes o sobrantes.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'renderer', 'locales');
const CANONICAL = 'es';
const LOCALES = ['ca', 'eu', 'en', 'gl', 'pt', 'fr'];
const ONLY_IN_CANONICAL = new Set(['_fallbackProbe']);

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? flat(value, path) : [path];
  });

const load = (locale) => JSON.parse(readFileSync(join(LOCALES_DIR, locale, 'common.json'), 'utf8'));

const canonicalKeys = new Set(flat(load(CANONICAL)));
let failed = false;

for (const locale of LOCALES) {
  const keys = new Set(flat(load(locale)));
  const missing = [...canonicalKeys].filter((k) => !keys.has(k) && !ONLY_IN_CANONICAL.has(k));
  const extra = [...keys].filter((k) => !canonicalKeys.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`✗ ${locale}: ${missing.length} faltantes, ${extra.length} sobrantes`);
    for (const k of missing) console.error(`    falta: ${k}`);
    for (const k of extra) console.error(`    sobra: ${k}`);
  } else {
    console.log(`✓ ${locale}: paridad completa (${keys.size} claves)`);
  }
}

process.exit(failed ? 1 : 0);
