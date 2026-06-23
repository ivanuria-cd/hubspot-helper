import { describe, it, expect } from 'vitest';
import type { Project } from '@shared/types/project';
import type { ProjectManifest } from '@shared/types/project-file';
import { buildArchiveEntries } from './export';
import { verifyChecksum, sha256 } from './manifest';
import { createSectionRegistry, type SectionContributor } from './section-registry';

function project(): Project {
  return {
    id: 'p1',
    name: 'Cliente X',
    description: 'demo',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastOpenedAt: '2026-06-01T00:00:00.000Z',
    connectors: { hubspot: { portalId: '42' } },
  };
}

function contributor(): SectionContributor {
  return {
    featureKey: 'property-management',
    currentSchemaVersion: 1,
    collect: () => ({ entries: [{ name: 'e1' }], origins: [], token: 'SECRET' }),
    apply: () => undefined,
  };
}

describe('buildArchiveEntries', () => {
  it('emite manifest + ficheros de sección con sha256 y checksum válidos', () => {
    const registry = createSectionRegistry();
    registry.register(contributor());
    const entries = buildArchiveEntries(project(), registry, '1.2.3', '2026-06-23T00:00:00.000Z');

    expect(entries.has('manifest.json')).toBe(true);
    expect(entries.has('sections/property-management.json')).toBe(true);

    const manifest = JSON.parse(entries.get('manifest.json') as string) as ProjectManifest;
    expect(manifest.magic).toBe('revops-project');
    expect(manifest.format_version).toBe(1);
    expect(verifyChecksum(manifest)).toBe(true);

    const indexEntry = manifest.sections[0];
    const content = entries.get(indexEntry.file) as string;
    expect(sha256(content)).toBe(indexEntry.sha256);
  });

  it('no incluye secretos (redacción en escritura)', () => {
    const registry = createSectionRegistry();
    registry.register(contributor());
    const entries = buildArchiveEntries(project(), registry, '1.0.0', '2026-06-23T00:00:00.000Z');
    const content = entries.get('sections/property-management.json') as string;
    expect(content).not.toContain('SECRET');
    expect(content).not.toContain('token');
  });

  it('reincluye secciones preservadas (portableSections) en el reexport', () => {
    const registry = createSectionRegistry();
    const proj = { ...project(), portableSections: [{ feature: 'future-x', schema_version: 9, data: { a: 1 } }] };
    const entries = buildArchiveEntries(proj, registry, '1.0.0', '2026-06-23T00:00:00.000Z');
    expect(entries.has('sections/future-x.json')).toBe(true);
  });
});
