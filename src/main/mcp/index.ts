import Store from 'electron-store';
import { mcpRegistry } from './registry';
import { createAuth, type TokenStorage } from './auth';
import { createMcpService, type McpConfigStore, type McpService } from './server';
import { DEFAULT_MCP_PORT } from './types';

interface McpSettingsSchema {
  enabled: boolean;
  port: number;
  token: string | null;
}

class ElectronMcpStore implements McpConfigStore, TokenStorage {
  private readonly store = new Store<McpSettingsSchema>({
    name: 'mcp',
    defaults: { enabled: false, port: DEFAULT_MCP_PORT, token: null },
  });

  isEnabled(): boolean {
    return this.store.get('enabled', false);
  }

  setEnabled(enabled: boolean): void {
    this.store.set('enabled', enabled);
  }

  getPort(): number {
    return this.store.get('port', DEFAULT_MCP_PORT);
  }

  setPort(port: number): void {
    this.store.set('port', port);
  }

  getToken(): string | null {
    return this.store.get('token', null);
  }

  setToken(token: string): void {
    this.store.set('token', token);
  }
}

export interface ElectronMcpDeps {
  version: string;
  getActiveProjectId: () => string;
}

export function createElectronMcpService(deps: ElectronMcpDeps): McpService {
  const store = new ElectronMcpStore();
  const service = createMcpService({
    registry: mcpRegistry,
    auth: createAuth(store),
    config: store,
    contextProvider: () => ({ projectId: deps.getActiveProjectId() }),
    serverInfo: { name: 'revops', version: deps.version },
    log: (message) => console.info(`[mcp] ${message}`),
  });

  registerCoreTools();

  return service;
}

/**
 * Tool de diagnóstico de la propia capa MCP (no es una tool de negocio).
 * Permite a un cliente comprobar la conexión y el proyecto activo.
 */
function registerCoreTools(): void {
  if (mcpRegistry.has('mcp_health')) return;
  mcpRegistry.register({
    name: 'mcp_health',
    description: 'Comprueba que el servidor MCP responde y devuelve el proyecto activo.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: 'mcp-core',
    handler: (_input, context) =>
      Promise.resolve({ ok: true, projectId: context.projectId, ts: new Date().toISOString() }),
  });
}

export { mcpRegistry } from './registry';
export type { McpService } from './server';
