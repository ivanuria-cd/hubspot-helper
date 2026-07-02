import Store from 'electron-store';
import { mcpRegistry } from './registry';
import { guidanceRegistry } from './guidance';
import { createAuth, type TokenStorage } from './auth';
import { createMcpService, GUIDANCE_TOOL, type McpConfigStore, type McpService } from './server';
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

  mcpRegistry.register({
    name: GUIDANCE_TOOL,
    description:
      'LÉEME PRIMERO. Devuelve las reglas de operación del MCP revops. ' +
      'Las tools de escritura/sincronización están bloqueadas hasta llamar a esta tool en la sesión.',
    inputSchema: { type: 'object', properties: { section: { type: 'string' } } },
    featureKey: 'mcp-core',
    handler: (input) => {
      const { section } = (input ?? {}) as { section?: string };
      const content = guidanceRegistry.assemble(section ? { featureKey: section } : undefined);
      return Promise.resolve({
        content,
        sections: guidanceRegistry.getAll().map((s) => s.featureKey),
        acknowledged: true,
      });
    },
  });
}

export { mcpRegistry } from './registry';
export { guidanceRegistry } from './guidance';
export type { McpService } from './server';
