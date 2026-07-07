import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { shell } from 'electron';
import axios from 'axios';
import Store from 'electron-store';
import type {
  DriveFolder,
  GoogleCredentialsInput,
  GoogleCredentialsStatus,
  GoogleDriveAuthStatus,
  GoogleDriveConfig,
  GoogleDriveFolderResult,
  GoogleDriveOperationResult,
  GoogleDriveReadFileResult,
  GoogleDriveSyncResult,
  GoogleDriveWriteFileResult,
} from '@shared/types/gdrive';
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  fetchUserEmail,
  generateCodeChallenge,
  generateCodeVerifier,
  parseCallbackUrl,
  refreshAccessToken,
  revokeToken,
  shouldRefresh,
  type OAuthHttpClient,
  type TokenSet,
} from './auth';
import { createProjectRecord } from '../../shared/project-record';
import { createDriveClient, type DriveApi, type DriveClient } from './client';
import { retried } from './retry';
import { createSheetsClient, type SheetsClient, type SheetTab } from './sheets-client';
import { buildCover, type CoverInput } from './cover-template';
import { reconcile } from './sync';
import {
  createGoogleTokenStore,
  createKeytarGoogleTokenStore,
  type GoogleTokenStore,
} from './token-store';
import {
  createElectronGoogleCredentialsManager,
  type GoogleCredentialsManager,
} from './credentials-store';

export const SCHEMA_VERSION = 1;

export interface GoogleDriveConfigStore {
  get(projectId: string): GoogleDriveConfig | null;
  set(projectId: string, config: GoogleDriveConfig): void;
  delete(projectId: string): void;
}

interface GoogleDriveConfigSchema {
  configs: Record<string, GoogleDriveConfig>;
}

class ElectronGoogleDriveConfigStore implements GoogleDriveConfigStore {
  private readonly record = createProjectRecord<GoogleDriveConfig>(
    new Store<GoogleDriveConfigSchema>({ name: 'gdrive', defaults: { configs: {} } }),
    'configs',
  );

  get(projectId: string): GoogleDriveConfig | null {
    return this.record.get(projectId) ?? null;
  }

  set(projectId: string, config: GoogleDriveConfig): void {
    this.record.set(projectId, config);
  }

  delete(projectId: string): void {
    this.record.delete(projectId);
  }
}

export interface GoogleDriveEnv {
  clientId: string;
  clientSecret?: string;
}

/** Métodos de credenciales que el façade expone hacia los handlers IPC (§13). */
export interface CredentialsFacade {
  ready(): Promise<void>;
  status(): GoogleCredentialsStatus;
  set(input: GoogleCredentialsInput): Promise<{ success: boolean; error?: string }>;
  clear(): Promise<{ success: boolean; error?: string }>;
}

export interface GoogleDriveConnectorDeps {
  configs: GoogleDriveConfigStore;
  tokens: GoogleTokenStore;
  http: OAuthHttpClient;
  /** Resolución diferida de credenciales: se evalúa en cada operación (§13.4). */
  getEnv: () => GoogleDriveEnv;
  driveClientFor: (accessToken: string) => DriveClient;
  sheetsClientFor: (accessToken: string) => SheetsClient;
  runAuthFlow: (env: GoogleDriveEnv) => Promise<{ tokens: TokenSet; email: string }>;
  credentials?: CredentialsFacade;
  now?: () => number;
  isoNow?: () => string;
}

function defaultCover(featureKey: string): CoverInput {
  return {
    title: `RevOps Assistant — ${featureKey}`,
    schemaVersion: SCHEMA_VERSION,
    whatIsIt: `Archivo de trabajo gestionado por RevOps Assistant para la característica «${featureKey}».`,
    purpose:
      'Sirve como fuente de verdad compartida entre la app y tu equipo para esta característica.',
    howToRead:
      'La portada describe el archivo. Los datos gestionados aparecen tras el separador inferior.',
    userCanModify: 'Puedes añadir comentarios fuera de la zona de datos gestionados.',
    userMustNotModify:
      'No edites la zona de datos gestionados ni la portada: la app las regenera en cada sincronización.',
  };
}

