/** Construcción del contenido del `.rvproj` a partir del proyecto y los contribuyentes (SPEC-0013 §5). */
import type { Project } from '@shared/types/project';
import {
  PROJECT_FILE_FORMAT_VERSION,
  PROJECT_FILE_MAGIC,
  type ProjectFileMeta,
  type ProjectFileSection,
  type ProjectManifest,
  type SectionIndexEntry,
} from '@shared/types/project-file';
import type { ArchiveEntries } from './archive';
import { computeChecksum, sha256 } from './manifest';
import { redactSecrets } from './redact';
import type { SectionRegistry } from './section-registry';

function projectMeta(project: Project): ProjectFileMeta {
  return redactSecrets({
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    connectors: project.connectors ?? {},
  });
}

export function buildArchiveEntries(
  project: Project,
  registry: SectionRegistry,
  appVersion: string,
  exportedAt: string,
): ArchiveEntries {
  const sections = new Map<string, ProjectFileSection>();

  for (const preserved of project.portableSections ?? []) {
    sections.set(preserved.feature, preserved);
  }
  for (const contributor of registry.list()) {
    sections.set(contributor.featureKey, {
      feature: contributor.featureKey,
      schema_version: contributor.currentSchemaVersion,
      data: redactSecrets(contributor.collect(project.id)),
    });
  }

  const entries: ArchiveEntries = new Map();
  const index: SectionIndexEntry[] = [];

  for (const section of sections.values()) {
    const file = `sections/${section.feature}.json`;
    const content = JSON.stringify(section, null, 2);
    entries.set(file, content);
    index.push({
      feature: section.feature,
      schema_version: section.schema_version,
      file,
      sha256: sha256(content),
    });
  }

  const manifestBody: Omit<ProjectManifest, 'checksum'> = {
    magic: PROJECT_FILE_MAGIC,
    format_version: PROJECT_FILE_FORMAT_VERSION,
    app_version: appVersion,
    exported_at: exportedAt,
    project: projectMeta(project),
    sections: index,
  };
  const manifest: ProjectManifest = {
    ...manifestBody,
    checksum: computeChecksum(manifestBody),
  };

  entries.set('manifest.json', JSON.stringify(manifest, null, 2));
  return entries;
}
