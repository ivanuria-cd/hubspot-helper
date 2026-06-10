import { describe, it, expect, vi } from 'vitest';
import {
  AUTH_ENDPOINT,
  buildAuthUrl,
  exchangeCodeForTokens,
  generateCodeChallenge,
  generateCodeVerifier,
  parseCallbackUrl,
  parseTokenResponse,
  refreshAccessToken,
  shouldRefresh,
  type OAuthHttpClient,
} from './auth';

describe('PKCE', () => {
  it('genera un verifier base64url (sin relleno) reversible al random inyectado', () => {
    const bytes = Buffer.from('0123456789abcdef0123456789abcdef');
    const verifier = generateCodeVerifier(() => bytes);
    expect(verifier).not.toMatch(/[+/=]/);
    const decoded = Buffer.from(verifier.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    expect(decoded.equals(bytes)).toBe(true);
  });

  it('deriva el challenge S256 según el vector de la RFC 7636', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(generateCodeChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});

describe('URLs OAuth', () => {
  it('construye la URL de autorización con PKCE y offline access', () => {
    const url = new URL(
      buildAuthUrl({
        clientId: 'cid',
        redirectUri: 'http://127.0.0.1:5000',
        codeChallenge: 'chal',
        state: 'st',
      }),
    );
    expect(`${url.origin}${url.pathname}`).toBe(AUTH_ENDPOINT);
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('code_challenge')).toBe('chal');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('scope')).toContain('drive.file');
  });

  it('parsea code, state y error del callback', () => {
    expect(parseCallbackUrl('http://127.0.0.1:5000/?code=abc&state=xyz')).toEqual({
      code: 'abc',
      state: 'xyz',
      error: undefined,
    });
    expect(parseCallbackUrl('http://127.0.0.1:5000/?error=access_denied').error).toBe(
      'access_denied',
    );
  });
});

describe('tokens', () => {
  it('parsea la respuesta y calcula expiresAt', () => {
    const tokens = parseTokenResponse(
      { access_token: 'a', expires_in: 3600, refresh_token: 'r' },
      1_000,
    );
    expect(tokens.accessToken).toBe('a');
    expect(tokens.refreshToken).toBe('r');
    expect(tokens.expiresAt).toBe(1_000 + 3600 * 1000);
  });

  it('conserva el refresh token previo cuando la respuesta no trae uno', () => {
    const tokens = parseTokenResponse({ access_token: 'a2', expires_in: 60 }, 0, 'r-previo');
    expect(tokens.refreshToken).toBe('r-previo');
  });

  it('lanza si la respuesta no tiene access_token', () => {
    expect(() => parseTokenResponse({}, 0)).toThrow();
  });

  it('shouldRefresh respeta el margen', () => {
    expect(shouldRefresh({ accessToken: 'a', expiresAt: 100_000 }, 0)).toBe(false);
    expect(shouldRefresh({ accessToken: 'a', expiresAt: 100_000 }, 90_000)).toBe(true);
  });

  it('intercambia el code enviando el code_verifier', async () => {
    const postForm = vi.fn().mockResolvedValue({ access_token: 'a', expires_in: 10 });
    const http: OAuthHttpClient = { postForm, getJson: vi.fn(), postUrl: vi.fn() };
    await exchangeCodeForTokens(
      http,
      { clientId: 'cid', code: 'c', codeVerifier: 'v', redirectUri: 'http://127.0.0.1:1' },
      0,
    );
    expect(postForm).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ code: 'c', code_verifier: 'v', grant_type: 'authorization_code' }),
    );
  });

  it('refresca con grant_type refresh_token', async () => {
    const postForm = vi.fn().mockResolvedValue({ access_token: 'nuevo', expires_in: 10 });
    const http: OAuthHttpClient = { postForm, getJson: vi.fn(), postUrl: vi.fn() };
    const tokens = await refreshAccessToken(http, { clientId: 'cid', refreshToken: 'r' }, 0);
    expect(tokens.accessToken).toBe('nuevo');
    expect(tokens.refreshToken).toBe('r');
    expect(postForm).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ grant_type: 'refresh_token', refresh_token: 'r' }),
    );
  });
});
