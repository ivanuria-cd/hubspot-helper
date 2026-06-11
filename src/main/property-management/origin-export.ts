/**
 * Generación del contrato JSON de exportación por origen (SPEC-0006 §3).
 * Es un contrato de integración para desarrolladores; se genera bajo demanda.
 */
import type {
  DataOrigin,
  HubSpotProperty,
  OriginExport,
  PropertyOriginMapping,
} from '@shared/types/properties';

export interface ExportInput {
  origin: DataOrigin;
  properties: HubSpotProperty[];
  mappings: PropertyOriginMapping[];
  now: () => string;
}

export function buildOriginExport(input: ExportInput): OriginExport {
  const propertyById = new Map(input.properties.map((property) => [property.id, property]));
  const originMappings = input.mappings.filter((mapping) => mapping.originId === input.origin.id);

  const properties: OriginExport['properties'] = originMappings.flatMap((mapping) => {
    const property = propertyById.get(mapping.propertyId);
    if (!property) return [];
    return [
      {
        hubspot_name: property.hubspotName,
        label: property.label,
        object_type: property.objectType,
        type: property.type,
        source_field: mapping.sourceField,
        transformations: mapping.transformations.map((rule) => ({
          sourceValue: rule.sourceValue,
          targetValue: rule.targetValue,
        })),
        ...(mapping.notes ? { notes: mapping.notes } : {}),
      },
    ];
  });

  return {
    schema_version: 1,
    origin: { id: input.origin.id, name: input.origin.name, type: input.origin.type },
    exported_at: input.now(),
    properties,
  };
}
