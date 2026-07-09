import { useEffect, useState } from 'react';

export interface OptionListEditor {
  query: string;
  setQuery: (value: string) => void;
  bulkOpen: boolean;
  toggleBulk: () => void;
  closeBulk: () => void;
  bulkText: string;
  setBulkText: (value: string) => void;
  ready: boolean;
  rowIds: string[];
  addRow: () => void;
  removeRow: (idx: number) => void;
  addRows: (n: number) => void;
}

/**
 * Estado común de los editores de lista «aparte» (OptionsDialog / SourceOptionsDialog, SPEC-0006 §53.10):
 * búsqueda, pegado masivo, render diferido y ids de fila estables (§51). Cada diálogo aporta su parser de
 * pegado, su forma de opción y su render de fila; aquí vive solo la mecánica compartida.
 */
export function useOptionListEditor(open: boolean, count: number): OptionListEditor {
  const [query, setQuery] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [ready, setReady] = useState(false);
  const [rowIds, setRowIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    setQuery('');
    setBulkOpen(false);
    setBulkText('');
    setRowIds(Array.from({ length: count }, () => crypto.randomUUID()));
    setReady(false);
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
    // Solo al abrir: regenerar los ids con cada edición rompería las keys estables (§51).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return {
    query,
    setQuery,
    bulkOpen,
    toggleBulk: () => setBulkOpen((o) => !o),
    closeBulk: () => setBulkOpen(false),
    bulkText,
    setBulkText,
    ready,
    rowIds,
    addRow: () => setRowIds((ids) => [...ids, crypto.randomUUID()]),
    removeRow: (idx) => setRowIds((ids) => ids.filter((_, i) => i !== idx)),
    addRows: (n) =>
      setRowIds((ids) => [...ids, ...Array.from({ length: n }, () => crypto.randomUUID())]),
  };
}
