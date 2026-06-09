import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { cdPalette } from '@renderer/theme';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@shared/i18n/languages';

interface LanguageSwitcherProps {
  /** Estiliza el selector con colores claros para fondos oscuros (hero de bienvenida). */
  onDark?: boolean;
}

/**
 * Selector de idioma global. Cambia el idioma en caliente (sin reiniciar) y persiste
 * la preferencia vía electron-store (IPC). Se monta en el header de la app (TopBar y
 * hero de bienvenida) para estar disponible en todo el programa.
 */
export function LanguageSwitcher({ onDark = false }: LanguageSwitcherProps): JSX.Element {
  const { t, i18n } = useTranslation('common');

  const handleChange = async (language: SupportedLanguage): Promise<void> => {
    await i18n.changeLanguage(language);
    document.documentElement.lang = language;
    await window.api.setLanguage(language);
  };

  const sx = onDark
    ? {
        minWidth: 150,
        '& .MuiInputLabel-root': { color: cdPalette.secondary },
        '& .MuiInputLabel-root.Mui-focused': { color: cdPalette.textOnDark },
        '& .MuiOutlinedInput-root': { color: cdPalette.textOnDark },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: cdPalette.tertiary },
        '& .MuiSvgIcon-root': { color: cdPalette.secondary },
      }
    : { minWidth: 150 };

  return (
    <TextField
      select
      size="small"
      label={t('language.label')}
      value={i18n.resolvedLanguage ?? i18n.language}
      onChange={(event) => void handleChange(event.target.value as SupportedLanguage)}
      inputProps={{ 'aria-label': t('language.label') }}
      sx={sx}
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <MenuItem key={language} value={language}>
          {t(`language.${language}`)}
        </MenuItem>
      ))}
    </TextField>
  );
}
