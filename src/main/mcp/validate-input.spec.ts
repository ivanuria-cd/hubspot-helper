import { describe, it, expect } from 'vitest';
import { validateToolInput } from './validate-input';

describe('validateToolInput (SPEC-0005 §18)', () => {
  const schema = {
    type: 'object',
    properties: {
      changeId: { type: 'string' },
      environment: { type: 'string', enum: ['sandbox', 'production'] },
      changeIds: { type: 'array', items: { type: 'string' } },
      includeLegacy: { type: 'boolean' },
    },
    required: ['changeId', 'environment'],
  };

  it('acepta un input válido', () => {
    const r = validateToolInput(schema, { changeId: 'c1', environment: 'sandbox' });
    expect(r.ok).toBe(true);
  });

  it('detecta requeridos ausentes', () => {
    const r = validateToolInput(schema, { changeId: 'c1' });
    expect(r.ok).toBe(false);
    expect(r.issues).toEqual([{ field: 'environment', message: 'campo requerido ausente' }]);
  });

  it('rechaza valores fuera del enum', () => {
    const r = validateToolInput(schema, { changeId: 'c1', environment: 'staging' });
    expect(r.ok).toBe(false);
    expect(r.issues[0]?.field).toBe('environment');
  });

  it('rechaza tipos incorrectos, también en items de array', () => {
    const r = validateToolInput(schema, {
      changeId: 42,
      environment: 'production',
      changeIds: ['ok', 7],
      includeLegacy: 'sí',
    });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.field)).toEqual(['changeId', 'changeIds[1]', 'includeLegacy']);
  });

  it('input no-objeto se rechaza; null/undefined cuentan como objeto vacío', () => {
    expect(validateToolInput(schema, 'texto').ok).toBe(false);
    const r = validateToolInput({ type: 'object', properties: {} }, undefined);
    expect(r.ok).toBe(true);
  });

  it('esquemas sin type object no validan nada', () => {
    expect(validateToolInput({}, 'lo que sea').ok).toBe(true);
  });
});
