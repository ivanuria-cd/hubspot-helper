import { describe, it, expect, beforeEach } from 'vitest';
import { McpRegistry } from './registry';
import type { McpTool } from './types';

function tool(name: string, overrides: Partial<McpTool> = {}): McpTool {
  return {
    name,
    description: `tool ${name}`,
    inputSchema: { type: 'object', properties: {} },
    featureKey: 'test',
    handler: () => Promise.resolve('ok'),
    ...overrides,
  };
}

describe('McpRegistry', () => {
  let registry: McpRegistry;

  beforeEach(() => {
    registry = new McpRegistry();
  });

  it('registra y lista tools', () => {
    registry.register(tool('a'));
    registry.register(tool('b'));
    expect(registry.size).toBe(2);
    expect(registry.getAll().map((t) => t.name)).toEqual(['a', 'b']);
  });

  it('recupera una tool por nombre', () => {
    const a = tool('a');
    registry.register(a);
    expect(registry.get('a')).toBe(a);
    expect(registry.has('a')).toBe(true);
    expect(registry.get('missing')).toBeUndefined();
  });

  it('previene nombres duplicados', () => {
    registry.register(tool('a'));
    expect(() => registry.register(tool('a'))).toThrow(/duplicada/);
    expect(registry.size).toBe(1);
  });

  it('permite desregistrar y limpiar', () => {
    registry.register(tool('a'));
    expect(registry.unregister('a')).toBe(true);
    expect(registry.unregister('a')).toBe(false);
    registry.register(tool('b'));
    registry.clear();
    expect(registry.size).toBe(0);
  });
});
