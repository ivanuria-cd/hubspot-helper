/**
 * Validación runtime del input de las tools MCP contra su `inputSchema` (SPEC-0005 §18).
 * Subconjunto pragmático de JSON Schema: `required`, `type` y `enum` de las propiedades de
 * primer nivel (+ `items.type` primitivo en arrays). Los handlers siguen validando en
 * profundidad lo suyo (p. ej. `entries_upsert`, SPEC-0006 §39.9).
 */
import type { JsonSchema } from './types';

export interface InputIssue {
  field: string;
  message: string;
}

export interface InputValidationResult {
  ok: boolean;
  issues: InputIssue[];
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: unknown, expected: string): boolean {
  const actual = typeOf(value);
  if (expected === 'integer') return actual === 'number' && Number.isInteger(value);
  return actual === expected;
}

export function validateToolInput(schema: JsonSchema, input: unknown): InputValidationResult {
  const issues: InputIssue[] = [];
  if (schema.type !== 'object') return { ok: true, issues };

  const value = input ?? {};
  if (typeOf(value) !== 'object') {
    return { ok: false, issues: [{ field: '', message: `se esperaba un objeto, llegó ${typeOf(value)}` }] };
  }
  const obj = value as Record<string, unknown>;

  for (const key of schema.required ?? []) {
    if (obj[key] === undefined) issues.push({ field: key, message: 'campo requerido ausente' });
  }

  const properties = (schema.properties ?? {}) as Record<
    string,
    { type?: string; enum?: unknown[]; items?: { type?: string } }
  >;
  for (const [key, propSchema] of Object.entries(properties)) {
    const propValue = obj[key];
    if (propValue === undefined) continue;
    if (propSchema.type && !matchesType(propValue, propSchema.type)) {
      issues.push({
        field: key,
        message: `tipo inválido: se esperaba ${propSchema.type}, llegó ${typeOf(propValue)}`,
      });
      continue;
    }
    if (propSchema.enum && !propSchema.enum.includes(propValue)) {
      issues.push({
        field: key,
        message: `valor fuera del enum permitido: ${propSchema.enum.map(String).join(' | ')}`,
      });
    }
    if (propSchema.type === 'array' && propSchema.items?.type && Array.isArray(propValue)) {
      const itemType = propSchema.items.type;
      propValue.forEach((item, index) => {
        if (!matchesType(item, itemType)) {
          issues.push({
            field: `${key}[${index}]`,
            message: `tipo inválido: se esperaba ${itemType}, llegó ${typeOf(item)}`,
          });
        }
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
