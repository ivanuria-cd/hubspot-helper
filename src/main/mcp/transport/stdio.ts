import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Conecta un servidor MCP al transporte stdio. Pensado para integración directa
 * con clientes que lanzan la app como proceso hijo (Claude Desktop, Cursor).
 */
export async function connectStdio(server: Server): Promise<StdioServerTransport> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return transport;
}
