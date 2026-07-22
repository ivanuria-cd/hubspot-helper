import { describe, expect, it } from 'vitest';
import { FIELD_TYPES_BY_TYPE } from '@shared/constants/hubspot-property-types';
import {
  USER_FRIENDLY_FIELD_TYPES,
  configsFor,
  isAmbiguous,
  isConfigConsistent,
  resolveUserFriendlyType,
} from './planning-field-types';

describe('catalogo de tipos user-friendly (SPEC-0016 D6)', () => {
  it('resuelve automaticamente los tipos con una unica configuracion', () => {
    expect(resolveUserFriendlyType('text')).toEqual({ type: 'string', fieldType: 'text' });
    expect(resolveUserFriendlyType('yes_no')).toEqual({
      type: 'bool',
      fieldType: 'booleancheckbox',
    });
    expect(isAmbiguous('text')).toBe(false);
  });

  it('marca necesita-accion los tipos ambiguos y no los resuelve solos', () => {
    expect(isAmbiguous('choice')).toBe(true);
    expect(isAmbiguous('calculation')).toBe(true);
    expect(resolveUserFriendlyType('choice')).toBeUndefined();
    expect(resolveUserFriendlyType('calculation')).toBeUndefined();
    expect(configsFor('choice').length).toBeGreaterThan(1);
  });

  it('la moneda lleva display hint currency y simbolo', () => {
    expect(resolveUserFriendlyType('currency')).toEqual({
      type: 'number',
      fieldType: 'number',
      numberDisplayHint: 'currency',
      showCurrencySymbol: true,
    });
  });

  it('las claves del catalogo son unicas', () => {
    const keys = USER_FRIENDLY_FIELD_TYPES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('toda configuracion del catalogo es coherente con FIELD_TYPES_BY_TYPE', () => {
    for (const t of USER_FRIENDLY_FIELD_TYPES) {
      expect(t.configs.length, `${t.key} sin configuraciones`).toBeGreaterThan(0);
      for (const config of t.configs) {
        expect(
          isConfigConsistent(config),
          `${t.key}: ${config.type}/${config.fieldType} no esta en FIELD_TYPES_BY_TYPE`,
        ).toBe(true);
        expect(FIELD_TYPES_BY_TYPE[config.type], `type desconocido: ${config.type}`).toBeDefined();
      }
    }
  });
});
