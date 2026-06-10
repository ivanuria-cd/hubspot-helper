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
