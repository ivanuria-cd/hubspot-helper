import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { McpRegistry } from './registry';
import type { McpAuth } from './auth';
import type {
  McpContext,
  McpOperationResult,
  McpStatus,
  McpTokenResult,
  McpToolSummary,
} from './types';
import { toSummary } from './types';
import { startHttpSse, type HttpSseHandle } from './transport/http-sse';
import { connectStdio } from './transport/stdio';

/** Persistencia de la configuración del servidor MCP (habilitado, puerto). */
export interface McpConfigStore {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  getPort(): number;
  setPort(port: number): void;
}

export interface McpServiceDeps {
  registry: McpRegistry;
  auth: McpAuth;
  config: McpConfigStore;
  /** Devuelve el contexto (proyecto activo) para cada sesión MCP. */
  contextProvider: () => McpContext;
  serverInfo: { name: string; version: string };
  log?: (message: string) => void;
}

export interface McpService {
  /** Arranca el servidor solo si la configuración persistida lo marca habilitado. */
  autostart(): Promise<void>;
  start(): Promise<McpStatus>;
  stop(): Promise<McpStatus>;
  toggle(enabled: boolean): Promise<McpOperationResult>;
  status(): McpStatus;
  listTools(): McpToolSummary[];
  regenerateToken(): McpTokenResult;
  getToken(): string;
  /** Conecta el transporte stdio (uso CLI / cliente que lanza la app). */
  startStdio(): Promise<void>;
  /** Expuesto para tests: crea un servidor MCP cableado al registry. */
  buildServer(): Server;
}

export function createMcpService(deps: McpServiceDeps): McpService {
  const log = deps.log ?? (() => undefined);
  let httpHandle: HttpSseHandle | null = null;

  function buildServer(): Server {
    const server = new Server(deps.serverInfo, { capabilities: { tools: {} } });

    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: deps.registry.getAll().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = deps.registry.get(request.params.name);
      if (!tool) {
        throw new Error(`Tool MCP desconocida: ${request.params.name}`);
      }
      // Log a nivel info de qué tool se llamó, sin registrar los datos de respuesta.
      log(`tool MCP llamada: ${tool.name}`);
      const result = await tool.handler(request.params.arguments ?? {}, deps.contextProvider());
      const text = typeof result === 'string' ? result : JSON.stringify(result);
      return { content: [{ type: 'text', text }] };
    });

    return server;
  }

  function status(): McpStatus {
    return {
      running: httpHandle !== null,
      port: deps.config.getPort(),
      toolCount: deps.registry.size,
    };
  }

  async function autostart(): Promise<void> {
    if (deps.config.isEnabled()) await start();
  }

  async function start(): Promise<McpStatus> {
    if (httpHandle) return status();
    deps.auth.ensureToken();
    httpHandle = await startHttpSse({
      port: deps.config.getPort(),
      serverFactory: buildServer,
      validateToken: (token) => deps.auth.validate(token),
      log,
    });
    return status();
  }

  async function stop(): Promise<McpStatus> {
    if (httpHandle) {
      await httpHandle.close();
      httpHandle = null;
    }
    return status();
  }

  async function toggle(enabled: boolean): Promise<McpOperationResult> {
    try {
      if (enabled) await start();
      else await stop();
      deps.config.setEnabled(enabled);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  function listTools(): McpToolSummary[] {
    return deps.registry.getAll().map(toSummary);
  }

  function regenerateToken(): McpTokenResult {
    return { token: deps.auth.regenerate() };
  }

  function getToken(): string {
    return deps.auth.ensureToken();
  }

  async function startStdio(): Promise<void> {
    await connectStdio(buildServer());
  }

  return {
    autostart,
    start,
    stop,
    toggle,
    status,
    listTools,
    regenerateToken,
    getToken,
    startStdio,
    buildServer,
  };
}
