import { useCallback, useEffect, useState } from 'react';
import type {
  GoogleDriveAuthStatus,
  GoogleDriveConfig,
  GoogleDriveSyncResult,
} from '@shared/types/gdrive';

export interface UseGoogleDriveConnector {
  status: GoogleDriveConfig | null;
  authStatus: GoogleDriveAuthStatus;
  loading: boolean;
  working: boolean;
  lastSync: GoogleDriveSyncResult | null;
  connect: () => Promise<void>;
  selectFolder: () => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useGoogleDriveConnector(projectId: string): UseGoogleDriveConnector {
  const [status, setStatus] = useState<GoogleDriveConfig | null>(null);
  const [authStatus, setAuthStatus] = useState<GoogleDriveAuthStatus>({ state: 'idle' });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [lastSync, setLastSync] = useState<GoogleDriveSyncResult | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await window.api.gdriveGetStatus({ projectId }));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.gdriveGetStatus({ projectId }).then((next) => {
      if (cancelled) return;
      setStatus(next);
      if (next?.accountEmail) setAuthStatus({ state: 'connected', email: next.accountEmail });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    return window.api.onGdriveAuthStatus((next) => {
      setAuthStatus(next);
      if (next.state === 'connected') void refresh();
    });
  }, [refresh]);

  const connect = useCallback(async () => {
    setWorking(true);
    try {
      await window.api.gdriveStartAuth({ projectId });
      await refresh();
    } finally {
      setWorking(false);
    }
  }, [projectId, refresh]);

  const selectFolder = useCallback(async () => {
    setWorking(true);
    try {
      await window.api.gdriveSelectFolder({ projectId });
      await refresh();
    } finally {
      setWorking(false);
    }
  }, [projectId, refresh]);

  const sync = useCallback(async () => {
    setWorking(true);
    try {
      setLastSync(await window.api.gdriveSync({ projectId }));
      await refresh();
    } finally {
      setWorking(false);
    }
  }, [projectId, refresh]);

  const disconnect = useCallback(async () => {
    setWorking(true);
    try {
      await window.api.gdriveRevoke({ projectId });
      setAuthStatus({ state: 'idle' });
      setLastSync(null);
      await refresh();
    } finally {
      setWorking(false);
    }
  }, [projectId, refresh]);

  return { status, authStatus, loading, working, lastSync, connect, selectFolder, sync, disconnect };
}
