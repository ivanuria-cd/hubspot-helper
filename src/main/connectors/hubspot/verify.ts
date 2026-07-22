import { createHubSpotClient } from './client';

/** Respuesta de `GET https://api.hubapi.com/account-info/2026-03/details` (campos usados). */
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
    portalName: info.portalName,
  };
}

export interface VerifyDeps {
  fetchInfo?: (token: string) => Promise<AccessTokenInfo>;
}

export async function verifyToken(token: string, deps: VerifyDeps = {}): Promise<VerifyResult> {
  const fetchInfo =
    deps.fetchInfo ??
    // SPEC-0003 §21: usa el cliente compartido (interceptor `redactToken` + retry) para no filtrar el PAT.
    (async (value: string) => {
      const client = createHubSpotClient({ token: value });
      const res = await client.get<AccessTokenInfo>('/account-info/2026-03/details');
      return res.data;
    });
  return parseAccessTokenInfo(await fetchInfo(token));
}
