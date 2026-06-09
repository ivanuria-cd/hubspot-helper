import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@shared/i18n/languages';
import esCommon from '@renderer/locales/es/common.json';
import caCommon from '@renderer/locales/ca/common.json';
import euCommon from '@renderer/locales/eu/common.json';
import enCommon from '@renderer/locales/en/common.json';

export const resources = {
  es: { common: esCommon },
  ca: { common: caCommon },
  eu: { common: euCommon },
  en: { common: enCommon },
} as const;

export function createI18n(initialLanguage?: SupportedLanguage): I18nInstance {
  const instance = i18n.createInstance();
  void instance
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: ['common'],
      defaultNS: 'common',
      returnNull: false,
      interpolation: { escapeValue: false },
      detection: { order: ['navigator'], caches: [] },
    });
  return instance;
}

export const i18nInstance = createI18n();

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@shared/i18n/languages';
export type { SupportedLanguage } from '@shared/i18n/languages';
