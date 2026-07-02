import { Alert, AlertTitle, Box, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouteError } from 'react-router-dom';

/**
 * Fallback de ruta (SPEC-0002 §20): captura errores de render de una pantalla para que un dato
 * malformado no deje toda la app en pantalla de error. Mantiene el layout y ofrece recargar.
 */
export function RouteErrorBoundary(): JSX.Element {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    <Box sx={{ p: 3 }} role="alert">
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={() => navigate(0)}>
            {t('errorBoundary.reload')}
          </Button>
        }
      >
        <AlertTitle>{t('errorBoundary.title')}</AlertTitle>
        {t('errorBoundary.body')}
        {message ? (
          <Box component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {message}
          </Box>
        ) : null}
      </Alert>
    </Box>
  );
}
