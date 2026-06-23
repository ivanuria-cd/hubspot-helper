/**
 * Empaquetado/desempaquetado ZIP mínimo (método STORE, sin compresión) para el
 * contenedor `.rvproj` (SPEC-0013 §11). Sin dependencias externas; compatible con
 * herramientas ZIP estándar. Si se necesitara compresión, sustituir solo este módulo.
 */

export type ArchiveEntries = Map<string, string>;

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function packZip(entries: ArchiveEntries): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIG, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const localPart = Buffer.concat(locals);
  const centralPart = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.size, 8);
  eocd.writeUInt16LE(entries.size, 10);
  eocd.writeUInt32LE(centralPart.length, 12);
  eocd.writeUInt32LE(localPart.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localPart, centralPart, eocd]);
}

export function unpackZip(buffer: Buffer): ArchiveEntries {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('El archivo no es un ZIP válido.');

  const count = buffer.readUInt16LE(eocd + 10);
  let pointer = buffer.readUInt32LE(eocd + 16);
  const entries: ArchiveEntries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(pointer) !== CENTRAL_SIG) {
      throw new Error('Directorio central del ZIP corrupto.');
    }
    const compSize = buffer.readUInt32LE(pointer + 20);
    const nameLen = buffer.readUInt16LE(pointer + 28);
    const extraLen = buffer.readUInt16LE(pointer + 30);
    const commentLen = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLen);

    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const data = buffer.toString('utf8', dataStart, dataStart + compSize);
    entries.set(name, data);

    pointer += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}
