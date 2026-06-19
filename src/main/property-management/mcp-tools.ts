/**
 * Tools MCP de la gestión de propiedades (SPEC-0006 §16). Incluyen lectura y edición.
 * La aplicación de cambios en HubSpot (apply) sigue exigiendo confirmación por entorno.
 */
import type { McpRegistry } from '../mcp/registry';
import type { PropertyService } from './service';
import type { EntryUpsertInput } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

const SCOPES = [
  'crm.schemas.contacts.read',
  'crm.schemas.deals.read',
  'crm.schemas.companies.read',
];

const WRITE_SCOPES = [
  'crm.schemas.contacts.write',
  'crm.schemas.deals.write',
  'crm.schemas.companies.write',
];

export function registerPropertyTools(registry: McpRegistry, service: PropertyService): void {
  if (registry.has('entries_list')) return;
  const feature = 'property-management';

  registry.register({
    name: 'objects_list',
    description: 'Lista los objetos de HubSpot disponibles (estandar + custom existentes).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => service.listObjects({ projectId: ctx.projectId }),
  });

  registry.register({
    name: 'entries_list',
    description: 'Lista las entradas del mapa de propiedades, opcionalmente filtradas por objeto.',
    inputSchema: { type: 'object', properties: { objectType: { type: 'string' } } },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { objectType } = (input ?? {}) as { objectType?: string };
      return Promise.resolve(service.listEntries({ projectId: ctx.projectId, objectType }));
    },
  });

  registry.register({
    name: 'origins_list',
    description: 'Lista los origenes de datos del proyecto.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => Promise.resolve(service.listOrigins({ projectId: ctx.projectId })),
  });

  registry.register({
    name: 'properties_pending_changes',
    description: 'Lista los cambios pendientes de aplicar en HubSpot para el proyecto.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => {
      const changes = service
        .listEntries({ projectId: ctx.projectId })
        .flatMap((entry) =>
          (entry.pendingChanges ?? []).map((change) => ({
            entry: entry.name,
            objectType: entry.objectType,
            ...change,
          })),
        );
      return Promise.resolve(changes);
    },
  });

  registry.register({
    name: 'properties_export_origin',
    description: 'Genera el JSON de exportacion (contrato de integracion) para un origen.',
    inputSchema: {
      type: 'object',
      properties: { originId: { type: 'string' } },
      required: ['originId'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { originId } = (input ?? {}) as { originId?: string };
      return Promise.resolve(service.exportJson({ projectId: ctx.projectId, originId: originId ?? '' }));
    },
  });

  registry.register({
    name: 'entries_upsert',
    description: 'Crea o actualiza una entrada del mapa (nombre, propiedad HubSpot destino y origenes).',
    inputSchema: { type: 'object', properties: { entry: { type: 'object' } }, required: ['entry'] },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { entry } = (input ?? {}) as { entry: EntryUpsertInput['entry'] };
      return Promise.resolve(service.upsertEntry({ projectId: ctx.projectId, entry }));
    },
  });

  registry.register({
    name: 'entries_delete',
    description: 'Elimina una entrada del mapa por su ID.',
    inputSchema: { type: 'object', properties: { entryId: { type: 'string' } }, required: ['entryId'] },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { entryId } = (input ?? {}) as { entryId?: string };
      return Promise.resolve(service.deleteEntry({ projectId: ctx.projectId, entryId: entryId ?? '' }));
    },
  });

  registry.register({
    name: 'origins_upsert',
    description: 'Crea un origen de datos del proyecto.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['integration', 'migration', 'user', 'workflow'] },
        description: { type: 'string' },
      },
      required: ['name', 'type'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const origin = (input ?? {}) as {
        name: string;
        type: 'integration' | 'migration' | 'user' | 'workflow';
        description?: string;
      };
      return Promise.resolve(service.createOrigin({ projectId: ctx.projectId, origin }));
    },
  });

  registry.register({
    name: 'origins_delete',
    description:
      'Elimina un origen de datos del proyecto (estado local) y lo retira de los orígenes de las entradas.',
    inputSchema: {
      type: 'object',
      properties: { originId: { type: 'string' } },
      required: ['originId'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { originId } = (input ?? {}) as { originId?: string };
      return Promise.resolve(
        service.deleteOrigin({ projectId: ctx.projectId, originId: originId ?? '' }),
      );
    },
  });

  registry.register({
    name: 'groups_list',
    description: 'Lista los grupos de propiedades de un objeto de HubSpot.',
    inputSchema: {
      type: 'object',
      properties: { objectType: { type: 'string' } },
      required: ['objectType'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { objectType } = (input ?? {}) as { objectType?: string };
      return service.listGroups({ projectId: ctx.projectId, objectType: objectType ?? '' });
    },
  });

  registry.register({
    name: 'groups_create',
    description: 'Crea un grupo de propiedades en un objeto de HubSpot (escritura, entorno activo).',
    inputSchema: {
      type: 'object',
      properties: {
        objectType: { type: 'string' },
        name: { type: 'string' },
        label: { type: 'string' },
      },
      required: ['objectType', 'name', 'label'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { objectType, name, label } = (input ?? {}) as { objectType: string; name: string; label: string };
      return service.createGroup({ projectId: ctx.projectId, objectType, name, label });
    },
  });

  registry.register({
    name: 'properties_sync',
    description: 'Sincroniza el estado de las entradas contra HubSpot (no escribe en HubSpot).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => service.syncHubspot({ projectId: ctx.projectId }),
  });

  registry.register({
    name: 'properties_apply_change',
    description: 'Aplica un cambio pendiente en HubSpot en el entorno indicado (sandbox o production).',
    inputSchema: {
      type: 'object',
      properties: {
        changeId: { type: 'string' },
        environment: { type: 'string', enum: ['sandbox', 'production'] },
      },
      required: ['changeId', 'environment'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { changeId, environment } = (input ?? {}) as {
        changeId: string;
        environment: HubSpotEnvironment;
      };
      return service.applyChange({ projectId: ctx.projectId, changeId, environment });
    },
  });

  registry.register({
    name: 'properties_discard_change',
    description: 'Descarta un cambio pendiente del proyecto.',
    inputSchema: { type: 'object', properties: { changeId: { type: 'string' } }, required: ['changeId'] },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { changeId } = (input ?? {}) as { changeId?: string };
      return Promise.resolve(service.discardChange({ projectId: ctx.projectId, changeId: changeId ?? '' }));
    },
  });
}
