import { useCallback, useEffect, useState } from 'react';
import type { McpStatus, McpToolSummary } from '@shared/types/mcp';

export interface UseMcpSettings {
  status: McpStatus | null;
  token: string;
  tools: McpToolSummary[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  toggle: (enabled: boolean) => Promise<void>;
  regenerateToken: () => Promise<void>;
}

export function useMcpSettings(): UseMcpSettings {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [token, setToken] = useState('');
  const [tools, setTools] = useState<McpToolSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextStatus, nextTools, nextToken] = await Promise.all([
      window.api.mcpGetStatus(),
      window.api.mcpListTools(),
      window.api.mcpGetToken(),
    ]);
    setStatus(nextStatus);
    setTools(nextTools);
    setToken(nextToken.token);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const toggle = useCallback(
    async (enabled: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const result = await window.api.mcpToggle(enabled);
        if (!result.success) setError(result.error ?? 'Error desconocido');
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const regenerateToken = useCallback(async () => {
    setBusy(true);
    try {
      const result = await window.api.mcpRegenerateToken();
      setToken(result.token);
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, token, tools, loading, busy, error, toggle, regenerateToken };
}
