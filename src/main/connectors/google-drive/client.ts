import type { DriveFileMimeType } from '@shared/types/gdrive';
import { renderCoverText, type CoverContent } from './cover-template';
import type { RemoteFile } from './sync';

export const MIME_DOCUMENT: DriveFileMimeType = 'application/vnd.google-apps.document';
export const MIME_SPREADSHEET: DriveFileMimeType = 'application/vnd.google-apps.spreadsheet';
export const MIME_FOLDER = 'application/vnd.google-apps.folder';

export const APP_PROP_MANAGED = 'revops_managed';
export const APP_PROP_FEATURE = 'revops_feature';
export const APP_PROP_SCHEMA = 'revops_schema_version';

/** Delimitador entre la portada (editable solo por la app) y los datos gestionados. */
export const CONTENT_DELIMITER = '\n===== DATOS GESTIONADOS (no editar manualmente) =====\n';

interface RawDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  appProperties?: Record<string, string>;
}

interface RawDoc {
  body?: { content?: Array<{ endIndex?: number }> };
}

/**
 * Subconjunto de la Google Drive/Docs API que usa el conector. Se inyecta para poder testear
 * sin la librería `googleapis`; el façade lo adapta a partir de `google.drive()` / `google.docs()`.
 */
export interface DriveApi {
  filesList(args: { q: string; fields: string; spaces?: string }): Promise<{ files?: RawDriveFile[] }>;
  filesCreate(args: { requestBody: Record<string, unknown>; fields: string }): Promise<RawDriveFile>;
  filesGet(args: { fileId: string; fields: string }): Promise<RawDriveFile>;
  filesExport(args: { fileId: string; mimeType: string }): Promise<string>;
  filesDelete(args: { fileId: string }): Promise<void>;
  docsGet(args: { documentId: string }): Promise<RawDoc>;
  docsBatchUpdate(args: {
    documentId: string;
    requests: Array<Record<string, unknown>>;
  }): Promise<unknown>;
}

export function buildFullBody(cover: CoverContent, content: string): string {
  return `${renderCoverText(cover)}${CONTENT_DELIMITER}${content}`;
}

export function extractManagedContent(fullText: string): string {
  const index = fullText.indexOf(CONTENT_DELIMITER);
  return index === -1 ? '' : fullText.slice(index + CONTENT_DELIMITER.length);
}

function docEndIndex(doc: RawDoc): number {
  const content = doc.body?.content ?? [];
  return content.reduce((max, element) => Math.max(max, element.endIndex ?? 0), 1);
}

function toRemoteFile(file: RawDriveFile): RemoteFile {
  return {
    driveId: file.id,
    name: file.name,
    mimeType: file.mimeType as DriveFileMimeType,
    modifiedTime: file.modifiedTime ?? '',
    featureKey: file.appProperties?.[APP_PROP_FEATURE] ?? '',
  };
}

export function createDriveClient(api: DriveApi) {
  async function listManagedFiles(folderId: string): Promise<RemoteFile[]> {
    const result = await api.filesList({
      q: `'${folderId}' in parents and appProperties has { key='${APP_PROP_MANAGED}' and value='true' } and trashed = false`,
      fields: 'files(id,name,mimeType,modifiedTime,appProperties)',
      spaces: 'drive',
    });
    return (result.files ?? []).map(toRemoteFile);
  }

  async function ensureFeatureFolder(parentId: string, featureName: string): Promise<string> {
    const existing = await api.filesList({
      q: `'${parentId}' in parents and mimeType = '${MIME_FOLDER}' and name = '${featureName}' and trashed = false`,
      fields: 'files(id,name)',
      spaces: 'drive',
    });
    const found = existing.files?.[0];
    if (found) return found.id;
    const created = await api.filesCreate({
      requestBody: { name: featureName, mimeType: MIME_FOLDER, parents: [parentId] },
      fields: 'id',
    });
    return created.id;
  }

  async function createManagedDocument(input: {
    folderId: string;
    name: string;
    featureKey: string;
    schemaVersion: number;
    cover: CoverContent;
    content: string;
  }): Promise<{ driveId: string; modifiedTime: string }> {
    const file = await api.filesCreate({
      requestBody: {
        name: input.name,
        mimeType: MIME_DOCUMENT,
        parents: [input.folderId],
        appProperties: {
          [APP_PROP_MANAGED]: 'true',
          [APP_PROP_FEATURE]: input.featureKey,
          [APP_PROP_SCHEMA]: String(input.schemaVersion),
        },
      },
      fields: 'id,modifiedTime',
    });
    await api.docsBatchUpdate({
      documentId: file.id,
      requests: [
        { insertText: { location: { index: 1 }, text: buildFullBody(input.cover, input.content) } },
      ],
    });
    return { driveId: file.id, modifiedTime: file.modifiedTime ?? '' };
  }

  /** Reemplaza por completo el cuerpo del documento (portada + datos gestionados). */
  async function replaceDocumentBody(input: {
    driveId: string;
    cover: CoverContent;
    content: string;
  }): Promise<void> {
    const doc = await api.docsGet({ documentId: input.driveId });
    const endIndex = docEndIndex(doc);
    const requests: Array<Record<string, unknown>> = [];
    if (endIndex > 2) {
      requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } });
    }
    requests.push({
      insertText: { location: { index: 1 }, text: buildFullBody(input.cover, input.content) },
    });
    await api.docsBatchUpdate({ documentId: input.driveId, requests });
  }

  async function readManagedContent(driveId: string): Promise<string> {
    const text = await api.filesExport({ fileId: driveId, mimeType: 'text/plain' });
    return extractManagedContent(text);
  }

  function deleteFile(driveId: string): Promise<void> {
    return api.filesDelete({ fileId: driveId });
  }

  return {
    listManagedFiles,
    ensureFeatureFolder,
    createManagedDocument,
    replaceDocumentBody,
    readManagedContent,
    deleteFile,
  };
}

export type DriveClient = ReturnType<typeof createDriveClient>;
