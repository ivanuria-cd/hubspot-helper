import { describe, it, expect } from 'vitest';
import { mapPropertyFieldTypeToForm, DEFAULT_FORM_FIELD_TYPE } from './field-map';

describe('field-map: propiedad → campo de formulario', () => {
  it.each([
    ['text', 'single_line_text'],
    ['textarea', 'multi_line_text'],
    ['number', 'number'],
    ['select', 'dropdown'],
    ['radio', 'radio'],
    ['checkbox', 'checkbox'],
    ['booleancheckbox', 'booleancheckbox'],
    ['date', 'date'],
    ['phonenumber', 'phone'],
  ])('mapea %s → %s sin fallback', (input, expected) => {
    const result = mapPropertyFieldTypeToForm(input);
    expect(result.formFieldType).toBe(expected);
    expect(result.fallback).toBe(false);
  });

  it('la propiedad email de contacto mapea a email', () => {
    const result = mapPropertyFieldTypeToForm('text', { propertyName: 'email' });
    expect(result.formFieldType).toBe('email');
    expect(result.fallback).toBe(false);
  });

  it('un fieldType no contemplado cae a single_line_text con fallback', () => {
    const result = mapPropertyFieldTypeToForm('algo_raro');
    expect(result.formFieldType).toBe(DEFAULT_FORM_FIELD_TYPE);
    expect(result.fallback).toBe(true);
  });
});
