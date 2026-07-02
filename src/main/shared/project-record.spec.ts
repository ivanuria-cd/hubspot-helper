import { describe, it, expect } from 'vitest';
import { createProjectRecord, type RecordBackend } from './project-record';

function memoryBackend(): RecordBackend & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: (key) => data.get(key),
    set: (key, value) => void data.set(key, value),
  };
}

describe('createProjectRecord (SPEC-0002 §23)', () => {
  it('get devuelve undefined sin datos y el valor tras set', () => {
    const record = createProjectRecord<{ n: number }>(memoryBackend(), 'configs');
    expect(record.get('p1')).toBeUndefined();
    record.set('p1', { n: 1 });
    expect(record.get('p1')).toEqual({ n: 1 });
  });

  it('aísla proyectos y delete solo borra el indicado', () => {
    const record = createProjectRecord<string>(memoryBackend(), 'states');
    record.set('p1', 'a');
    record.set('p2', 'b');
    record.delete('p1');
    expect(record.get('p1')).toBeUndefined();
    expect(record.get('p2')).toBe('b');
  });

  it('persiste bajo la clave indicada del backend', () => {
    const backend = memoryBackend();
    const record = createProjectRecord<string>(backend, 'timestamps');
    record.set('p1', 'x');
    expect(backend.data.get('timestamps')).toEqual({ p1: 'x' });
  });
});
