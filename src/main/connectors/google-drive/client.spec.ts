import { describe, it, expect, vi } from 'vitest';
import {
  APP_PROP_FEATURE,
  APP_PROP_MANAGED,
  CONTENT_DELIMITER,
  createDriveClient,
  extractManagedContent,
  MIME_FOLDER,
  type DriveApi,
} from './client';
import { buildCover } from './cover-template';

function fakeApi(overrides: Partial<DriveApi> = {}): DriveApi {
  return {
    filesList: vi.fn().mockResolvedValue({ files: [] }),
    drivesList: vi.fn().mockResolvedValue({ drives: [] }),
    filesCreate: vi.fn().mockResolvedValue({ id: 'new-id', modifiedTime: '2026-01-01T00:00:00Z' }),
    filesGet: vi.fn().mockResolvedValue({ id: 'x' }),
    filesExport: vi.fn().mockResolvedValue(''),
    filesDelete: vi.fn().mockResolvedValue(undefined),
    docsGet: vi.fn().mockResolvedValue({ body: { content: [{ endIndex: 1 }] } }),
    docsBatchUpdate: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

const cover = buildCover({
  title: 'T',
  schemaVersion: 1,
  whatIsIt: 'a',
  purpose: 'b',
  howToRead: 'c',
  userCanModify: 'd',
  userMustNotModify: 'e',
});

describe('cliente Drive', () => {
  it('lista solo los archivos gestionados de la carpeta', async () => {
    const api = fakeApi({
      filesList: vi.fn().mockResolvedValue({
        files: [
          {
            id: '1',
            name: 'Mapa',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            modifiedTime: '2026-01-01T00:00:00Z',
            appProperties: { [APP_PROP_MANAGED]: 'true', [APP_PROP_FEATURE]: 'props' },
          },
        ],
      }),
    });
    const client = createDriveClient(api);
    const files = await client.listManagedFiles('folder-1');
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("'folder-1' in parents") }),
    );
    expect(files[0]).toMatchObject({ driveId: '1', featureKey: 'props' });
  });

  it('listFolders consulta subcarpetas del padre y ordena por nombre', async () => {
    const api = fakeApi({
      filesList: vi.fn().mockResolvedValue({
        files: [
          { id: 'b', name: 'Beta' },
          { id: 'a', name: 'Alfa' },
        ],
      }),
    });
    const client = createDriveClient(api);
    const folders = await client.listFolders('parent-1');
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({
        q: expect.stringContaining(`mimeType = '${MIME_FOLDER}'`),
      }),
    );
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("'parent-1' in parents") }),
    );
    expect(folders.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('listFolders usa "root" cuando el padre va vacío', async () => {
    const api = fakeApi();
    const client = createDriveClient(api);
    await client.listFolders('');
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("'root' in parents") }),
    );
  });

  it('listFolders("sharedWithMe") consulta con sharedWithMe = true', async () => {
    const api = fakeApi();
    const client = createDriveClient(api);
    await client.listFolders('sharedWithMe');
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining('sharedWithMe = true') }),
    );
    expect(api.filesList).not.toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining('in parents') }),
    );
  });

  it('listFolders envía los flags de todas las unidades (§14.11)', async () => {
    const api = fakeApi();
    const client = createDriveClient(api);
    await client.listFolders('root');
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({ supportsAllDrives: true, includeItemsFromAllDrives: true }),
    );
  });

  it('pagina con nextPageToken hasta agotar los resultados (§25)', async () => {
    const filesList = vi
      .fn()
      .mockResolvedValueOnce({ files: [{ id: 'a', name: 'Alfa' }], nextPageToken: 'p2' })
      .mockResolvedValueOnce({ files: [{ id: 'b', name: 'Beta' }] });
    const api = fakeApi({ filesList });
    const client = createDriveClient(api);
    const folders = await client.listFolders('parent-1');
    expect(filesList).toHaveBeenCalledTimes(2);
    expect(filesList).toHaveBeenLastCalledWith(expect.objectContaining({ pageToken: 'p2' }));
    expect(folders.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('listSharedDrives consulta drivesList y mapea id/name', async () => {
    const api = fakeApi({
      drivesList: vi.fn().mockResolvedValue({
        drives: [
          { id: 'd2', name: 'Ventas' },
          { id: 'd1', name: 'Marketing' },
        ],
      }),
    });
    const client = createDriveClient(api);
    const drives = await client.listSharedDrives();
    expect(api.drivesList).toHaveBeenCalled();
    expect(drives.map((d) => d.name)).toEqual(['Marketing', 'Ventas']);
  });

  it('searchFolders arma "name contains" y escapa comillas simples', async () => {
    const api = fakeApi();
    const client = createDriveClient(api);
    await client.searchFolders("O'Brien");
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({
        q: expect.stringContaining("name contains 'O\\'Brien'"),
        supportsAllDrives: true,
      }),
    );
  });

  it('searchFolders con término vacío no llama a la API', async () => {
    const api = fakeApi();
    const client = createDriveClient(api);
    expect(await client.searchFolders('   ')).toEqual([]);
    expect(api.filesList).not.toHaveBeenCalled();
  });

  it('reutiliza la subcarpeta de feature si ya existe', async () => {
    const api = fakeApi({
      filesList: vi.fn().mockResolvedValue({ files: [{ id: 'sub-1', name: 'props' }] }),
    });
    const client = createDriveClient(api);
    expect(await client.ensureFeatureFolder('root', 'props')).toBe('sub-1');
    expect(api.filesCreate).not.toHaveBeenCalled();
  });

  it('crea la subcarpeta de feature cuando no existe', async () => {
    const api = fakeApi({ filesCreate: vi.fn().mockResolvedValue({ id: 'sub-new' }) });
    const client = createDriveClient(api);
    expect(await client.ensureFeatureFolder('root', 'props')).toBe('sub-new');
    expect(api.filesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ mimeType: MIME_FOLDER, parents: ['root'] }),
      }),
    );
  });

  it('crea un documento gestionado con appProperties y portada', async () => {
    const api = fakeApi();
    const client = createDriveClient(api);
    const result = await client.createManagedDocument({
      folderId: 'sub',
      name: 'props',
      featureKey: 'props',
      schemaVersion: 1,
      cover,
      content: 'DATOS',
    });
    expect(result.driveId).toBe('new-id');
    expect(api.filesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          appProperties: expect.objectContaining({ [APP_PROP_MANAGED]: 'true' }),
        }),
      }),
    );
    const batchArg = (api.docsBatchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const text = batchArg.requests[0].insertText.text as string;
    expect(text).toContain('schema_version: 1');
    expect(text).toContain('DATOS');
  });

  it('borra el documento recién creado si falla docsBatchUpdate (SPEC-0004 §21)', async () => {
    const api = fakeApi({
      docsBatchUpdate: vi.fn().mockRejectedValue(new Error('Docs API down')),
    });
    const client = createDriveClient(api);
    await expect(
      client.createManagedDocument({
        folderId: 'sub',
        name: 'props',
        featureKey: 'props',
        schemaVersion: 1,
        cover,
        content: 'DATOS',
      }),
    ).rejects.toThrow('Docs API down');
    expect(api.filesDelete).toHaveBeenCalledWith({ fileId: 'new-id', supportsAllDrives: true });
  });

  it('§22: las operaciones de fichero pasan supportsAllDrives (unidades compartidas)', async () => {
    const api = fakeApi();
    const client = createDriveClient(api);
    await client.listManagedFiles('folder-1');
    expect(api.filesList).toHaveBeenCalledWith(
      expect.objectContaining({ supportsAllDrives: true, includeItemsFromAllDrives: true }),
    );
    await client.createManagedDocument({
      folderId: 'sub',
      name: 'props',
      featureKey: 'props',
      schemaVersion: 1,
      cover,
      content: 'DATOS',
    });
    expect(api.filesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ supportsAllDrives: true }),
    );
    await client.readManagedContent('doc');
    expect(api.filesExport).toHaveBeenCalledWith(
      expect.objectContaining({ supportsAllDrives: true }),
    );
    await client.deleteFile('doc');
    expect(api.filesDelete).toHaveBeenCalledWith({ fileId: 'doc', supportsAllDrives: true });
  });

  it('reemplaza el cuerpo borrando el rango previo antes de insertar', async () => {
    const api = fakeApi({
      docsGet: vi.fn().mockResolvedValue({ body: { content: [{ endIndex: 50 }] } }),
    });
    const client = createDriveClient(api);
    await client.replaceDocumentBody({ driveId: 'doc', cover, content: 'NUEVO' });
    const batchArg = (api.docsBatchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(batchArg.requests[0]).toHaveProperty('deleteContentRange');
    expect(batchArg.requests[1].insertText.text).toContain('NUEVO');
  });

  it('lee el contenido gestionado extrayéndolo tras el delimitador', async () => {
    const api = fakeApi({
      filesExport: vi.fn().mockResolvedValue(`PORTADA${CONTENT_DELIMITER}CONTENIDO`),
    });
    const client = createDriveClient(api);
    expect(await client.readManagedContent('doc')).toBe('CONTENIDO');
  });
});

describe('extractManagedContent', () => {
  it('devuelve cadena vacía si no hay delimitador', () => {
    expect(extractManagedContent('solo portada')).toBe('');
  });
});
