import { describe, it, expect } from 'vitest';
import { createI18n, SUPPORTED_LANGUAGES } from './index';

describe('configuración i18n', () => {
  it('carga los cuatro locales soportados', () => {
    const instance = createI18n('es');
    for (const language of SUPPORTED_LANGUAGES) {
      expect(instance.hasResourceBundle(language, 'common')).toBe(true);
    }
  });

  it('expone exactamente es, ca, eu, en', () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(['es', 'ca', 'eu', 'en']);
  });

  it('resuelve las claves del idioma activo', async () => {
    const instance = createI18n('en');
    await instance.changeLanguage('en');
    expect(instance.t('language.label')).toBe('Language');
  });

  it('aplica el fallback a es cuando la clave no existe en otro idioma', async () => {
    const instance = createI18n('en');
    await instance.changeLanguage('en');
    expect(instance.t('_fallbackProbe')).toBe('valor por defecto (es)');
  });
});
