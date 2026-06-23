import { describe, it, expect } from 'vitest';
import { CD, FONT_PRIMARY, TYPO, hexToRgb } from './brand';

describe('brand', () => {
  it('expone la paleta Cloud District', () => {
    expect(CD.dark).toBe('#090017');
    expect(CD.navy).toBe('#14072B');
    expect(CD.accent).toBe('#AFFC41');
    expect(FONT_PRIMARY).toBe('Poppins');
  });

  it('hexToRgb normaliza a 0..1', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ red: 1, green: 1, blue: 1 });
    expect(hexToRgb('#000000')).toEqual({ red: 0, green: 0, blue: 0 });
  });

  it('expone tamaños tipográficos por nivel', () => {
    expect(TYPO.bannerTitle).toBeGreaterThan(TYPO.body);
  });
});
