import { describe, it, expect, vi } from 'vitest';
import { retried, withDriveRetry } from './retry';

const noDelay = () => Promise.resolve();

describe('withDriveRetry (SPEC-0004 §25)', () => {
  it('reintenta en 429 y termina con éxito', async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.reject({ response: { status: 429 } });
      return Promise.resolve('ok');
    });
    expect(await withDriveRetry(fn, { delayFn: noDelay })).toBe('ok');
    expect(calls).toBe(2);
  });

  it('reintenta en 5xx hasta agotar maxRetries y luego propaga', async () => {
    const fn = vi.fn().mockRejectedValue({ code: 503 });
    await expect(withDriveRetry(fn, { maxRetries: 2, delayFn: noDelay })).rejects.toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('no reintenta errores no retriables (404)', async () => {
    const fn = vi.fn().mockRejectedValue({ response: { status: 404 } });
    await expect(withDriveRetry(fn, { delayFn: noDelay })).rejects.toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retried envuelve todos los métodos del objeto', async () => {
    let calls = 0;
    const api = retried(
      {
        list: () => {
          calls += 1;
          return calls === 1 ? Promise.reject({ response: { status: 500 } }) : Promise.resolve(['x']);
        },
      },
      { delayFn: noDelay },
    );
    expect(await api.list()).toEqual(['x']);
    expect(calls).toBe(2);
  });
});
