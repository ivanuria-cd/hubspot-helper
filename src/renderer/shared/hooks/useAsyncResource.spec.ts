// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAsyncResource } from './useAsyncResource';

const INITIAL: string[] = [];

describe('useAsyncResource', () => {
  it('expone loading true→false y publica los datos', async () => {
    const { result } = renderHook(() => useAsyncResource(() => Promise.resolve(['a', 'b']), ['k1'], INITIAL));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(INITIAL);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['a', 'b']);
    expect(result.current.error).toBe(false);
  });

  it('resetea a initial al cambiar deps (sin fuga entre ejecuciones)', async () => {
    let key = 'k1';
    const { result, rerender } = renderHook(() =>
      useAsyncResource(() => Promise.resolve([key]), [key], INITIAL),
    );
    await waitFor(() => expect(result.current.data).toEqual(['k1']));
    key = 'k2';
    rerender();
    // Inmediatamente tras cambiar deps, los datos previos no se filtran.
    expect(result.current.data).toBe(INITIAL);
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual(['k2']));
  });

  it('descarta una respuesta obsoleta si las deps cambian antes de resolver', async () => {
    let resolveFirst: (v: string[]) => void = () => {};
    let key = 'slow';
    const { result, rerender } = renderHook(() =>
      useAsyncResource(
        () =>
          key === 'slow'
            ? new Promise<string[]>((res) => {
                resolveFirst = res;
              })
            : Promise.resolve(['fast']),
        [key],
        INITIAL,
      ),
    );
    key = 'fast';
    rerender();
    await waitFor(() => expect(result.current.data).toEqual(['fast']));
    // La respuesta lenta llega tarde y debe ignorarse.
    resolveFirst(['slow']);
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.data).toEqual(['fast']);
  });

  it('marca error si el loader rechaza', async () => {
    const { result } = renderHook(() =>
      useAsyncResource(() => Promise.reject(new Error('boom')), ['e'], INITIAL),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
