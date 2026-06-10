import axios from 'axios';
import { HUBSPOT_BASE_URL } from './client';

/** Respuesta de `GET https://api.hubapi.com/account-info/v3/details` (campos usados). */
export interface AccessTokenInfo {
  portalId: number;
  portalName: string;
}

export interface VerifyResult {
  portalId: string;
  portalName: string;
}

export function parseAccessTokenInfo(info: AccessTokenInfo): VerifyResult {
  return {
    portalId: String(info.portalId),
    portalName: info.portalName
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
        `${HUBSPOT_BASE_URL}/account-info/2026-03/details`,        
        { headers: { "Authorization": `Bearer ${value}` },
          timeout: 30_000 }
      );
      return res.data;
    });
  return parseAccessTokenInfo(await fetchInfo(token));
}
