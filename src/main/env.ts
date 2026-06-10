import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Carga el primer `.env` encontrado en process.env sin pisar variables ya definidas.
 * Electron no lo hace por defecto y electron-vite solo expone variables con prefijo a
 * import.meta.env, no a process.env.
 */
export function loadEnv(): void {
  const candidates = [
    join(process.cwd(), '.env'),
    join(app.getAppPath(), '.env'),
    join(app.getPath('userData'), '.env'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
      if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value;
    }
  }
}
