import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
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
  // SPEC-0005 §15 / SPEC-0006 §54.4: el acuse de guía es por PROYECTO y vive mientras el proceso esté
  // activo. Sobrevive a reconexiones de la sesión MCP; solo se rearma al reiniciar la app o cambiar de
  // proyecto (el projectId lo aporta contextProvider). Claves = projectId.
  const guidanceAck = new Set<string>();

  function blocked(): GuidanceBlocked {
    return {
      blocked: true,
      reason: 'guidance-required',
      message:
        'Operación bloqueada. Llama a revops_guidance para leer las reglas de operación antes de continuar. ' +
        'El acuse es por PROYECTO y vive mientras la app esté abierta: una vez leída la guía para este proyecto, ' +
        'queda desbloqueado aunque la sesión MCP se reconecte; solo se rearma si se reinicia la app o se cambia de ' +
        'proyecto activo. Si te aparece a mitad de un flujo, es por un reinicio de la app o un cambio de proyecto.',
      next: GUIDANCE_TOOL,
    };
  }

  async function callTool(name: string, args: unknown, sessionId: string): Promise<unknown> {
    const tool = deps.registry.get(name);
    if (!tool) throw new Error(`Tool MCP desconocida: ${name}`);
    const context = { ...deps.contextProvider(), sessionId };
    if (tool.requiresGuidance && !guidanceAck.has(context.projectId)) return blocked();
    // SPEC-0005 §18: validación runtime del input contra el inputSchema declarado.
    const validation = validateToolInput(tool.inputSchema, args);
    if (!validation.ok) {
      return { error: { code: 'invalid-input', tool: name, issues: validation.issues } };
    }
    log(`tool MCP llamada: ${tool.name}`);
    const result = await tool.handler(args ?? {}, context);
    if (name === GUIDANCE_TOOL) guidanceAck.add(context.projectId);
    return result;
  }

  // El acuse es por proyecto (no por sesión): cerrar una sesión MCP ya no lo resetea (SPEC-0006 §54.4).
  // Se conserva en la interfaz por compatibilidad; es un no-op respecto al gate.
  function purgeSession(_sessionId: string): void {
    /* no-op: el acuse de guía vive por proyecto mientras el proceso esté activo */
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
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
