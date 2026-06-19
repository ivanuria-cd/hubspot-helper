import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Alert, type AlertColor, IconButton, Snackbar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

export interface SnackbarOptions {
  message: string;
  severity?: AlertColor;
  autoHideMs?: number | null;
}

interface SnackbarContextValue {
  notify: (options: SnackbarOptions) => void;
}

interface QueueItem extends Required<Omit<SnackbarOptions, 'autoHideMs'>> {
  autoHideMs: number | null;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const DEFAULT_AUTO_HIDE: Record<AlertColor, number | null> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: null,
};

function resolveItem(options: SnackbarOptions): QueueItem {
  const severity = options.severity ?? 'success';
  const autoHideMs =
    options.autoHideMs === undefined ? DEFAULT_AUTO_HIDE[severity] : options.autoHideMs;
  return { message: options.message, severity, autoHideMs };
}

export function SnackbarProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { t } = useTranslation('common');
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const [open, setOpen] = useState(false);
  const queue = useRef<QueueItem[]>([]);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    if (next) {
      setCurrent(next);
      setOpen(true);
    }
  }, []);

  const notify = useCallback(
    (options: SnackbarOptions) => {
      queue.current.push(resolveItem(options));
      if (!open && current === null) showNext();
    },
    [open, current, showNext],
  );

  const handleClose = useCallback((_e?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  const handleExited = useCallback(() => {
    setCurrent(null);
    showNext();
  }, [showNext]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={current?.autoHideMs ?? null}
        onClose={handleClose}
        TransitionProps={{ onExited: handleExited }}
      >
        {current ? (
          <Alert
            severity={current.severity}
            variant="filled"
            role={current.severity === 'error' ? 'alert' : 'status'}
            aria-live={current.severity === 'error' ? 'assertive' : 'polite'}
            action={
              <IconButton
                size="small"
                color="inherit"
                aria-label={t('snackbar.close')}
                onClick={() => handleClose()}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar debe usarse dentro de <SnackbarProvider>');
  return ctx;
}
