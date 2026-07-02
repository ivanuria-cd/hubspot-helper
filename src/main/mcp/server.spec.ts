import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:net';
import { McpRegistry } from './registry';
import { createAuth } from './auth';
import { createMcpService, type McpConfigStore, type McpService } from './server';

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

function memoryConfig(port: number): McpConfigStore {
  let enabled = false;
  let p = port;
  return {
    isEnabled: () => enabled,
    setEnabled: (v) => {
      enabled = v;
    },
    getPort: () => p,
    setPort: (v) => {
      p = v;
    },
  };
}

function buildService(port: number, registry = new McpRegistry()): McpService {
  let stored: string | null = null;
  return createMcpService({
    registry,
    auth: createAuth({ getToken: () => stored, setToken: (v) => (stored = v) }),
    config: memoryConfig(port),
    contextProvider: () => ({ projectId: 'proj-test' }),
    serverInfo: { name: 'revops-test', version: '0.0.0' },
  });
}

describe('createMcpService', () => {
  let services: McpService[] = [];

  beforeEach(() => {
    services = [];
  });

  afterEach(async () => {
    await Promise.all(services.map((s) => s.stop()));
  });

  it('arranca y para el servidor reflejándolo en el estado', async () => {
    const port = await getFreePort();
    const service = buildService(port);
    services.push(service);

    expect(service.status().running).toBe(false);
    const started = await service.start();
    expect(started.running).toBe(true);
    expect(started.port).toBe(port);

    const stopped = await service.stop();
    expect(stopped.running).toBe(false);
  });

  it('toggle persiste el estado habilitado en la configuración', async () => {
    const port = await getFreePort();
    const config = memoryConfig(port);
    const service = createMcpService({
      registry: new McpRegistry(),
      auth: createAuth({ getToken: () => null, setToken: () => undefined }),
      config,
      contextProvider: () => ({ projectId: 'p' }),
      serverInfo: { name: 't', version: '0' },
    });
    services.push(service);

    await service.toggle(true);
    expect(config.isEnabled()).toBe(true);
    await service.toggle(false);
    expect(config.isEnabled()).toBe(false);
  });

  it('refleja el número de tools del registry', async () => {
    const registry = new McpRegistry();
    registry.register({
      name: 'x',
      description: 'x',
      inputSchema: {},
      featureKey: 'f',
      handler: () => Promise.resolve('ok'),
    });
    const service = buildService(await getFreePort(), registry);
    expect(service.status().toolCount).toBe(1);
    expect(service.listTools()).toHaveLength(1);
  });

  it('maneja el puerto ocupado devolviendo error en toggle', async () => {
    const port = await getFreePort();
    const first = buildService(port);
    const second = buildService(port);
    services.push(first, second);

    await first.start();
    const result = await second.toggle(true);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('regenera el token de acceso', () => {
    const service = buildService(3741);
    const original = service.getToken();
    const regenerated = service.regenerateToken().token;
    expect(regenerated).not.toBe(original);
    expect(service.getToken()).toBe(regenerated);
  });

  describe('gate de guía por sesión', () => {
    function gatedRegistry(): McpRegistry {
      const registry = new McpRegistry();
      registry.register({
        name: 'revops_guidance',
        description: 'guía',
        inputSchema: {},
        featureKey: 'mcp-core',
        handler: () => Promise.resolve({ content: 'reglas', acknowledged: true }),
      });
      registry.register({
        name: 'write_tool',
        description: 'escritura',
        inputSchema: {},
        featureKey: 'f',
        requiresGuidance: true,
        handler: () => Promise.resolve('ejecutado'),
      });
      registry.register({
        name: 'read_tool',
        description: 'lectura',
        inputSchema: {},
        featureKey: 'f',
        handler: () => Promise.resolve('leido'),
      });
      return registry;
    }

    it('bloquea una tool con requiresGuidance sin acuse y la ejecuta tras leer la guía', async () => {
      const service = buildService(3742, gatedRegistry());
      const before = (await service.callTool('write_tool', {}, 'S1')) as { blocked?: boolean };
      expect(before.blocked).toBe(true);

      await service.callTool('revops_guidance', {}, 'S1');
      const after = await service.callTool('write_tool', {}, 'S1');
      expect(after).toBe('ejecutado');
    });

    it('una tool de solo lectura nunca se bloquea', async () => {
      const service = buildService(3743, gatedRegistry());
      expect(await service.callTool('read_tool', {}, 'S1')).toBe('leido');
    });

    it('el acuse de la sesión A no desbloquea la sesión B', async () => {
      const service = buildService(3744, gatedRegistry());
      await service.callTool('revops_guidance', {}, 'A');
      expect(await service.callTool('write_tool', {}, 'A')).toBe('ejecutado');
      const b = (await service.callTool('write_tool', {}, 'B')) as { blocked?: boolean };
      expect(b.blocked).toBe(true);
    });

    it('purgar la sesión reactiva el bloqueo', async () => {
      const service = buildService(3745, gatedRegistry());
      await service.callTool('revops_guidance', {}, 'A');
      service.purgeSession('A');
      const after = (await service.callTool('write_tool', {}, 'A')) as { blocked?: boolean };
      expect(after.blocked).toBe(true);
    });
  });

  describe('validación runtime del inputSchema (§18)', () => {
    function validatedRegistry(): McpRegistry {
      const registry = new McpRegistry();
      registry.register({
        name: 'typed_tool',
        description: 'con schema',
        inputSchema: {
          type: 'object',
          properties: {
            changeId: { type: 'string' },
            environment: { type: 'string', enum: ['sandbox', 'production'] },
          },
          required: ['changeId', 'environment'],
        },
        featureKey: 'f',
        handler: () => Promise.resolve('ok'),
      });
      return registry;
    }

    it('rechaza input inválido con issues estructurados sin ejecutar el handler', async () => {
      const service = buildService(3746, validatedRegistry());
      const bad = (await service.callTool('typed_tool', { environment: 'staging' }, 'S1')) as {
        error?: { code: string; issues: Array<{ field: string }> };
      };
      expect(bad.error?.code).toBe('invalid-input');
      expect(bad.error?.issues.map((i) => i.field)).toEqual(['changeId', 'environment']);
    });

    it('ejecuta el handler con input válido', async () => {
      const service = buildService(3747, validatedRegistry());
      const ok = await service.callTool('typed_tool', { changeId: 'c1', environment: 'sandbox' }, 'S1');
      expect(ok).toBe('ok');
    });
  });
});
