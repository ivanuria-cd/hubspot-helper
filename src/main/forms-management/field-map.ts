/**
 * Mapeo puro propiedad HubSpot (SPEC-0006) → campo de formulario (SPEC-0008 §3).
 * Los `fieldType` no contemplados caen a `single_line_text` con `fallback: true` para
 * que el llamante registre el aviso. La propiedad `email` de contacto mapea a `email`.
 */

const FIELD_TYPE_MAP: Record<string, string> = {
  text: 'single_line_text',
  textarea: 'multi_line_text',
  number: 'number',
  select: 'dropdown',
  radio: 'radio',
  checkbox: 'checkbox',
  booleancheckbox: 'booleancheckbox',
  date: 'date',
  phonenumber: 'phone',
};

export const DEFAULT_FORM_FIELD_TYPE = 'single_line_text';

export interface MapFieldContext {
  /** Nombre técnico de la propiedad; la `email` de contacto fuerza el tipo `email`. */
  propertyName?: string;
}

export interface MappedFormField {
  formFieldType: string;
  fallback: boolean;
}

export function mapPropertyFieldTypeToForm(
  propertyFieldType: string,
  context: MapFieldContext = {},
): MappedFormField {
  if (context.propertyName === 'email') {
    return { formFieldType: 'email', fallback: false };
  }
  const mapped = FIELD_TYPE_MAP[propertyFieldType];
  if (mapped) return { formFieldType: mapped, fallback: false };
  return { formFieldType: DEFAULT_FORM_FIELD_TYPE, fallback: true };
}
