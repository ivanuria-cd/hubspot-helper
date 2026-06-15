import { createHash, randomBytes } from 'node:crypto';

export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
export const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

/** Margen previo a la expiración para renovar el access token de forma proactiva. */
export const REFRESH_SKEW_MS = 60_000;

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

interface RawTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

/** Cliente HTTP mínimo inyectable: evita acoplar la lógica OAuth a axios/fetch en tests. */
export interface OAuthHttpClient {
  postForm(url: string, form: Record<string, string>): Promise<unknown>;
  getJson(url: string, headers: Record<string, string>): Promise<unknown>;
  postUrl(url: string): Promise<void>;
}

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(random: (size: number) => Buffer = randomBytes): string {
  return base64url(random(32));
}

export function generateCodeChallenge(verifier: string): string {
  return base64url(createHash('sha256').update(verifier).digest());
}

export interface AuthUrlParams {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes?: string[];
}

export function buildAuthUrl(params: AuthUrlParams): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', (params.scopes ?? GOOGLE_SCOPES).join(' '));
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
}

export function parseCallbackUrl(rawUrl: string): CallbackParams {
  const url = new URL(rawUrl);
  return {
    code: url.searchParams.get('code') ?? undefined,
    state: url.searchParams.get('state') ?? undefined,
    error: url.searchParams.get('error') ?? undefined,
  };
}

export function parseTokenResponse(
  raw: unknown,
  now: number,
  previousRefreshToken?: string,
): TokenSet {
  const data = raw as RawTokenResponse;
  if (!data || typeof data.access_token !== 'string') {
    throw new Error('Respuesta de token inválida de Google');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? previousRefreshToken,
    expiresAt: now + (data.expires_in ?? 0) * 1000,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

export interface ExchangeParams {
  clientId: string;
  clientSecret?: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export async function exchangeCodeForTokens(
  http: OAuthHttpClient,
  params: ExchangeParams,
  now: number = Date.now(),
): Promise<TokenSet> {
  const form: Record<string, string> = {
    client_id: params.clientId,
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  };
  if (params.clientSecret) form.client_secret = params.clientSecret;
  return parseTokenResponse(await http.postForm(TOKEN_ENDPOINT, form), now);
}

export interface RefreshParams {
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
}

export async function refreshAccessToken(
  http: OAuthHttpClient,
  params: RefreshParams,
  now: number = Date.now(),
): Promise<TokenSet> {
  const form: Record<string, string> = {
    client_id: params.clientId,
    refresh_token: params.refreshToken,
    grant_type: 'refresh_token',
  };
  if (params.clientSecret) form.client_secret = params.clientSecret;
  return parseTokenResponse(await http.postForm(TOKEN_ENDPOINT, form), now, params.refreshToken);
}

export function shouldRefresh(
  tokens: TokenSet,
  now: number = Date.now(),
  skewMs: number = REFRESH_SKEW_MS,
): boolean {
  return now >= tokens.expiresAt - skewMs;
}

export async function fetchUserEmail(http: OAuthHttpClient, accessToken: string): Promise<string> {
  const info = (await http.getJson(USERINFO_ENDPOINT, {
    Authorization: `Bearer ${accessToken}`,
  })) as { email?: string };
  if (!info?.email) throw new Error('No se pudo obtener el email de la cuenta Google');
  return info.email;
}

export function revokeToken(http: OAuthHttpClient, token: string): Promise<void> {
  const url = new URL(REVOKE_ENDPOINT);
  url.searchParams.set('token', token);
  return http.postUrl(url.toString());
}
