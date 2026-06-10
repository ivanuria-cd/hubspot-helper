import axios from 'axios';
import { HUBSPOT_BASE_URL } from './client';

/** Respuesta de `GET /oauth/v1/access-tokens/{token}` (campos usados). */
export interface AccessTokenInfo {
  hub_id: number;
  hub_domain: string;
  scopes?: string[];
  user?: string;
  user_id?: number;
}

export interface VerifyResult {
  portalId: string;
  portalName: string;
  scopes: string[];
  user?: string;
}

export function parseAccessTokenInfo(info: AccessTokenInfo): VerifyResult {
  return {
    portalId: String(info.hub_id),
    portalName: info.hub_domain,
    scopes: info.scopes ?? [],
    user: info.user,
  };
}

export interface VerifyDeps {
  fetchInfo?: (token: string) => Promise<AccessTokenInfo>;
}

export async function verifyToken(token: string, deps: VerifyDeps = {}): Promise<VerifyResult> {
  const fetchInfo =
    deps.fetchInfo ??
    (async (value: string) => {
      const res = await axios.get<AccessTokenInfo>(
        `${HUBSPOT_BASE_URL}/oauth/v1/access-tokens/${encodeURIComponent(value)}`,
        { timeout: 30_000 },
      );
      return res.data;
    });
  return parseAccessTokenInfo(await fetchInfo(token));
}
