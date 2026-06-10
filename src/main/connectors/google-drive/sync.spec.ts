import { describe, it, expect } from 'vitest';
import type { DriveFile } from '@shared/types/gdrive';
import { detectSyncStatus, reconcile, type RemoteFile } from './sync';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';

describe('detectSyncStatus', () => {
  it('synced cuando nada cambió respecto a la última sincronización', () => {
    expect(
      detectSyncStatus({ remoteModified: T0, lastModifiedDrive: T0, lastModifiedLocal: T0 }),
    ).toBe('synced');
  });

  it('synced cuando solo cambió Drive (Drive manda)', () => {
    expect(
      detectSyncStatus({ remoteModified: T1, lastModifiedDrive: T0, lastModifiedLocal: T0 }),
    ).toBe('synced');
  });

  it('conflict cuando la app tiene cambios locales más nuevos', () => {
    expect(
      detectSyncStatus({ remoteModified: T0, lastModifiedDrive: T0, lastModifiedLocal: T1 }),
    ).toBe('conflict');
  });

  it('conflict cuando ambos cambiaron', () => {
    expect(
      detectSyncStatus({ remoteModified: T2, lastModifiedDrive: T0, lastModifiedLocal: T1 }),
    ).toBe('conflict');
  });
});

function known(overrides: Partial<DriveFile> = {}): DriveFile {
  return {
    driveId: 'd1',
    name: 'Mapa',
    mimeType: 'application/vnd.google-apps.spreadsheet',
    featureKey: 'props',
    lastModifiedDrive: T0,
    lastModifiedLocal: T0,
    syncStatus: 'synced',
    ...overrides,
  };
}

function remote(overrides: Partial<RemoteFile> = {}): RemoteFile {
  return {
    driveId: 'd1',
    name: 'Mapa',
    mimeType: 'application/vnd.google-apps.spreadsheet',
    featureKey: 'props',
    modifiedTime: T0,
    ...overrides,
  };
}

describe('reconcile', () => {
  it('añade archivos nuevos de Drive como synced', () => {
    const result = reconcile([], [remote({ driveId: 'nuevo', modifiedTime: T1 })]);
    expect(result.files).toHaveLength(1);
    expect(result.synced).toHaveLength(1);
    expect(result.files[0].lastModifiedDrive).toBe(T1);
  });

  it('adopta la versión remota cuando solo cambió Drive', () => {
    const result = reconcile([known()], [remote({ modifiedTime: T1 })]);
    expect(result.conflicts).toHaveLength(0);
    expect(result.files[0].lastModifiedDrive).toBe(T1);
  });

  it('marca conflicto y preserva timestamps cuando hubo cambios locales', () => {
    const result = reconcile([known({ lastModifiedLocal: T1 })], [remote({ modifiedTime: T2 })]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.files[0].lastModifiedDrive).toBe(T0);
  });

  it('descarta archivos que ya no están en Drive (Drive manda)', () => {
    const result = reconcile([known({ driveId: 'viejo' })], []);
    expect(result.files).toHaveLength(0);
  });
});