export function createGoogleDriveConnector(deps: GoogleDriveConnectorDeps) {
  const now = deps.now ?? (() => Date.now());
  const isoNow = deps.isoNow ?? (() => new Date().toISOString());

  // SPEC-0004 §25: los refrescos concurrentes del mismo proyecto comparten una única promesa
  // (dos refrescos paralelos podían persistir un token ya invalidado por rotación).
  const refreshInFlight = new Map<string, Promise<string>>();

  function isInvalidGrant(error: unknown): boolean {
    const data = (error as { response?: { data?: { error?: string } } })?.response?.data;
    return data?.error === 'invalid_grant';
  }

  async function getValidAccessToken(projectId: string): Promise<string> {
    const tokens = await deps.tokens.get(projectId);
    if (!tokens) throw new Error('Proyecto sin cuenta de Google conectada');
    if (!shouldRefresh(tokens, now()) || !tokens.refreshToken) return tokens.accessToken;
    const inFlight = refreshInFlight.get(projectId);
    if (inFlight) return inFlight;
    const refreshToken = tokens.refreshToken;
    const promise = (async () => {
      try {
        const env = deps.getEnv();
        const refreshed = await refreshAccessToken(deps.http, {
          clientId: env.clientId,
          clientSecret: env.clientSecret,
          refreshToken,
        });
        await deps.tokens.save(projectId, refreshed);
        return refreshed.accessToken;
      } catch (error) {
        if (isInvalidGrant(error)) {
          // SPEC-0004 §25: refresh token revocado/caducado — la conexión requiere re-autenticar.
          throw new Error(
            'La conexión con Google ha caducado. Vuelve a conectar la cuenta en Conectores → Google Drive.',
          );
        }
        throw error;
      } finally {
        refreshInFlight.delete(projectId);
      }
    })();
    refreshInFlight.set(projectId, promise);
    return promise;
  }

  async function startAuth(
    projectId: string,
    emit: (status: GoogleDriveAuthStatus) => void,
  ): Promise<GoogleDriveOperationResult> {
    const env = deps.getEnv();
    if (!env.clientId) {
      const message = 'Falta el ID de cliente de Google. Configúralo en Conectores → Google Drive.';
      emit({ state: 'error', message });
      return { success: false, error: message };
    }
    emit({ state: 'authorizing' });
    try {
      const { tokens, email } = await deps.runAuthFlow(env);
      await deps.tokens.save(projectId, tokens);
      const existing = deps.configs.get(projectId);
      const config: GoogleDriveConfig = existing
        ? { ...existing, accountEmail: email, connectedAt: existing.connectedAt || isoNow() }
        : {
            accountEmail: email,
            folderId: '',
            folderName: '',
            folderPath: '',
            connectedAt: isoNow(),
            lastSyncAt: '',
            files: [],
          };
      deps.configs.set(projectId, config);
      emit({ state: 'connected', email });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de autenticación';
      emit({ state: 'error', message });
      return { success: false, error: message };
    }
  }

  /**
   * Lista subcarpetas para el selector propio (§14). parentId vacío = «Mi unidad»;
   * `sharedDrives` lista las unidades compartidas (§14.11).
   */
  async function listFolders(projectId: string, parentId: string): Promise<DriveFolder[]> {
    const accessToken = await getValidAccessToken(projectId);
    const client = deps.driveClientFor(accessToken);
    return parentId === 'sharedDrives' ? client.listSharedDrives() : client.listFolders(parentId);
  }

  /** Busca carpetas por nombre en todas las unidades (§14.11). */
  async function searchFolders(projectId: string, query: string): Promise<DriveFolder[]> {
    const accessToken = await getValidAccessToken(projectId);
    return deps.driveClientFor(accessToken).searchFolders(query);
  }

  /** Persiste la carpeta elegida en la config del proyecto. */
  function setFolder(
    projectId: string,
    folder: { folderId: string; folderName: string; folderPath: string },
  ): GoogleDriveFolderResult {
    const existing = deps.configs.get(projectId);
    if (!existing) throw new Error('Proyecto sin cuenta de Google conectada');
    const config: GoogleDriveConfig = {
      ...existing,
      folderId: folder.folderId,
      folderName: folder.folderName,
      folderPath: folder.folderPath || folder.folderName,
    };
    deps.configs.set(projectId, config);
    return {
      folderId: config.folderId,
      folderName: config.folderName,
      folderPath: config.folderPath,
    };
  }

  async function getCredentialsStatus(): Promise<GoogleCredentialsStatus | null> {
    if (!deps.credentials) return null;
    await deps.credentials.ready();
    return deps.credentials.status();
  }

  function setCredentials(
    input: GoogleCredentialsInput,
  ): Promise<{ success: boolean; error?: string }> {
    if (!deps.credentials)
      return Promise.resolve({ success: false, error: 'Credenciales no disponibles' });
    return deps.credentials.set(input);
  }

  function clearCredentials(): Promise<{ success: boolean; error?: string }> {
    if (!deps.credentials)
      return Promise.resolve({ success: false, error: 'Credenciales no disponibles' });
    return deps.credentials.clear();
  }

  function getStatus(projectId: string): GoogleDriveConfig | null {
    return deps.configs.get(projectId);
  }

  async function sync(projectId: string): Promise<GoogleDriveSyncResult> {
    const config = deps.configs.get(projectId);
    if (!config?.folderId) throw new Error('Proyecto sin carpeta de trabajo seleccionada');
    const accessToken = await getValidAccessToken(projectId);
    const client = deps.driveClientFor(accessToken);
    const remote = await client.listManagedFiles(config.folderId);
    const reconciliation = reconcile(config.files ?? [], remote);
    deps.configs.set(projectId, {
      ...config,
      files: reconciliation.files,
      lastSyncAt: isoNow(),
    });
    return { synced: reconciliation.synced, conflicts: reconciliation.conflicts };
  }

  async function revoke(projectId: string): Promise<GoogleDriveOperationResult> {
    const tokens = await deps.tokens.get(projectId);
    const token = tokens?.refreshToken ?? tokens?.accessToken;
    if (token) {
      try {
        await revokeToken(deps.http, token);
      } catch {
        // La revocación remota puede fallar si el token ya expiró; continuamos con la limpieza local.
      }
    }
    await deps.tokens.remove(projectId);
    deps.configs.delete(projectId);
    return { success: true };
  }

  async function writeFile(input: {
    projectId: string;
    featureKey: string;
    content: string;
  }): Promise<GoogleDriveWriteFileResult> {
    try {
      const config = deps.configs.get(input.projectId);
      if (!config?.folderId) throw new Error('Proyecto sin carpeta de trabajo seleccionada');
      const accessToken = await getValidAccessToken(input.projectId);
      const client = deps.driveClientFor(accessToken);
      const cover = buildCover(defaultCover(input.featureKey));
      const files = [...(config.files ?? [])];
      const existing = files.find((file) => file.featureKey === input.featureKey);
      let driveId: string;
      if (existing) {
        await client.replaceDocumentBody({
          driveId: existing.driveId,
          cover,
          content: input.content,
        });
        existing.lastModifiedLocal = isoNow();
        existing.syncStatus = 'pending';
        driveId = existing.driveId;
      } else {
        const subfolderId = await client.ensureFeatureFolder(config.folderId, input.featureKey);
        // SPEC-0004 §21: si la config perdió la referencia, reutiliza un Doc gestionado existente del
        // mismo featureKey en la subcarpeta (en vez de crear otro) y envía a la papelera los duplicados.
        const managed = (await client.listManagedFiles(subfolderId)).filter(
          (file) => file.featureKey === input.featureKey,
        );
        if (managed.length > 0) {
          const [reused, ...duplicates] = managed;
          await client.replaceDocumentBody({
            driveId: reused.driveId,
            cover,
            content: input.content,
          });
          for (const duplicate of duplicates) {
            try {
              await client.deleteFile(duplicate.driveId);
            } catch {
              // best-effort: un duplicado no borrable no debe impedir la escritura.
            }
          }
          driveId = reused.driveId;
          files.push({
            driveId,
            name: input.featureKey,
            mimeType: 'application/vnd.google-apps.document',
            featureKey: input.featureKey,
            lastModifiedDrive: reused.modifiedTime,
            lastModifiedLocal: isoNow(),
            syncStatus: 'pending',
          });
        } else {
          const created = await client.createManagedDocument({
            folderId: subfolderId,
            name: input.featureKey,
            featureKey: input.featureKey,
            schemaVersion: SCHEMA_VERSION,
            cover,
            content: input.content,
          });
          driveId = created.driveId;
          files.push({
            driveId,
            name: input.featureKey,
            mimeType: 'application/vnd.google-apps.document',
            featureKey: input.featureKey,
            lastModifiedDrive: created.modifiedTime,
            lastModifiedLocal: isoNow(),
            syncStatus: 'pending',
          });
        }
      }
      deps.configs.set(input.projectId, { ...config, files });
      return { success: true, driveId };
    } catch (error) {
      // SPEC-0004 §21.3.5: registra el error real (p. ej. de docsBatchUpdate) para diagnosticar la causa
      // del documento de estado vacío. SPEC-0004 §24: solo el mensaje — el GaxiosError completo
      // incluye la cabecera Authorization con el access token.
      console.error(
        `[gdrive] writeFile falló para featureKey="${input.featureKey}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al escribir',
      };
    }
  }

  async function readFile(input: {
    projectId: string;
    featureKey: string;
  }): Promise<GoogleDriveReadFileResult> {
    try {
      const config = deps.configs.get(input.projectId);
      const existing = config?.files?.find((file) => file.featureKey === input.featureKey);
      if (!existing)
        return { success: false, error: 'No existe un archivo para esta característica' };
      const accessToken = await getValidAccessToken(input.projectId);
      const client = deps.driveClientFor(accessToken);
      const content = await client.readManagedContent(existing.driveId);
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error al leer' };
    }
  }

  async function writeSpreadsheet(input: {
    projectId: string;
    name: string;
    featureKey: string;
    schemaVersion: number;
    tabs: SheetTab[];
  }): Promise<{ success: boolean; spreadsheetId?: string; error?: string }> {
    try {
      const config = deps.configs.get(input.projectId);
      if (!config?.folderId) throw new Error('Proyecto sin carpeta de trabajo seleccionada');
      const accessToken = await getValidAccessToken(input.projectId);
      const client = deps.sheetsClientFor(accessToken);
      const { spreadsheetId } = await client.writeSpreadsheet({
        folderId: config.folderId,
        name: input.name,
        featureKey: input.featureKey,
        schemaVersion: input.schemaVersion,
        tabs: input.tabs,
      });
      const files = [...(config.files ?? [])];
      const existing = files.find((file) => file.featureKey === input.featureKey);
      if (existing) {
        existing.lastModifiedLocal = isoNow();
        existing.syncStatus = 'pending';
      } else {
        files.push({
          driveId: spreadsheetId,
          name: input.name,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          featureKey: input.featureKey,
          lastModifiedDrive: '',
          lastModifiedLocal: isoNow(),
          syncStatus: 'pending',
        });
      }
      deps.configs.set(input.projectId, { ...config, files });
      return { success: true, spreadsheetId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al escribir',
      };
    }
  }

  return {
    startAuth,
    listFolders,
    searchFolders,
    setFolder,
    getStatus,
    sync,
    revoke,
    writeFile,
    readFile,
    writeSpreadsheet,
    getCredentialsStatus,
    setCredentials,
    clearCredentials,
  };
}

export type GoogleDriveConnector = ReturnType<typeof createGoogleDriveConnector>;

// ---------------------------------------------------------------------------
// Wiring real (Electron + googleapis + axios + keytar). No se ejercita en tests.
// ---------------------------------------------------------------------------

function createAxiosHttpClient(): OAuthHttpClient {
  return {
    async postForm(url, form) {
      const body = new URLSearchParams(form).toString();
      const res = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.data;
    },
    async getJson(url, headers) {
      const res = await axios.get(url, { headers });
      return res.data;
    },
    async postUrl(url) {
      await axios.post(url);
    },
  };
}

interface GoogleApisModule {
  google: {
    auth: { OAuth2: new () => { setCredentials(creds: { access_token: string }): void } };
    drive: (opts: unknown) => unknown;
    docs: (opts: unknown) => unknown;
    sheets: (opts: unknown) => unknown;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function googleDriveClientFor(accessToken: string): DriveClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida del módulo nativo
  const { google } = require('googleapis') as GoogleApisModule;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth }) as any;
  const docs = google.docs({ version: 'v1', auth }) as any;
  const api: DriveApi = {
    async filesList(args) {
      const res = await drive.files.list(args);
      return res.data;
    },
    async drivesList(args) {
      const res = await drive.drives.list(args);
      return res.data;
    },
    async filesCreate(args) {
      const res = await drive.files.create(args);
      return res.data;
    },
    async filesGet(args) {
      const res = await drive.files.get(args);
      return res.data;
    },
    async filesExport(args) {
      const res = await drive.files.export(args, { responseType: 'text' });
      return typeof res.data === 'string' ? res.data : String(res.data);
    },
    async filesDelete(args) {
      await drive.files.delete(args);
    },
    async docsGet(args) {
      const res = await docs.documents.get(args);
      return res.data;
    },
    async docsBatchUpdate(args) {
      const res = await docs.documents.batchUpdate({
        documentId: args.documentId,
        requestBody: { requests: args.requests },
      });
      return res.data;
    },
  };
  // SPEC-0004 §25: retry con backoff ante 429/5xx en todas las llamadas Drive/Docs.
  return createDriveClient(retried(api));
}

function googleSheetsClientFor(accessToken: string): SheetsClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida del módulo nativo
  const { google } = require('googleapis') as GoogleApisModule;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth }) as any;
  const sheets = google.sheets({ version: 'v4', auth }) as any;
  // SPEC-0004 §25: retry con backoff ante 429/5xx en todas las llamadas Drive/Sheets.
  return createSheetsClient(
    retried({
      async filesList(args) {
        const res = await drive.files.list(args);
        return res.data;
      },
      async filesCreate(args) {
        const res = await drive.files.create(args);
        return res.data;
      },
    }),
    retried({
      async get(args) {
        const res = await sheets.spreadsheets.get({
          spreadsheetId: args.spreadsheetId,
          fields:
            'sheets(properties(sheetId,title,gridProperties),protectedRanges(protectedRangeId),bandedRanges(bandedRangeId))',
        });
        return res.data;
      },
      async batchUpdate(args) {
        const res = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: args.spreadsheetId,
          requestBody: { requests: args.requests },
        });
        return res.data;
      },
      async valuesBatchClear(args) {
        await sheets.spreadsheets.values.batchClear({
          spreadsheetId: args.spreadsheetId,
          requestBody: { ranges: args.ranges },
        });
      },
      async valuesBatchUpdate(args) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: args.spreadsheetId,
          // RAW por defecto (export); USER_ENTERED para el mapa editable (fórmulas, SPEC-0016).
          requestBody: { valueInputOption: args.valueInputOption ?? 'RAW', data: args.data },
        });
      },
    }),
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Tiempo máximo de espera del callback OAuth antes de liberar el puerto (SPEC-0004 §25). */
const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60_000;

/** Flujo OAuth interactivo: abre el navegador del sistema y escucha el callback en loopback. */
function runElectronAuthFlow(http: OAuthHttpClient) {
  return (env: GoogleDriveEnv): Promise<{ tokens: TokenSet; email: string }> =>
    new Promise((resolve, reject) => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const state = randomUUID();
      let redirectUri = '';
      // SPEC-0004 §25: si el usuario no completa el flujo, se cierra el servidor y se rechaza
      // (sin esto el puerto quedaba escuchando y la UI en «authorizing» indefinidamente).
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error('Tiempo de espera agotado en la autenticación con Google'));
      }, OAUTH_CALLBACK_TIMEOUT_MS);
      const server = createServer((req, res) => {
        const params = parseCallbackUrl(`http://127.0.0.1${req.url ?? '/'}`);
        // Ignora peticiones espurias (p. ej. favicon) que no traen ni code ni error.
        if (!params.code && !params.error) {
          res.statusCode = 204;
          res.end();
          return;
        }
        clearTimeout(timeout);
        res.end('Puedes volver a RevOps Assistant. Esta pestaña ya puede cerrarse.');
        server.close();
        if (params.error || !params.code || params.state !== state) {
          reject(new Error(params.error ?? 'Autenticación cancelada'));
          return;
        }
        exchangeCodeForTokens(http, {
          clientId: env.clientId,
          clientSecret: env.clientSecret,
          code: params.code,
          codeVerifier: verifier,
          redirectUri,
        })
          .then(async (tokens) => {
            const email = await fetchUserEmail(http, tokens.accessToken);
            resolve({ tokens, email });
          })
          .catch(reject);
      });
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as { port: number }).port;
        redirectUri = `http://127.0.0.1:${port}`;
        const authUrl = buildAuthUrl({
          clientId: env.clientId,
          redirectUri,
          codeChallenge: challenge,
          state,
        });
        void shell.openExternal(authUrl);
      });
    });
}

export function createElectronGoogleDriveConnector(
  credentials: GoogleCredentialsManager = createElectronGoogleCredentialsManager(),
): GoogleDriveConnector {
  const http = createAxiosHttpClient();
  void credentials.ready();
  return createGoogleDriveConnector({
    configs: new ElectronGoogleDriveConfigStore(),
    tokens: createKeytarGoogleTokenStore(),
    http,
    getEnv: () => credentials.resolve(),
    driveClientFor: googleDriveClientFor,
    sheetsClientFor: googleSheetsClientFor,
    runAuthFlow: runElectronAuthFlow(http),
    credentials,
  });
}

export { createGoogleTokenStore };
