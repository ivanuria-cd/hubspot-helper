import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@shared/i18n/languages';

/**
 * Selector de idioma reutilizable. Cambia el idioma en caliente (sin reiniciar)
 * y persiste la preferencia vía electron-store (IPC). Pensado para la pantalla
 * de ajustes de SPEC-0002.
 */
export function LanguageSwitcher(): JSX.Element {
  const { t, i18n } = useTranslation('common');

  const handleChange = async (language: SupportedLanguage): Promise<void> => {
    await i18n.changeLanguage(language);
    document.documentElement.lang = language;
    await window.api.setLanguage(language);
  };

  return (
    <TextField
      select
      size="small"
      label={t('language.label')}
      value={i18n.resolvedLanguage ?? i18n.language}
      onChange={(event) => void handleChange(event.target.value as SupportedLanguage)}
      inputProps={{ 'aria-label': t('language.label') }}
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <MenuItem key={language} value={language}>
          {t(`language.${language}`)}
        </MenuItem>
      ))}
    </TextField>
  );
}
