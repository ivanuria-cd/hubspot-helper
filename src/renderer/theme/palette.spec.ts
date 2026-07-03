import { describe, it, expect } from 'vitest';
import { cdPalette } from './palette';
import { cdTheme } from './index';

const allowed = new Set(Object.values(cdPalette).map((color) => color.toUpperCase()));

describe('paleta Cloud District', () => {
  it('mapea los tokens CD a los slots semánticos de MUI', () => {
    expect(cdTheme.palette.primary.main.toUpperCase()).toBe(cdPalette.deepNavy);
    expect(cdTheme.palette.primary.contrastText.toUpperCase()).toBe(cdPalette.textOnDark);
    expect(cdTheme.palette.secondary.main.toUpperCase()).toBe(cdPalette.accent);
    expect(cdTheme.palette.secondary.contrastText.toUpperCase()).toBe(cdPalette.deepNavy);
    expect(cdTheme.palette.background.default.toUpperCase()).toBe(cdPalette.bgLight);
    expect(cdTheme.palette.background.paper.toUpperCase()).toBe(cdPalette.tableAlt);
    expect(cdTheme.palette.text.primary.toUpperCase()).toBe(cdPalette.textOnLight);
    // Variante AA del tertiary para texto sobre blanco (informe e2e 2026-07-03).
    expect(cdTheme.palette.text.secondary.toUpperCase()).toBe(cdPalette.tertiaryText);
  });

  it('no asigna ningún color fuera de la paleta CD', () => {
    const explicitColors = [
      cdTheme.palette.primary.main,
      cdTheme.palette.primary.contrastText,
      cdTheme.palette.secondary.main,
      cdTheme.palette.secondary.contrastText,
      cdTheme.palette.background.default,
      cdTheme.palette.background.paper,
      cdTheme.palette.text.primary,
      cdTheme.palette.text.secondary,
    ];
    for (const color of explicitColors) {
      expect(allowed).toContain(color.toUpperCase());
    }
  });
});
