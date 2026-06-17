export const SUPPORTED_LANGUAGES = ['es', 'ca', 'eu', 'en'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

/** Autónimo de cada idioma: nombre en su propio idioma objetivo (SPEC-0000 §i18n). */
export const LANGUAGE_AUTONYMS: Record<SupportedLanguage, string> = {
  es: 'Castellano',
  ca: 'Català',
  eu: 'Euskara',
  en: 'English',
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
