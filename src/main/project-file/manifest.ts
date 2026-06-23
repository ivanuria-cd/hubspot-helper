/** Serialización canónica + integridad del manifiesto (SPEC-0013 §2.6, §4.1). */
import { createHash } from 'node:crypto';
import type { ProjectManifest } from '@shared/types/project-file';

export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** JSON estable con claves ordenadas recursivamente (para checksum reproducible). */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function computeChecksum(manifest: Omit<ProjectManifest, 'checksum'>): string {
  return sha256(canonicalize(manifest));
}

export function verifyChecksum(manifest: ProjectManifest): boolean {
  const { checksum, ...rest } = manifest;
  return computeChecksum(rest) === checksum;
}
