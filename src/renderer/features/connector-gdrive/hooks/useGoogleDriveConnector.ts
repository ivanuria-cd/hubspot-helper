import { useCallback, useEffect, useState } from 'react';
import type {
  DriveFolder,
  GoogleCredentialsInput,
  GoogleCredentialsStatus,
  GoogleDriveAuthStatus,
  GoogleDriveConfig,
  GoogleDriveOperationResult,
  GoogleDriveSyncResult,
} from '@shared/types/gdrive';

export interface UseGoogleDriveConnector {
  status: GoogleDriveConfig | null;
  authStatus: GoogleDriveAuthStatus;
  credentials: GoogleCredentialsStatus | null;
  loading: boolean;
  working: boolean;
  lastSync: GoogleDriveSyncResult | null;
  connect: () => Promise<void>;
  listFolders: (parentId: string) => Promise<DriveFolder[]>;
  searchFolders: (query: string) => Promise<DriveFolder[]>;
  setFolder: (folder: { folderId: string; folderName: string; folderPath: string }) => Promise<void>;
  saveCredentials: (input: GoogleCredentialsInput) => Promise<GoogleDriveOperationResult>;
  clearCredentials: () => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useGoogleDriveConnector(projectId: string): UseGoogleDriveConnector {
  const [status, setStatus] = useState<GoogleDriveConfig | null>(null);
  const [authStatus, setAuthStatus] = useState<GoogleDriveAuthStatus>({ state: 'idle' });
  const [credentials, setCredentials] = useState<GoogleCredentialsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [lastSync, setLastSync] = useState<GoogleDriveSyncResult | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await window.api.gdriveGetStatus({ projectId }));
  }, [projectId]);

  const refreshCredentials = useCallback(async () => {
    setCredentials(await window.api.gdriveGetCredentialsStatus());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      window.api.gdriveGetStatus({ projectId }),
      window.api.gdriveGetCredentialsStatus(),
    ]).then(([next, creds]) => {
      if (cancelled) return;
      setStatus(next);
      setCredentials(creds);
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

  const listFolders = useCallback(
    (parentId: string) => window.api.gdriveListFolders({ projectId, parentId }),
    [projectId],
  );

  const searchFolders = useCallback(
    (query: string) => window.api.gdriveSearchFolders({ projectId, query }),
    [projectId],
  );

  const setFolder = useCallback(
    async (folder: { folderId: string; folderName: string; folderPath: string }) => {
      setWorking(true);
      try {
        await window.api.gdriveSetFolder({ projectId, ...folder });
        await refresh();
      } finally {
        setWorking(false);
      }
    },
    [projectId, refresh],
  );

  const saveCredentials = useCallback(
    async (input: GoogleCredentialsInput) => {
      const result = await window.api.gdriveSetCredentials(input);
      await refreshCredentials();
      return result;
    },
    [refreshCredentials],
  );

  const clearCredentials = useCallback(async () => {
    await window.api.gdriveClearCredentials();
    await refreshCredentials();
  }, [refreshCredentials]);

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

  return {
    status,
    authStatus,
    credentials,
    loading,
    working,
    lastSync,
    connect,
    listFolders,
    searchFolders,
    setFolder,
    saveCredentials,
    clearCredentials,
    sync,
    disconnect,
  };
}
