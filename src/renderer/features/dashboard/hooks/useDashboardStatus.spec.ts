// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardStatus } from './useDashboardStatus';

function setApi(overrides: Record<string, unknown> = {}): void {
  (window as unknown as { api: Record<string, unknown> }).api = {
    hubspotGetStatus: vi.fn().mockResolvedValue({
      activeEnvironment: 'production',
      apiVersion: 'v3',
      environments: { production: {}, sandbox: {} },
    }),
    gdriveGetStatus: vi.fn().mockResolvedValue({ folderId: 'f', folderName: 'Carpeta' }),
    mcpGetStatus: vi.fn().mockResolvedValue({ running: true, port: 5000, toolCount: 12 }),
    entriesList: vi.fn().mockResolvedValue([{ pendingChanges: [{}, {}] }, { pendingChanges: [{}] }]),
    objectsListSchemas: vi.fn().mockResolvedValue([{ pendingChanges: [{}] }]),
    formsPendingChanges: vi.fn().mockResolvedValue([{}, {}]),
    ...overrides,
  };
}

describe('useDashboardStatus', () => {
  beforeEach(() => setApi());

  it('agrega estado de conectores y contadores de pendientes', async () => {
    const { result } = renderHook(() => useDashboardStatus('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hubspot.connected).toBe(true);
    expect(result.current.hubspot.environments).toHaveLength(2);
    expect(result.current.drive).toEqual({ connected: true, folderName: 'Carpeta' });
    expect(result.current.mcp).toEqual({ running: true, port: 5000, toolCount: 12 });
    expect(result.current.pending).toEqual({ properties: 3, objects: 1, forms: 2 });
    expect(result.current.anyConnector).toBe(true);
  });

  it('marca anyConnector false sin conectores', async () => {
    setApi({
      hubspotGetStatus: vi.fn().mockResolvedValue(null),
      gdriveGetStatus: vi.fn().mockResolvedValue(null),
      mcpGetStatus: vi.fn().mockResolvedValue({ running: false, port: 0, toolCount: 0 }),
      entriesList: vi.fn().mockResolvedValue([]),
      objectsListSchemas: vi.fn().mockResolvedValue([]),
      formsPendingChanges: vi.fn().mockResolvedValue([]),
    });
    const { result } = renderHook(() => useDashboardStatus('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.anyConnector).toBe(false);
    expect(result.current.pending).toEqual({ properties: 0, objects: 0, forms: 0 });
  });

  it('reporta error si falla una consulta', async () => {
    setApi({ entriesList: vi.fn().mockRejectedValue(new Error('boom')) });
    const { result } = renderHook(() => useDashboardStatus('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
