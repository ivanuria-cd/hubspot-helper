import { useEffect } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { cdTheme } from '@renderer/theme';
import { i18nInstance } from '@renderer/i18n';

/**
 * Root del renderer. En SPEC-0001 monta los providers globales (tema MUI + i18n)
 * y carga el idioma persistido. La UI real se incorpora en SPEC-0002 (App Shell).
 */
export default function App(): JSX.Element {
  useEffect(() => {
    void window.api.getLanguage().then(async (language) => {
      await i18nInstance.changeLanguage(language);
      document.documentElement.lang = language;
    });
  }, []);

  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider theme={cdTheme}>
        <CssBaseline />
      </ThemeProvider>
    </I18nextProvider>
  );
}
