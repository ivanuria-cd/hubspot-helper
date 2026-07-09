/**
 * Generación del contrato JSON de exportación por origen (SPEC-0006 §16, schema_version 2).
 * Recorre las entradas y, por cada fuente que use el origen, emite su definición genérica.
 */
import type { DataOrigin, OriginExport, PropertyEntry } from '@shared/types/properties';
import { entryDestName as destName } from './dest-name';

// SPEC-0006 §53.9: versión de esquema como constante nombrada (antes literal `2`).
export const ORIGIN_EXPORT_SCHEMA_VERSION = 2;

export interface ExportInput {
  origin: DataOrigin;
  entries: PropertyEntry[];
  now: () => string;
}

export function buildOriginExport(input: ExportInput): OriginExport {
  const objectName = new Map((input.origin.objects ?? []).map((o) => [o.id, o.name]));

  const properties: OriginExport['properties'] = input.entries.flatMap((entry) =>
    entry.sources
      .filter((source) => source.originId === input.origin.id)
      .map((source) => ({
        entry_name: entry.name,
        hubspot_name: destName(entry),
        object_type: entry.objectType,
        ...(source.originObjectId
          ? { source_object: objectName.get(source.originObjectId) ?? source.originObjectId }
          : {}),
        source_field: source.sourceField,
        source_kind: source.definition.kind,
        ...(source.definition.boolean ? { boolean_format: source.definition.boolean } : {}),
        ...(source.definition.options
          ? {
              options: source.definition.options.map((o) => ({
                sourceValue: o.sourceValue,
                hubspotValue: o.hubspotValue,
              })),
            }
          : {}),
        ...(source.notes ? { notes: source.notes } : {}),
      })),
  );

  return {
    schema_version: ORIGIN_EXPORT_SCHEMA_VERSION,
    origin: { id: input.origin.id, name: input.origin.name, type: input.origin.type },
    exported_at: input.now(),
    properties,
  };
}
