import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDriveDoc, type UseDriveDocArgs } from './useDriveDoc';

const baseArgs = (meta: Partial<UseDriveDocArgs> = {}): UseDriveDocArgs => ({
  hasData: true,
  fetchMeta: vi.fn().mockResolvedValue({ lastWrittenAt: null, lastChangedAt: null }),
  update: vi.fn().mockResolvedValue({ success: true }),
  load: vi.fn().mockResolvedValue({ success: true }),
  messages: { updateSuccess: '', updateError: () => '', loadSuccess: '', loadError: () => '' },
  ...meta,
});

describe('useDriveDoc fileUrl', () => {
  it('es null cuando no hay fileId', async () => {
    const { result } = renderHook(() => useDriveDoc(baseArgs()));
    await waitFor(() => expect(result.current.fileUrl).toBeNull());
  });

  it('construye la URL del Sheets cuando hay fileId', async () => {
    const fetchMeta = vi.fn().mockResolvedValue({ lastWrittenAt: null, lastChangedAt: null, fileId: 'abc123' });
    const { result } = renderHook(() => useDriveDoc(baseArgs({ fetchMeta })));
    await waitFor(() =>
      expect(result.current.fileUrl).toBe('https://docs.google.com/spreadsheets/d/abc123/edit'),
    );
  });
});

describe('useDriveDoc dirty (§23)', () => {
  it('no marca dirty sin carpeta de Drive (configured:false) aunque haya datos sin escribir', async () => {
    const fetchMeta = vi.fn().mockResolvedValue({ lastWrittenAt: null, lastChangedAt: null, configured: false });
    const { result } = renderHook(() => useDriveDoc(baseArgs({ fetchMeta })));
    await waitFor(() => expect(result.current.dirty).toBe(false));
  });

  it('marca dirty con carpeta asociada (configured:true) y sin escribir', async () => {
    const fetchMeta = vi.fn().mockResolvedValue({ lastWrittenAt: null, lastChangedAt: null, configured: true });
    const { result } = renderHook(() => useDriveDoc(baseArgs({ fetchMeta })));
    await waitFor(() => expect(result.current.dirty).toBe(true));
  });
});
