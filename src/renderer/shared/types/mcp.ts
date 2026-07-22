/**
 * Contratos públicos de la capa MCP compartidos entre main y renderer.
 * No incluye el `handler` de las tools (vive solo en el proceso main).
 */

export const DEFAULT_MCP_PORT = 3741;

export interface McpStatus {
  running: boolean;
  port: number;
  toolCount: number;
}

export interface McpToggleInput {
  enabled: boolean;
}

export type { OperationResult as McpOperationResult } from './common';

export interface McpTokenResult {
  token: string;
}

/** Resumen de una tool para mostrar en la UI (sin el handler). */
export interface McpToolSummary {
  name: string;
  description: string;
  featureKey: string;
  requiredScopes?: string[];
}
