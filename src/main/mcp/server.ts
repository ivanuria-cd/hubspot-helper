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
import type { GuidanceBlocked } from './types';
import { toSummary } from './types';
import { startHttpSse, type HttpSseHandle } from './transport/http-sse';
import { connectStdio } from './transport/stdio';
import { validateToolInput } from './validate-input';

/** Nombre de la tool de guía que levanta el acuse de sesión (SPEC-0005 §15.3). */
export const GUIDANCE_TOOL = 'revops_guidance';

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
  /** Despacha una tool aplicando el gate de guía por sesión (SPEC-0005 §15.5). Expuesto para tests. */
  callTool(name: string, args: unknown, sessionId: string): Promise<unknown>;
  /** Purga el acuse de guía de una sesión (al cerrarse). Expuesto para tests. */
  purgeSession(sessionId: string): void;
}

export function createMcpService(deps: McpServiceDeps): McpService {
  const log = deps.log ?? (() => undefined);
  let httpHandle: HttpSseHandle | null = null;
  const guidanceAck = new Set<string>();

  function blocked(): GuidanceBlocked {
    return {
      blocked: true,
      reason: 'guidance-required',
      message:
        'Operación bloqueada. Llama a revops_guidance para leer las reglas de operación antes de continuar. ' +
        'El acuse es por sesión MCP (no hay umbral por número de escrituras): una vez leída la guía, esta sesión ' +
        'queda desbloqueada hasta que se cierre o se reinicie el servidor; al reconectar hay que leerla de nuevo.',
      next: GUIDANCE_TOOL,
    };
  }

  async function callTool(name: string, args: unknown, sessionId: string): Promise<unknown> {
    const tool = deps.registry.get(name);
    if (!tool) throw new Error(`Tool MCP desconocida: ${name}`);
    if (tool.requiresGuidance && !guidanceAck.has(sessionId)) return blocked();
    // SPEC-0005 §18: validación runtime del input contra el inputSchema declarado.
    const validation = validateToolInput(tool.inputSchema, args);
    if (!validation.ok) {
      return { error: { code: 'invalid-input', tool: name, issues: validation.issues } };
    }
    log(`tool MCP llamada: ${tool.name}`);
    const result = await tool.handler(args ?? {}, { ...deps.contextProvider(), sessionId });
    if (name === GUIDANCE_TOOL) guidanceAck.add(sessionId);
    return result;
  }

  function purgeSession(sessionId: string): void {
    guidanceAck.delete(sessionId);
  }

  function buildServer(): Server {
    const server = new Server(deps.serverInfo, { capabilities: { tools: {} } });
    let sessionId = 'stdio';

    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: deps.registry.getAll().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      sessionId = extra?.sessionId ?? sessionId;
      const result = await callTool(request.params.name, request.params.arguments ?? {}, sessionId);
      const text = typeof result === 'string' ? result : JSON.stringify(result);
      return { content: [{ type: 'text', text }] };
    });

    server.onclose = () => purgeSession(sessionId);

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
    callTool,
    purgeSession,
  };
}
