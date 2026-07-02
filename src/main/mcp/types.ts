import type { McpToolSummary } from '@shared/types/mcp';

export type {
  McpStatus,
  McpToggleInput,
  McpOperationResult,
  McpTokenResult,
  McpToolSummary,
} from '@shared/types/mcp';
export { DEFAULT_MCP_PORT } from '@shared/types/mcp';

/** Esquema JSON de entrada de una tool (subconjunto pragmático de JSON Schema). */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/** Contexto de ejecución de una tool dentro de una sesión MCP. */
export interface McpContext {
  /** Proyecto activo en la sesión MCP. */
  projectId: string;
  /** Identificador de la sesión MCP actual (acuse de guía por sesión, SPEC-0005 §15). */
  sessionId?: string;
}

/**
 * Registro interno de una tool MCP. Cada feature registra las suyas en el
 * arranque vía `mcpRegistry.register(...)`.
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (input: unknown, context: McpContext) => Promise<unknown>;
  featureKey: string;
  requiredScopes?: string[];
  /** La tool se bloquea hasta que la sesión haya leído `revops_guidance` (SPEC-0005 §15). */
  requiresGuidance?: boolean;
}

/** Respuesta de bloqueo del gate de guía (SPEC-0005 §15.5). */
export interface GuidanceBlocked {
  blocked: true;
  reason: 'guidance-required';
  message: string;
  next: 'revops_guidance';
}

export function toSummary(tool: McpTool): McpToolSummary {
  return {
    name: tool.name,
    description: tool.description,
    featureKey: tool.featureKey,
    requiredScopes: tool.requiredScopes,
  };
}
