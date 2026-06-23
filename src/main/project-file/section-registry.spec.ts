import { describe, it, expect } from 'vitest';
import type { Project } from '@shared/types/project';
import { buildArchiveEntries } from './export';
import { applyImport, readManifest } from './import';
import { createSectionRegistry, type SectionContributor } from './section-registry';

const project: Project = {
  id: 'p1',
  name: 'X',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastOpenedAt: '2026-01-01T00:00:00.000Z',
  connectors: {},
};

/** Extensibilidad: una sección nueva se incluye en export e import sin tocar el núcleo. */
describe('section-registry (extensibilidad)', () => {
  it('una característica registrada aparece en export y se aplica en import', () => {
    const applied: unknown[] = [];
    const contributor: SectionContributor = {
      featureKey: 'nueva-feature',
      currentSchemaVersion: 1,
      collect: () => ({ rows: [1, 2, 3] }),
      apply: (_pid, data) => applied.push(data),
    };
    const registry = createSectionRegistry();
    registry.register(contributor);

    const entries = buildArchiveEntries(project, registry, '1.0.0', '2026-06-23T00:00:00.000Z');
    expect(entries.has('sections/nueva-feature.json')).toBe(true);

    const manifest = readManifest(entries);
    applyImport(manifest, entries, registry, {
      strategy: 'overwrite',
      newId: () => 'n',
      now: '2026-06-23T00:00:00.000Z',
    });
    expect(applied).toEqual([{ rows: [1, 2, 3] }]);
  });
});
