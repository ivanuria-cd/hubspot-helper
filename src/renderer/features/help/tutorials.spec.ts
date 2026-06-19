import { describe, it, expect } from 'vitest';
import {
  tutorials,
  tutorialFeatures,
  resolveContent,
  resolveTitle,
  type TutorialEntry,
} from './tutorials';

const synthetic: TutorialEntry = {
  id: 'demo/x',
  feature: 'demo',
  slug: 'x',
  titles: { es: 'Título ES', en: 'Title EN' },
  content: { es: '# Título ES\n\ncuerpo es', en: '# Title EN\n\nbody en' },
};

const onlyEs: TutorialEntry = {
  id: 'demo/y',
  feature: 'demo',
  slug: 'y',
  titles: { es: 'Solo ES' },
  content: { es: '# Solo ES\n\ncuerpo' },
};

describe('resolveContent', () => {
  it('devuelve la traducción cuando existe', () => {
    const r = resolveContent(synthetic, 'en');
    expect(r.isFallback).toBe(false);
    expect(r.shownLanguage).toBe('en');
    expect(r.content).toContain('body en');
  });

  it('cae a castellano cuando falta la traducción', () => {
    const r = resolveContent(onlyEs, 'eu');
    expect(r.isFallback).toBe(true);
    expect(r.shownLanguage).toBe('es');
    expect(r.content).toContain('cuerpo');
  });
});

describe('resolveTitle', () => {
  it('usa el título del idioma activo', () => {
    expect(resolveTitle(synthetic, 'en')).toBe('Title EN');
  });

  it('cae al título castellano cuando falta', () => {
    expect(resolveTitle(onlyEs, 'ca')).toBe('Solo ES');
  });
});

describe('catálogo cargado', () => {
  it('agrupa por feature/slug y siempre tiene versión es', () => {
    expect(tutorials.length).toBeGreaterThan(0);
    for (const entry of tutorials) {
      expect(entry.content.es, `${entry.id} sin es`).toBeDefined();
    }
  });

  it('al menos un tutorial tiene los cuatro idiomas', () => {
    const full = tutorials.find(
      (e) => e.content.es && e.content.ca && e.content.eu && e.content.en,
    );
    expect(full).toBeDefined();
  });

  it('expone las features esperadas', () => {
    expect(tutorialFeatures()).toEqual(expect.arrayContaining(['hubspot', 'propiedades']));
  });
});
