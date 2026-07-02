import Store from 'electron-store';
import type Bottleneck from 'bottleneck';
import type {
  HubSpotConfig,
  HubSpotEnvironmentInput,
  HubSpotOperationResult,
  HubSpotRequest,
  HubSpotResponse,
  HubSpotSaveTokenInput,
  HubSpotSaveTokenResult,
} from '@shared/types/hubspot';
import { createHubSpotClient } from './client';
import { createRateLimiter } from './rate-limiter';
import { createKeytarTokenStore, hashToken, type TokenStore } from './token-store';
import { verifyToken, type VerifyResult } from './verify';

const DEFAULT_API_VERSION = 'v3';

export interface HubSpotConfigStore {
  get(projectId: string): HubSpotConfig | null;
  set(projectId: string, config: HubSpotConfig): void;
  delete(projectId: string): void;
}

interface HubSpotConfigSchema {
  configs: Record<string, HubSpotConfig>;
}

class ElectronHubSpotConfigStore implements HubSpotConfigStore {
  private readonly store = new Store<HubSpotConfigSchema>({
    name: 'hubspot',
    defaults: { configs: {} },
  });

  get(projectId: string): HubSpotConfig | null {
    return this.store.get('configs', {})[projectId] ?? null;
  }

  set(projectId: string, config: HubSpotConfig): void {
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

export interface HubSpotConnectorDeps {
  tokens: TokenStore;
  configs: HubSpotConfigStore;
  verify?: (token: string) => Promise<VerifyResult>;
  limiter?: Bottleneck;
  now?: () => string;
}

export function createHubSpotConnector(deps: HubSpotConnectorDeps) {
  const verify = deps.verify ?? ((token: string) => verifyToken(token));
  const limiter = deps.limiter ?? createRateLimiter();
  const now = deps.now ?? (() => new Date().toISOString());

  async function saveToken(input: HubSpotSaveTokenInput): Promise<HubSpotSaveTokenResult> {
    try {
      const info = await verify(input.token);
      await deps.tokens.save(input.projectId, input.environment, input.token);
      const existing = deps.configs.get(input.projectId);
      const config: HubSpotConfig = existing ?? {
        activeEnvironment: input.environment,
        apiVersion: DEFAULT_API_VERSION,
        environments: {},
      };
      config.environments[input.environment] = {
        portalId: info.portalId,
        portalName: info.portalName,
        tokenHash: hashToken(input.token),
        connectedAt: config.environments[input.environment]?.connectedAt ?? now(),
        lastVerifiedAt: now(),
      };
      deps.configs.set(input.projectId, config);
      return {
        success: true,
        portalId: info.portalId,
        portalName: info.portalName
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  function getStatus(projectId: string): HubSpotConfig | null {
    return deps.configs.get(projectId);
  }

  async function revokeToken(input: HubSpotEnvironmentInput): Promise<HubSpotOperationResult> {
    await deps.tokens.remove(input.projectId, input.environment);
    const config = deps.configs.get(input.projectId);
    if (config) {
      delete config.environments[input.environment];
      deps.configs.set(input.projectId, config);
    }
    return { success: true };
  }

  function setEnvironment(input: HubSpotEnvironmentInput): HubSpotOperationResult {
    const config = deps.configs.get(input.projectId);
    if (!config) return { success: false, error: 'Proyecto sin configuración de HubSpot' };
    config.activeEnvironment = input.environment;
    deps.configs.set(input.projectId, config);
    return { success: true };
  }

  async function request(req: HubSpotRequest): Promise<HubSpotResponse> {
    const config = deps.configs.get(req.projectId);
    if (!config) throw new Error('Proyecto sin configuración de HubSpot');
    const environment = req.environment ?? config.activeEnvironment;
    const token = await deps.tokens.get(req.projectId, environment);
    if (!token) throw new Error(`Sin token para el entorno ${environment}`);
    // SPEC-0003 §18: cada reintento descuenta reservoir del limiter (cuenta contra la cuota).
    const client = createHubSpotClient({
      token,
      onRetry: async () => {
        await limiter.incrementReservoir(-1);
      },
    });
    const response = await limiter.schedule(() =>
      client.request({ method: req.method, url: req.path, params: req.params, data: req.body }),
    );
    return { status: response.status, data: response.data };
  }

  return { saveToken, getStatus, revokeToken, setEnvironment, request };
}

export type HubSpotConnector = ReturnType<typeof createHubSpotConnector>;

export function createElectronHubSpotConnector(): HubSpotConnector {
  return createHubSpotConnector({
    tokens: createKeytarTokenStore(),
    configs: new ElectronHubSpotConfigStore(),
  });
}
