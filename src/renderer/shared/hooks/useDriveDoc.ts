/**
 * Patrón común de documentos Drive (SPEC-0004 §15): expone el estado «dirty», los timestamps y las
 * acciones de actualizar/cargar para una característica. Las llamadas concretas (IPC) las inyecta la
 * pantalla; el hook solo orquesta estado y mensajes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DriveDocMeta } from '@shared/types/gdrive';
import type { OperationResult } from '@shared/types/common';
import { driveFileUrl } from '@shared/utils/drive-file-url';

const SPREADSHEET_MIME = 'application/vnd.google-apps.spreadsheet' as const;

export type DriveActionResult = OperationResult;

export type DriveDocMessage = { kind: 'success' | 'error' | 'info'; text: string } | null;

export interface UseDriveDocArgs {
  hasData: boolean;
  fetchMeta: () => Promise<DriveDocMeta>;
  update: () => Promise<DriveActionResult>;
  load: () => Promise<DriveActionResult>;
  /** Opcional: si se omite, el hook usa las claves `drive.doc.*` de i18n por defecto (SPEC-0004 §29). */
  messages?: {
    updateSuccess: string;
    updateError: (error: string) => string;
    loadSuccess: string;
    loadError: (error: string) => string;
  };
}

export interface DriveDocController {
  dirty: boolean;
  updating: boolean;
  loading: boolean;
  message: DriveDocMessage;
  /** URL de apertura directa del Sheets legible en Drive; null si aún no existe (SPEC-0004 §18). */
  fileUrl: string | null;
  update: () => Promise<DriveActionResult>;
  load: () => Promise<DriveActionResult>;
  clearMessage: () => void;
}

export function useDriveDoc(args: UseDriveDocArgs): DriveDocController {
  const { t } = useTranslation('common');
  const messages = args.messages ?? {
    updateSuccess: t('drive.doc.updateSuccess'),
    updateError: (error: string) => t('drive.doc.updateError', { error }),
    loadSuccess: t('drive.doc.loadSuccess'),
    loadError: (error: string) => t('drive.doc.loadError', { error }),
  };
  const argsRef = useRef({ ...args, messages });
  argsRef.current = { ...args, messages };

  const [meta, setMeta] = useState<DriveDocMeta>({ lastWrittenAt: null, lastChangedAt: null });
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<DriveDocMessage>(null);

  const refreshMeta = useCallback(async () => {
    try {
      setMeta(await argsRef.current.fetchMeta());
    } catch {
      // Si falla la lectura de metadatos no bloqueamos la pantalla.
    }
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const update = useCallback(async (): Promise<DriveActionResult> => {
    setUpdating(true);
    setMessage(null);
    try {
      const result = await argsRef.current.update();
      setMessage(
        result.success
          ? { kind: 'success', text: argsRef.current.messages.updateSuccess }
          : { kind: 'error', text: argsRef.current.messages.updateError(result.error ?? '') },
      );
      await refreshMeta();
      return result;
    } finally {
      setUpdating(false);
    }
  }, [refreshMeta]);

  const load = useCallback(async (): Promise<DriveActionResult> => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await argsRef.current.load();
      setMessage(
        result.success
          ? { kind: 'success', text: argsRef.current.messages.loadSuccess }
          : { kind: 'error', text: argsRef.current.messages.loadError(result.error ?? '') },
      );
      await refreshMeta();
      return result;
    } finally {
      setLoading(false);
    }
  }, [refreshMeta]);

  const clearMessage = useCallback(() => setMessage(null), []);

  // Solo un `configured: false` explícito bloquea; `undefined` mantiene el comportamiento previo (SPEC-0004 §23).
  const configured = meta.configured !== false;
  const dirty =
    args.hasData &&
    configured &&
    (meta.lastWrittenAt === null ||
      (meta.lastChangedAt !== null && meta.lastChangedAt > meta.lastWrittenAt));

  const fileUrl = meta.fileId ? driveFileUrl(meta.fileId, SPREADSHEET_MIME) : null;

  return { dirty, updating, loading, message, fileUrl, update, load, clearMessage };
}
