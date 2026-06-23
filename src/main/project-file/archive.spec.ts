import { describe, it, expect } from 'vitest';
import { packZip, unpackZip, type ArchiveEntries } from './archive';

describe('archive (ZIP STORE)', () => {
  it('empaqueta y desempaqueta sin pérdida (round-trip)', () => {
    const entries: ArchiveEntries = new Map([
      ['manifest.json', JSON.stringify({ magic: 'revops-project', n: 1 })],
      ['sections/forms-management.json', '{"feature":"forms-management","data":{"x":"áéí-ñ"}}'],
    ]);
    const buffer = packZip(entries);
    const back = unpackZip(buffer);
    expect([...back.keys()].sort()).toEqual([...entries.keys()].sort());
    for (const [name, content] of entries) {
      expect(back.get(name)).toBe(content);
    }
  });

  it('produce una firma ZIP local válida (PK\\x03\\x04)', () => {
    const buffer = packZip(new Map([['a.txt', 'hola']]));
    expect(buffer.readUInt32LE(0)).toBe(0x04034b50);
  });

  it('lanza si el buffer no es un ZIP', () => {
    expect(() => unpackZip(Buffer.from('no soy un zip'))).toThrow();
  });
});
