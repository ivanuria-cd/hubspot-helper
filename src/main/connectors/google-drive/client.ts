import type { DriveFileMimeType, DriveFolder } from '@shared/types/gdrive';
import { buildCoverDocStyleRequests, renderCoverText, type CoverContent } from './cover-template';
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
  filesList(args: {
    q: string;
    fields: string;
    spaces?: string;
    supportsAllDrives?: boolean;
    includeItemsFromAllDrives?: boolean;
    pageSize?: number;
    pageToken?: string;
  }): Promise<{ files?: RawDriveFile[]; nextPageToken?: string }>;
  drivesList(args: {
    pageSize?: number;
    fields: string;
    pageToken?: string;
  }): Promise<{ drives?: Array<{ id: string; name: string }>; nextPageToken?: string }>;
  filesCreate(args: {
    requestBody: Record<string, unknown>;
    fields: string;
    supportsAllDrives?: boolean;
  }): Promise<RawDriveFile>;
  filesGet(args: { fileId: string; fields: string; supportsAllDrives?: boolean }): Promise<RawDriveFile>;
  filesExport(args: { fileId: string; mimeType: string; supportsAllDrives?: boolean }): Promise<string>;
  filesDelete(args: { fileId: string; supportsAllDrives?: boolean }): Promise<void>;
  docsGet(args: { documentId: string }): Promise<RawDoc>;
  docsBatchUpdate(args: {
    documentId: string;
    requests: Array<Record<string, unknown>>;
  }): Promise<unknown>;
}

export function buildFullBody(cover: CoverContent, content: string): string {
  return `${renderCoverText(cover)}${CONTENT_DELIMITER}${content}`;
}

/**
 * Requests de estilo (SPEC-0012): portada con estilos nativos + el marcador del bloque de datos
 * gestionados como Heading. Se anexan tras el `insertText`; no modifican el texto, así que el
 * round-trip de carga (SPEC-0004 §15.5) no cambia.
 */
