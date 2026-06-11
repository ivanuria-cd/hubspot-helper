import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { BrowserWindow, shell } from 'electron';
import axios from 'axios';
import Store from 'electron-store';
import type {
  DriveFile,
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
import { createDriveClient, type DriveApi, type DriveClient } from './client';
import {
  createSheetsClient,
  type SheetsClient,
  type SheetTab,
} from './sheets-client';
import { buildCover, type CoverInput } from './cover-template';
import { reconcile } from './sync';
import { buildPickerHtml, parsePickerTitle, type PickerSelection } from './picker';
import { createGoogleTokenStore, createKeytarGoogleTokenStore, type GoogleTokenStore } from './token-store';

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
  private readonly store = new Store<GoogleDriveConfigSchema>({
    name: 'gdrive',
    defaults: { configs: {} },
  });

  get(projectId: string): GoogleDriveConfig | null {
    return this.store.get('configs', {})[projectId] ?? null;
  }

  set(projectId: string, config: GoogleDriveConfig): void {
    const all = this.store.get('configs', {});
    all[projectId] = config;
    this.store.set('configs', all);
  }

  delete(projectId: string): void {
    const all = this.store.get('configs', {});
    delete all[projectId];
    this.store.set('configs', all);
  }
}

export interface GoogleDriveEnv {
  clientId: string;
  clientSecret?: string;
  apiKey: string;
}

export interface GoogleDriveConnectorDeps {
  configs: GoogleDriveConfigStore;
  tokens: GoogleTokenStore;
  http: OAuthHttpClient;
  env: GoogleDriveEnv;
  driveClientFor: (accessToken: string) => DriveClient;
  sheetsClientFor: (accessToken: string) => SheetsClient;
  runAuthFlow: (env: GoogleDriveEnv) => Promise<{ tokens: TokenSet; email: string }>;
  openPicker: (accessToken: string) => Promise<PickerSelection | null>;
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

  async function getValidAccessToken(projectId: string): Promise<string> {
    const tokens = await deps.tokens.get(projectId);
    if (!tokens) throw new Error('Proyecto sin cuenta de Google conectada');
    if (!shouldRefresh(tokens, now()) || !tokens.refreshToken) return tokens.accessToken;
    const refreshed = await refreshAccessToken(deps.http, {
      clientId: deps.env.clientId,
      clientSecret: deps.env.clientSecret,
      refreshToken: tokens.refreshToken,
    });
    await deps.tokens.save(projectId, refreshed);
    return refreshed.accessToken;
  }

  async function startAuth(
    projectId: string,
    emit: (status: GoogleDriveAuthStatus) => void,
  ): Promise<GoogleDriveOperationResult> {
    if (!deps.env.clientId) {
      const message = 'Falta GOOGLE_CLIENT_ID en .env (ver .env.example)';
      emit({ state: 'error', message });
      return { success: false, error: message };
    }
    emit({ state: 'authorizing' });
    try {
      const { tokens, email } = await deps.runAuthFlow(deps.env);
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

  async function selectFolder(projectId: string): Promise<GoogleDriveFolderResult | null> {
    if (!deps.env.apiKey) {
      throw new Error('Falta GOOGLE_API_KEY en .env para el selector de carpeta (ver .env.example)');
    }
    const accessToken = await getValidAccessToken(projectId);
    const selection = await deps.openPicker(accessToken);
    if (!selection || !selection.folderId) return null;
    const existing = deps.configs.get(projectId);
    if (!existing) throw new Error('Proyecto sin cuenta de Google conectada');
    const config: GoogleDriveConfig = {
      ...existing,
      folderId: selection.folderId,
      folderName: selection.folderName,
      folderPath: selection.folderName,
    };
    deps.configs.set(projectId, config);
    return {
      folderId: config.folderId,
      folderName: config.folderName,
      folderPath: config.folderPath,
    };
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
        await client.replaceDocumentBody({ driveId: existing.driveId, cover, content: input.content });
        existing.lastModifiedLocal = isoNow();
        existing.syncStatus = 'pending';
        driveId = existing.driveId;
      } else {
        const subfolderId = await client.ensureFeatureFolder(config.folderId, input.featureKey);
        const created = await client.createManagedDocument({
          folderId: subfolderId,
          name: input.featureKey,
          featureKey: input.featureKey,
          schemaVersion: SCHEMA_VERSION,
          cover,
          content: input.content,
        });
        driveId = created.driveId;
        const file: DriveFile = {
          driveId,
          name: input.featureKey,
          mimeType: 'application/vnd.google-apps.document',
          featureKey: input.featureKey,
          lastModifiedDrive: created.modifiedTime,
          lastModifiedLocal: isoNow(),
          syncStatus: 'pending',
        };
        files.push(file);
      }
      deps.configs.set(input.projectId, { ...config, files });
      return { success: true, driveId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error al escribir' };
    }
  }

  async function readFile(input: {
    projectId: string;
    featureKey: string;
  }): Promise<GoogleDriveReadFileResult> {
    try {
      const config = deps.configs.get(input.projectId);
      const existing = config?.files?.find((file) => file.featureKey === input.featureKey);
      if (!existing) return { success: false, error: 'No existe un archivo para esta característica' };
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
      return { success: false, error: error instanceof Error ? error.message : 'Error al escribir' };
    }
  }

  return { startAuth, selectFolder, getStatus, sync, revoke, writeFile, readFile, writeSpreadsheet };
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
  return createDriveClient(api);
}

function googleSheetsClientFor(accessToken: string): SheetsClient {
  const { google } = require('googleapis') as GoogleApisModule;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth }) as any;
  const sheets = google.sheets({ version: 'v4', auth }) as any;
  return createSheetsClient(
    {
      async filesList(args) {
        const res = await drive.files.list(args);
        return res.data;
      },
      async filesCreate(args) {
        const res = await drive.files.create(args);
        return res.data;
      },
    },
    {
      async get(args) {
        const res = await sheets.spreadsheets.get({ spreadsheetId: args.spreadsheetId });
        return res.data;
      },
      async batchUpdate(args) {
        const res = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: args.spreadsheetId,
          requestBody: { requests: args.requests },
        });
        return res.data;
      },
      async valuesUpdate(args) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: args.spreadsheetId,
          range: args.range,
          valueInputOption: 'RAW',
          requestBody: { values: args.values },
        });
      },
      async valuesClear(args) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: args.spreadsheetId,
          range: args.range,
        });
      },
    },
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function readEnv(): GoogleDriveEnv {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    apiKey: process.env.GOOGLE_API_KEY ?? '',
  };
}

