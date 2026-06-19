// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCrmOverview } from './useCrmOverview';

function setApi(overrides: Record<string, unknown> = {}): void {
  (window as unknown as { api: Record<string, unknown> }).api = {
    hubspotGetStatus: vi.fn().mockResolvedValue({ environments: { production: {} } }),
    entriesList: vi.fn().mockResolvedValue([{ pendingChanges: [{}, {}] }, {}]),
    objectsListSchemas: vi.fn().mockResolvedValue([{ pendingChanges: [{}] }, {}, {}]),
    formsList: vi.fn().mockResolvedValue([{}, {}, {}, {}]),
    formsPendingChanges: vi.fn().mockResolvedValue([{}]),
    ...overrides,
  };
}

describe('useCrmOverview', () => {
  beforeEach(() => setApi());

  it('agrega total y pendientes por área', async () => {
    const { result } = renderHook(() => useCrmOverview('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hubspotConnected).toBe(true);
    expect(result.current.areas.properties).toEqual({ total: 2, pending: 2 });
    expect(result.current.areas.objects).toEqual({ total: 3, pending: 1 });
    expect(result.current.areas.forms).toEqual({ total: 4, pending: 1 });
  });

  it('marca hubspotConnected false sin entornos', async () => {
    setApi({ hubspotGetStatus: vi.fn().mockResolvedValue(null) });
    const { result } = renderHook(() => useCrmOverview('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hubspotConnected).toBe(false);
  });

  it('reporta error si falla una consulta', async () => {
    setApi({ entriesList: vi.fn().mockRejectedValue(new Error('boom')) });
    const { result } = renderHook(() => useCrmOverview('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
