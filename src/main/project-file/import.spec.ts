import { describe, it, expect } from 'vitest';
import type { Project } from '@shared/types/project';
import type { ProjectManifest } from '@shared/types/project-file';
import { buildArchiveEntries } from './export';
import { applyImport, buildImportSummary, readManifest } from './import';
import { createSectionRegistry, type SectionContributor } from './section-registry';

function project(): Project {
  return {
    id: 'p1',
    name: 'Cliente X',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastOpenedAt: '2026-06-01T00:00:00.000Z',
    connectors: { hubspot: { portalId: '42' } },
  };
}

/** Contribuyente con almacén en memoria por projectId, para probar round-trip. */
function makeContributor(store: Map<string, unknown>): SectionContributor {
  return {
    featureKey: 'property-management',
    currentSchemaVersion: 1,
    collect: (pid) => store.get(pid) ?? { entries: [], origins: [] },
    apply: (pid, data) => {
      store.set(pid, data);
    },
  };
}

describe('import', () => {
  it('round-trip fiel export -> import', () => {
    const src = new Map<string, unknown>([['p1', { entries: [{ name: 'a' }], origins: [{ id: 'o' }] }]]);
    const exportRegistry = createSectionRegistry();
    exportRegistry.register(makeContributor(src));
    const entries = buildArchiveEntries(project(), exportRegistry, '1.0.0', '2026-06-23T00:00:00.000Z');

    const dst = new Map<string, unknown>();
    const importRegistry = createSectionRegistry();
    importRegistry.register(makeContributor(dst));
    const manifest = readManifest(entries);
    const result = applyImport(manifest, entries, importRegistry, {
      strategy: 'overwrite',
      newId: () => 'new',
      now: '2026-06-23T10:00:00.000Z',
    });

    expect(result.id).toBe('p1');
    expect(dst.get('p1')).toEqual({ entries: [{ name: 'a' }], origins: [{ id: 'o' }] });
  });

  it('estrategia copy genera id nuevo y renombra', () => {
    const registry = createSectionRegistry();
    registry.register(makeContributor(new Map()));
    const entries = buildArchiveEntries(project(), registry, '1.0.0', '2026-06-23T00:00:00.000Z');
    const manifest = readManifest(entries);
    const result = applyImport(manifest, entries, registry, {
      strategy: 'copy',
      newId: () => 'p-copy',
      now: '2026-06-23T10:00:00.000Z',
    });
    expect(result.id).toBe('p-copy');
    expect(result.name).toContain('copia');
  });

  it('aborta si format_version es mayor que el soportado', () => {
    const registry = createSectionRegistry();
    const entries = buildArchiveEntries(project(), registry, '1.0.0', '2026-06-23T00:00:00.000Z');
    const manifest = JSON.parse(entries.get('manifest.json') as string) as ProjectManifest;
    manifest.format_version = 99;
    entries.set('manifest.json', JSON.stringify(manifest));
    expect(() => readManifest(entries)).toThrow();
  });

  it('una seccion desconocida se omite del apply pero se preserva', () => {
    const registry = createSectionRegistry();
    registry.register(makeContributor(new Map()));
    const proj: Project = {
      ...project(),
      portableSections: [{ feature: 'future-x', schema_version: 5, data: { items: [1, 2] } }],
    };
    const entries = buildArchiveEntries(proj, registry, '1.0.0', '2026-06-23T00:00:00.000Z');
    const manifest = readManifest(entries);
    const result = applyImport(manifest, entries, registry, {
      strategy: 'overwrite',
      newId: () => 'x',
      now: '2026-06-23T10:00:00.000Z',
    });
    expect(result.portableSections?.some((s) => s.feature === 'future-x')).toBe(true);
  });

  it('el resumen marca colision de id, checksum y estado por seccion', () => {
    const registry = createSectionRegistry();
    registry.register(makeContributor(new Map()));
    const entries = buildArchiveEntries(project(), registry, '1.0.0', '2026-06-23T00:00:00.000Z');
    const manifest = readManifest(entries);
    const summary = buildImportSummary(manifest, entries, registry, ['p1']);
    expect(summary.collidesWithExistingId).toBe(true);
    expect(summary.checksumOk).toBe(true);
    expect(summary.sections[0].status).toBe('apply');
  });
});
