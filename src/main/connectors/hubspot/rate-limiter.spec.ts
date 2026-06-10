import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rate-limiter';

describe('rate limiter de HubSpot', () => {
  it('respeta la concurrencia máxima encolando las peticiones', async () => {
    const limiter = createRateLimiter({ maxConcurrent: 1 });
    let active = 0;
    let maxActive = 0;
    const order: number[] = [];

    const job = (id: number) =>
      limiter.schedule(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(id);
        active -= 1;
        return id;
      });

    const results = await Promise.all([job(1), job(2), job(3)]);

    expect(maxActive).toBe(1);
    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('agota el reservoir y bloquea hasta el refresco', async () => {
    const limiter = createRateLimiter({ reservoir: 2, maxConcurrent: 5, refreshInterval: 50 });
    const counts = await limiter.currentReservoir();
    expect(counts).toBe(2);

    await limiter.schedule(() => Promise.resolve('a'));
    await limiter.schedule(() => Promise.resolve('b'));
    expect(await limiter.currentReservoir()).toBe(0);
  });
});
