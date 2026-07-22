/**
 * Contrato del archivo de proyecto portable `.rvproj` (SPEC-0013).
 * Contenedor ZIP: manifest.json (índice + integridad) + sections/<featureKey>.json.
 */

import type { OperationResult } from './common';

export const PROJECT_FILE_MAGIC = 'revops-project';
export const PROJECT_FILE_FORMAT_VERSION = 1;

export interface ProjectFileSection {
  feature: string;
  schema_version: number;
  data: unknown;
}

export interface SectionIndexEntry {
  feature: string;
  schema_version: number;
  file: string;
  sha256: string;
}

export interface ProjectFileMeta {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  connectors: {
    hubspot?: { portalId: string };
    googleDrive?: { folderId: string };
  };
}

export interface ProjectManifest {
  magic: typeof PROJECT_FILE_MAGIC;
  format_version: number;
  app_version: string;
  exported_at: string;
  project: ProjectFileMeta;
  sections: SectionIndexEntry[];
  checksum: string;
}

export type SectionImportStatus = 'apply' | 'skipped-newer' | 'unknown';

export interface ImportSectionSummary {
  feature: string;
  schema_version: number;
  status: SectionImportStatus;
  count: number | null;
}

export interface ImportSummary {
  project: ProjectFileMeta;
  sections: ImportSectionSummary[];
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  checksumOk: boolean;
  collidesWithExistingId: boolean;
  warnings: string[];
}

export type ImportStrategy = 'copy' | 'overwrite';

export interface ExportProjectInput {
  projectId: string;
  filePath: string;
}

export interface ImportValidateInput {
  filePath: string;
}

export interface ImportApplyInput {
  filePath: string;
  strategy: ImportStrategy;
}

export type ProjectFileOperationResult = OperationResult;

export interface ExportProjectResult extends ProjectFileOperationResult {
  filePath?: string;
}
