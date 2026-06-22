import { Button, CircularProgress, type ButtonProps } from '@mui/material';

interface BusyButtonProps extends ButtonProps {
  busy?: boolean;
}

/**
 * Botón con estado «ocupado» accesible (SPEC-0002 §17): mientras `busy` queda deshabilitado,
 * muestra un spinner y marca `aria-busy`, conservando su nombre accesible (texto/aria-label).
 */
export function BusyButton({ busy = false, disabled, startIcon, children, ...rest }: BusyButtonProps): JSX.Element {
  return (
    <Button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      startIcon={busy ? <CircularProgress size={16} color="inherit" /> : startIcon}
    >
      {children}
    </Button>
  );
}
