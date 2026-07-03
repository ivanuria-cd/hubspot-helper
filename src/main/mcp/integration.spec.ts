import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { McpRegistry } from './registry';
import { createAuth } from './auth';
import { createMcpService, type McpService } from './server';

// Informe 2026-07-02 §10.11: entre el close() de este socket y el listen() del servicio hay una
// ventana de carrera; es aceptable con `workers: 1` (configuración actual de la suite). Si la
// suite pasa a ejecutarse en paralelo, cambiar el servicio para aceptar puerto 0 y leer el real.
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

const TOKEN = 'a'.repeat(64);

function buildService(port: number): McpService {
  const registry = new McpRegistry();
  registry.register({
    name: 'echo',
    description: 'Devuelve el texto recibido',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
    featureKey: 'test',
    handler: (input) => Promise.resolve({ echoed: (input as { text: string }).text }),
  });
  return createMcpService({
    registry,
    auth: createAuth({ getToken: () => TOKEN, setToken: () => undefined }),
    config: {
      isEnabled: () => false,
      setEnabled: () => undefined,
      getPort: () => port,
      setPort: () => undefined,
    },
    contextProvider: () => ({ projectId: 'proj-test' }),
    serverInfo: { name: 'revops-test', version: '0.0.0' },
  });
}

function clientFor(port: number, token: string): { client: Client; transport: SSEClientTransport } {
  const transport = new SSEClientTransport(new URL(`http://127.0.0.1:${port}/sse`), {
    requestInit: { headers: { 'x-api-key': token } },
  });
  const client = new Client({ name: 'test-client', version: '0.0.0' }, { capabilities: {} });
  return { client, transport };
}

describe('integración MCP (mcp-connection / mcp-tool-call)', () => {
  let service: McpService | null = null;

  afterEach(async () => {
    await service?.stop();
    service = null;
  });

  it('mcp-connection: un cliente se conecta y lista las tools', async () => {
    const port = await getFreePort();
    service = buildService(port);
    await service.start();

    const { client, transport } = clientFor(port, TOKEN);
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('echo');
    await client.close();
  });

  it('mcp-tool-call: llamar a una tool devuelve el resultado esperado', async () => {
    const port = await getFreePort();
    service = buildService(port);
    await service.start();

    const { client, transport } = clientFor(port, TOKEN);
    await client.connect(transport);
    const result = await client.callTool({ name: 'echo', arguments: { text: 'hola' } });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].type).toBe('text');
    expect(JSON.parse(content[0].text)).toEqual({ echoed: 'hola' });
    await client.close();
  });

  it('rechaza la conexión con token incorrecto (401)', async () => {
    const port = await getFreePort();
    service = buildService(port);
    await service.start();

    const { client, transport } = clientFor(port, 'token-incorrecto');
    await expect(client.connect(transport)).rejects.toThrow();
  });
});