/** Flujo OAuth interactivo: abre el navegador del sistema y escucha el callback en loopback. */
function runElectronAuthFlow(http: OAuthHttpClient) {
  return (env: GoogleDriveEnv): Promise<{ tokens: TokenSet; email: string }> =>
    new Promise((resolve, reject) => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const state = randomUUID();
      let redirectUri = '';
      const server = createServer((req, res) => {
        const params = parseCallbackUrl(`http://127.0.0.1${req.url ?? '/'}`);
        // Ignora peticiones espurias (p. ej. favicon) que no traen ni code ni error.
        if (!params.code && !params.error) {
          res.statusCode = 204;
          res.end();
          return;
        }
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

/** Abre el Google Picker en una BrowserWindow y resuelve con la carpeta elegida. */
function openElectronPicker(env: GoogleDriveEnv) {
  return (accessToken: string): Promise<PickerSelection | null> =>
    new Promise((resolve, reject) => {
      const html = buildPickerHtml({ accessToken, apiKey: env.apiKey, appId: env.clientId.split('-')[0] });
      const server = createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as { port: number }).port;
        const window = new BrowserWindow({
          width: 720,
          height: 600,
          title: 'Selecciona la carpeta de trabajo',
          // Partición propia: la UI de Google necesita cargar apis.google.com, que la CSP de la
          // sesión por defecto (solo en build empaquetada) bloquearía.
          webPreferences: { nodeIntegration: false, contextIsolation: true, partition: 'gdrive-picker' },
        });
        let settled = false;
        const finish = (selection: PickerSelection | null): void => {
          if (settled) return;
          settled = true;
          server.close();
          if (!window.isDestroyed()) window.close();
          resolve(selection);
        };
        window.on('page-title-updated', (_event, title) => {
          const selection = parsePickerTitle(title);
          if (selection) finish(selection.folderId ? selection : null);
        });
        window.on('closed', () => finish(null));
        void window.loadURL(`http://127.0.0.1:${port}`).catch(reject);
      });
    });
}

export function createElectronGoogleDriveConnector(): GoogleDriveConnector {
  const http = createAxiosHttpClient();
  const env = readEnv();
  return createGoogleDriveConnector({
    configs: new ElectronGoogleDriveConfigStore(),
    tokens: createKeytarGoogleTokenStore(),
    http,
    env,
    driveClientFor: googleDriveClientFor,
    sheetsClientFor: googleSheetsClientFor,
    runAuthFlow: runElectronAuthFlow(http),
    openPicker: openElectronPicker(env),
  });
}

export { createGoogleTokenStore };
