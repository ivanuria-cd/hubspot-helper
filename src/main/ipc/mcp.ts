/** Handlers IPC de la capa MCP (SPEC-0005). Extraído de `index.ts` (SPEC-0002 §23). */
import { ipcMain } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import type { McpService } from '../mcp';

export function registerMcpIpc(mcp: McpService): void {
  ipcMain.handle(IpcChannels.mcpGetStatus, () => mcp.status());
  ipcMain.handle(IpcChannels.mcpToggle, (_event, enabled: boolean) => mcp.toggle(enabled));
  ipcMain.handle(IpcChannels.mcpRegenerateToken, () => mcp.regenerateToken());
  ipcMain.handle(IpcChannels.mcpListTools, () => mcp.listTools());
  ipcMain.handle(IpcChannels.mcpGetToken, () => ({ token: mcp.getToken() }));
}
