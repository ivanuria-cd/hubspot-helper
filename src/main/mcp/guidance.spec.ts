import { describe, it, expect } from 'vitest';
import { GuidanceRegistry } from './guidance';

describe('GuidanceRegistry', () => {
  it('rechaza secciones duplicadas por featureKey', () => {
    const reg = new GuidanceRegistry();
    reg.register({ featureKey: 'a', title: 'A', order: 1, body: 'x' });
    expect(() => reg.register({ featureKey: 'a', title: 'A2', order: 2, body: 'y' })).toThrow();
  });

  it('ordena por order y luego featureKey', () => {
    const reg = new GuidanceRegistry();
    reg.register({ featureKey: 'z', title: 'Z', order: 10, body: 'z' });
    reg.register({ featureKey: 'a', title: 'A', order: 10, body: 'a' });
    reg.register({ featureKey: 'm', title: 'M', order: 1, body: 'm' });
    expect(reg.getAll().map((s) => s.featureKey)).toEqual(['m', 'a', 'z']);
  });

  it('ensambla todas las secciones en markdown', () => {
    const reg = new GuidanceRegistry();
    reg.register({ featureKey: 'a', title: 'Titulo A', order: 1, body: 'cuerpo a' });
    reg.register({ featureKey: 'b', title: 'Titulo B', order: 2, body: 'cuerpo b' });
    const out = reg.assemble();
    expect(out).toContain('## Titulo A');
    expect(out).toContain('cuerpo a');
    expect(out).toContain('## Titulo B');
  });

  it('filtra por featureKey', () => {
    const reg = new GuidanceRegistry();
    reg.register({ featureKey: 'a', title: 'A', order: 1, body: 'cuerpo a' });
    reg.register({ featureKey: 'b', title: 'B', order: 2, body: 'cuerpo b' });
    const out = reg.assemble({ featureKey: 'a' });
    expect(out).toContain('cuerpo a');
    expect(out).not.toContain('cuerpo b');
  });
});
