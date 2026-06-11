/**
 * Tools MCP de la gestión de propiedades (SPEC-0006 §8). Solo lectura: exponen el mapa
 * del proyecto a clientes MCP. La aplicación de cambios en HubSpot nunca pasa por MCP.
 */
import type { McpRegistry } from '../mcp/registry';
import type { PropertyService } from './service';

const SCOPES = [
  'crm.schemas.contacts.read',
  'crm.schemas.deals.read',
  'crm.schemas.companies.read',
];

export function registerPropertyTools(registry: McpRegistry, service: PropertyService): void {
  if (registry.has('properties_list')) return;

  registry.register({
    name: 'properties_list',
    description: 'Lista las propiedades del proyecto con su estado vs. HubSpot (exists/divergent/missing).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: 'property-management',
    requiredScopes: SCOPES,
    handler: (_input, context) =>
      Promise.resolve(service.listProperties({ projectId: context.projectId })),
  });

  registry.register({
    name: 'properties_get',
    description: 'Detalle de una propiedad del proyecto por nombre técnico de HubSpot o por ID.',
    inputSchema: {
      type: 'object',
      properties: { nameOrId: { type: 'string', description: 'Nombre HubSpot o ID interno' } },
      required: ['nameOrId'],
    },
    featureKey: 'property-management',
    requiredScopes: SCOPES,
    handler: (input, context) => {
      const { nameOrId } = (input ?? {}) as { nameOrId?: string };
      const property = service
        .listProperties({ projectId: context.projectId })
        .find((p) => p.hubspotName === nameOrId || p.id === nameOrId);
      return Promise.resolve(property ?? null);
    },
  });

  registry.register({
    name: 'properties_export_origin',
    description: 'Genera el JSON de exportación (contrato de integración) para un origen de datos.',
    inputSchema: {
      type: 'object',
      properties: { originId: { type: 'string' } },
      required: ['originId'],
    },
    featureKey: 'property-management',
    requiredScopes: SCOPES,
    handler: (input, context) => {
      const { originId } = (input ?? {}) as { originId?: string };
      return Promise.resolve(
        service.exportJson({ projectId: context.projectId, originId: originId ?? '' }),
      );
    },
  });

  registry.register({
    name: 'origins_list',
    description: 'Lista los orígenes de datos del proyecto (integraciones, migraciones, usuario, workflows).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: 'property-management',
    requiredScopes: SCOPES,
    handler: (_input, context) =>
      Promise.resolve(service.listOrigins({ projectId: context.projectId })),
  });

  registry.register({
    name: 'properties_pending_changes',
    description: 'Lista los cambios pendientes de aplicar en HubSpot para el proyecto.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: 'property-management',
    requiredScopes: SCOPES,
    handler: (_input, context) => {
      const changes = service
        .listProperties({ projectId: context.projectId })
        .flatMap((property) =>
          (property.pendingChanges ?? []).map((change) => ({
            property: property.hubspotName,
            objectType: property.objectType,
            ...change,
          })),
        );
      return Promise.resolve(changes);
    },
  });
}
