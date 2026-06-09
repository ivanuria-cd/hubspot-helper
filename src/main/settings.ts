import Store from 'electron-store';
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@shared/i18n/languages';

interface SettingsSchema {
  language: SupportedLanguage;
}

const store = new Store<SettingsSchema>({
  name: 'settings',
  defaults: { language: DEFAULT_LANGUAGE },
});

export function getLanguage(): SupportedLanguage {
  const value = store.get('language', DEFAULT_LANGUAGE);
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function setLanguage(language: SupportedLanguage): void {
  if (isSupportedLanguage(language)) {
    store.set('language', language);
  }
}