export function buildDocStyleRequests(cover: CoverContent): Array<Record<string, unknown>> {
  const requests = buildCoverDocStyleRequests(cover, 1);
  const coverLen = renderCoverText(cover).length;
  const markerText = CONTENT_DELIMITER.trim();
  const markerStart = 1 + coverLen + 1;
  requests.push({
    updateParagraphStyle: {
      range: { startIndex: markerStart, endIndex: markerStart + markerText.length + 1 },
      paragraphStyle: { namedStyleType: 'HEADING_2' },
      fields: 'namedStyleType',
    },
  });
  requests.push({
    updateTextStyle: {
      range: { startIndex: markerStart, endIndex: markerStart + markerText.length },
      textStyle: { bold: true },
      fields: 'bold',
    },
  });
  return requests;
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

/** Escapa comillas simples en valores interpolados en queries de Drive (SPEC-0004 §24). */
function quote(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function createDriveClient(api: DriveApi) {
  /** Itera `nextPageToken` hasta agotar los resultados (SPEC-0004 §25). */
  async function listAllFiles(args: {
    q: string;
    fields: string;
  }): Promise<RawDriveFile[]> {
    const files: RawDriveFile[] = [];
    let pageToken: string | undefined;
    do {
      const result = await api.filesList({
        q: args.q,
        fields: `nextPageToken,${args.fields}`,
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1000,
        pageToken,
      });
      files.push(...(result.files ?? []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    return files;
  }

  async function listManagedFiles(folderId: string): Promise<RemoteFile[]> {
    const files = await listAllFiles({
      q: `'${quote(folderId)}' in parents and appProperties has { key='${APP_PROP_MANAGED}' and value='true' } and trashed = false`,
      fields: 'files(id,name,mimeType,modifiedTime,appProperties)',
    });
    return files.map(toRemoteFile);
  }

  function toFolders(files?: RawDriveFile[]): DriveFolder[] {
    return (files ?? [])
      .map((file) => ({ id: file.id, name: file.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Lista subcarpetas para el selector propio (§14). `root` = «Mi unidad»;
   * `sharedWithMe` = carpetas compartidas con el usuario (§14.10); resto = hijas del padre
   * (incluida la raíz de una unidad compartida, §14.11). Los flags de todas las unidades son
   * inocuos para «Mi unidad» y necesarios dentro de unidades compartidas.
   */
  async function listFolders(parentId: string): Promise<DriveFolder[]> {
    const parent = parentId.trim() || 'root';
    const q =
      parent === 'sharedWithMe'
        ? `sharedWithMe = true and mimeType = '${MIME_FOLDER}' and trashed = false`
        : `'${quote(parent)}' in parents and mimeType = '${MIME_FOLDER}' and trashed = false`;
    const files = await listAllFiles({ q, fields: 'files(id,name)' });
    return toFolders(files);
  }

  /** Lista las unidades compartidas accesibles (§14.11). El id es la raíz de cada unidad. */
  async function listSharedDrives(): Promise<DriveFolder[]> {
    const drives: Array<{ id: string; name: string }> = [];
    let pageToken: string | undefined;
    do {
      const result = await api.drivesList({
        pageSize: 100,
        fields: 'nextPageToken,drives(id,name)',
        pageToken,
      });
      drives.push(...(result.drives ?? []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    return drives
      .map((drive) => ({ id: drive.id, name: drive.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Busca carpetas por nombre en todas las unidades (§14.11). Resultados planos. */
  async function searchFolders(query: string): Promise<DriveFolder[]> {
    const term = quote(query.trim());
    if (!term) return [];
    const files = await listAllFiles({
      q: `name contains '${term}' and mimeType = '${MIME_FOLDER}' and trashed = false`,
      fields: 'files(id,name)',
    });
    return toFolders(files);
  }

  async function ensureFeatureFolder(parentId: string, featureName: string): Promise<string> {
    const existing = await api.filesList({
      q: `'${quote(parentId)}' in parents and mimeType = '${MIME_FOLDER}' and name = '${quote(featureName)}' and trashed = false`,
      fields: 'files(id,name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const found = existing.files?.[0];
    if (found) return found.id;
    const created = await api.filesCreate({
      requestBody: { name: featureName, mimeType: MIME_FOLDER, parents: [parentId] },
      fields: 'id',
      supportsAllDrives: true,
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
      supportsAllDrives: true,
    });
    // SPEC-0004 §21: si el cuerpo no se inserta, el Doc recién creado quedaría vacío y huérfano.
    // Se borra antes de propagar el error para no acumular duplicados vacíos.
    try {
      await api.docsBatchUpdate({
        documentId: file.id,
        requests: [
          { insertText: { location: { index: 1 }, text: buildFullBody(input.cover, input.content) } },
          ...buildDocStyleRequests(input.cover),
        ],
      });
    } catch (error) {
      try {
        await api.filesDelete({ fileId: file.id, supportsAllDrives: true });
      } catch {
        // El borrado de limpieza puede fallar; se prioriza propagar el error original.
      }
      throw error;
    }
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
    requests.push(...buildDocStyleRequests(input.cover));
    await api.docsBatchUpdate({ documentId: input.driveId, requests });
  }

  async function readManagedContent(driveId: string): Promise<string> {
    const text = await api.filesExport({
      fileId: driveId,
      mimeType: 'text/plain',
      supportsAllDrives: true,
    });
    return extractManagedContent(text);
  }

  function deleteFile(driveId: string): Promise<void> {
    return api.filesDelete({ fileId: driveId, supportsAllDrives: true });
  }

  return {
    listManagedFiles,
    listFolders,
    listSharedDrives,
    searchFolders,
    ensureFeatureFolder,
    createManagedDocument,
    replaceDocumentBody,
    readManagedContent,
    deleteFile,
  };
}

export type DriveClient = ReturnType<typeof createDriveClient>;
