/**
 * Contrato del conector HubSpot (SPEC-0003), compartido entre main, preload y renderer.
 * Las credenciales (token) nunca forman parte de la config persistida: solo su hash.
 */

export type HubSpotEnvironment = 'production' | 'sandbox';

export interface HubSpotEnvConfig {
  portalId: string;
  portalName: string;
  tokenHash: string;
  connectedAt: string;
  lastVerifiedAt: string;
}

export interface HubSpotConfig {
  activeEnvironment: HubSpotEnvironment;
  apiVersion: string;
  environments: Partial<Record<HubSpotEnvironment, HubSpotEnvConfig>>;
}

export interface HubSpotRequest {
  projectId: string;
  environment?: HubSpotEnvironment;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
}

export interface HubSpotResponse<T = unknown> {
  status: number;
  data: T;
}

export interface HubSpotSaveTokenInput {
  projectId: string;
  environment: HubSpotEnvironment;
  token: string;
}

export interface HubSpotSaveTokenResult {
  success: boolean;
  portalId?: string;
  portalName?: string;
  error?: string;
}

export interface HubSpotEnvironmentInput {
  projectId: string;
  environment: HubSpotEnvironment;
}

export interface HubSpotOperationResult {
  success: boolean;
  error?: string;
}
