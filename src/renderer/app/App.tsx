import { useEffect, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { cdTheme } from '@renderer/theme';
import { i18nInstance } from '@renderer/i18n';
import { createAppRouter } from '@renderer/app/router';
import { useShellStore } from '@renderer/app/store/shell-store';

/**
 * Root del renderer. Monta los providers globales (tema MUI + i18n + router),
 * carga el idioma persistido y conecta los eventos del updater al shellStore.
 */
export default function App(): JSX.Element {
  const router = useMemo(() => createAppRouter(), []);
  const setUpdateStatus = useShellStore((state) => state.setUpdateStatus);

  useEffect(() => {
    void window.api.getLanguage().then(async (language) => {
      await i18nInstance.changeLanguage(language);
      document.documentElement.lang = language;
    });
  }, []);

  useEffect(() => {
    return window.api.onUpdaterStatus((status) => setUpdateStatus(status));
  }, [setUpdateStatus]);

  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider theme={cdTheme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </I18nextProvider>
  );
}
