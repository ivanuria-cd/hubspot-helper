import type { McpTool } from './types';

/** Registro central de tools MCP. Previene nombres duplicados. */
export class McpRegistry {
  private readonly tools = new Map<string, McpTool>();

  register(tool: McpTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool MCP duplicada: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAll(): McpTool[] {
    return [...this.tools.values()];
  }

  get size(): number {
    return this.tools.size;
  }

  clear(): void {
    this.tools.clear();
  }
}

/** Singleton compartido por toda la app. */
export const mcpRegistry = new McpRegistry();
