import { describe, it, expect } from 'vitest';
import { isSystemProperty } from './system-properties';

describe('isSystemProperty (SPEC-0006 §43)', () => {
  it('reconoce propiedades de sistema conocidas', () => {
    expect(isSystemProperty('contacts', 'hubspot_owner_id')).toBe(true);
    expect(isSystemProperty('deals', 'closedate')).toBe(true);
    expect(isSystemProperty('contacts', 'createdate')).toBe(true);
  });

  it('reconoce el prefijo hs_', () => {
    expect(isSystemProperty('contacts', 'hs_object_id')).toBe(true);
    expect(isSystemProperty('tickets', 'hs_pipeline_stage')).toBe(true);
  });

  it('no marca propiedades personalizadas', () => {
    expect(isSystemProperty('contacts', 'pd_id')).toBe(false);
    expect(isSystemProperty('contacts', 'custom_tier')).toBe(false);
    expect(isSystemProperty('contacts', '')).toBe(false);
  });

  it('es insensible a mayúsculas', () => {
    expect(isSystemProperty('contacts', 'CreateDate')).toBe(true);
  });
});
