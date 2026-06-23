/** Validación, resumen y aplicación de un `.rvproj` (SPEC-0013 §5). */
import type { Project } from '@shared/types/project';
import {
  PROJECT_FILE_FORMAT_VERSION,
  PROJECT_FILE_MAGIC,
  type ImportSectionSummary,
  type ImportStrategy,
  type ImportSummary,
  type ProjectFileSection,
  type ProjectManifest,
} from '@shared/types/project-file';
import type { ArchiveEntries } from './archive';
import { sha256, verifyChecksum } from './manifest';
import type { SectionRegistry } from './section-registry';

export function readManifest(entries: ArchiveEntries): ProjectManifest {
  const raw = entries.get('manifest.json');
  if (!raw) throw new Error('El archivo no contiene manifest.json.');
  let manifest: ProjectManifest;
  try {
    manifest = JSON.parse(raw) as ProjectManifest;
  } catch {
    throw new Error('El manifiesto del archivo no es un JSON válido.');
  }
  if (manifest.magic !== PROJECT_FILE_MAGIC) {
    throw new Error('El archivo no es un proyecto RevOps válido.');
  }
  if (typeof manifest.format_version !== 'number') {
    throw new Error('El manifiesto no tiene una versión de formato válida.');
  }
  if (manifest.format_version > PROJECT_FILE_FORMAT_VERSION) {
    throw new Error('El archivo es de una versión más nueva que la app.');
  }
  return manifest;
}

function readSection(entries: ArchiveEntries, file: string): ProjectFileSection | null {
  const raw = entries.get(file);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProjectFileSection;
  } catch {
    return null;
  }
}

function countItems(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  let total = 0;
  let found = false;
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      total += value.length;
      found = true;
    }
  }
  return found ? total : null;
}

export function buildImportSummary(
  manifest: ProjectManifest,
  entries: ArchiveEntries,
  registry: SectionRegistry,
  existingProjectIds: string[],
): ImportSummary {
  const warnings: string[] = [];
  const checksumOk = verifyChecksum(manifest);
  if (!checksumOk) warnings.push('checksum-mismatch');

  const sections: ImportSectionSummary[] = manifest.sections.map((indexEntry) => {
    const raw = entries.get(indexEntry.file);
    if (raw !== undefined && sha256(raw) !== indexEntry.sha256) {
      warnings.push(`section-hash-mismatch:${indexEntry.feature}`);
    }
    const section = raw !== undefined ? readSection(entries, indexEntry.file) : null;
    const contributor = registry.get(indexEntry.feature);
    let status: ImportSectionSummary['status'];
    if (!contributor) status = 'unknown';
    else if (indexEntry.schema_version > contributor.currentSchemaVersion) status = 'skipped-newer';
    else status = 'apply';
    return {
      feature: indexEntry.feature,
      schema_version: indexEntry.schema_version,
      status,
      count: section ? countItems(section.data) : null,
    };
  });

  return {
    project: manifest.project,
    sections,
    formatVersion: manifest.format_version,
    appVersion: manifest.app_version,
    exportedAt: manifest.exported_at,
    checksumOk,
    collidesWithExistingId: existingProjectIds.includes(manifest.project.id),
    warnings,
  };
}

export interface ApplyImportOptions {
  strategy: ImportStrategy;
  newId: () => string;
  now: string;
}

/**
 * Construye el `Project` a reconstruir y aplica las secciones soportadas vía sus
 * contribuyentes. Las secciones desconocidas o más nuevas se preservan en
 * `portableSections` (round-trip no destructivo, §2.4). No persiste el proyecto:
 * eso lo hace el llamador (handler IPC).
 */
export function applyImport(
  manifest: ProjectManifest,
  entries: ArchiveEntries,
  registry: SectionRegistry,
  options: ApplyImportOptions,
): Project {
  const targetId = options.strategy === 'copy' ? options.newId() : manifest.project.id;
  const meta = manifest.project;
  const preserved: ProjectFileSection[] = [];

  for (const indexEntry of manifest.sections) {
    const section = readSection(entries, indexEntry.file);
    if (!section) continue;
    const contributor = registry.get(indexEntry.feature);
    if (contributor && section.schema_version <= contributor.currentSchemaVersion) {
      contributor.apply(targetId, section.data, section.schema_version);
    } else {
      preserved.push(section);
    }
  }

  const project: Project = {
    id: targetId,
    name: options.strategy === 'copy' ? `${meta.name} (copia)` : meta.name,
    description: meta.description,
    createdAt: meta.createdAt ?? options.now,
    lastOpenedAt: options.now,
    connectors: meta.connectors ?? {},
  };
  if (preserved.length > 0) project.portableSections = preserved;
  return project;
}
