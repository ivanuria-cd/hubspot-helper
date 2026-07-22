import { describe, it, expect } from 'vitest';
import { driveFileUrl } from './drive-file-url';

describe('driveFileUrl', () => {
  it('construye la URL de un Google Sheets', () => {
    expect(driveFileUrl('abc123', 'application/vnd.google-apps.spreadsheet')).toBe(
      'https://docs.google.com/spreadsheets/d/abc123/edit',
    );
  });

  it('construye la URL de un Google Doc', () => {
    expect(driveFileUrl('xyz789', 'application/vnd.google-apps.document')).toBe(
      'https://docs.google.com/document/d/xyz789/edit',
    );
  });

  it('respeta ids con caracteres especiales', () => {
    expect(driveFileUrl('1A_b-Cd', 'application/vnd.google-apps.spreadsheet')).toContain(
      '/d/1A_b-Cd/edit',
    );
  });
});
