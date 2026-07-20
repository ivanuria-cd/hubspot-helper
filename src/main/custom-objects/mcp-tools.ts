/**
 * Tools MCP de la gestión de objetos custom (SPEC-0007 §7). Lectura, gestión de
 * borradores y aplicación de cambios por entorno (`apply_change` exige `environment`).
 */
import type { McpRegistry } from '../mcp/registry';
import { guidanceRegistry } from '../mcp/guidance';
import type { CustomObjectService } from './service';
import type { ObjectUpsertDraftInput } from '@shared/types/custom-objects';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

const READ_SCOPES = ['crm.schemas.custom.read'];
const WRITE_SCOPES = ['crm.schemas.custom.write'];

const CUSTOM_OBJECTS_GUIDANCE = `Los objetos custom se identifican por su "name" DENTRO de cada entorno. El "objectTypeId" es distinto en sandbox y en producción: no se reutiliza entre entornos.

Flujo: custom_objects_upsert_draft (crea/edita un borrador local; no escribe en HubSpot) -> custom_objects_sync (reconcilia contra el entorno activo y genera los cambios pendientes: "create" si el objeto no existe en el portal, "update_schema" si existe pero difiere) -> custom_objects_apply_change (escribe en el entorno indicado).

custom_objects_sync NO escribe en HubSpot (solo reconcilia). Solo apply_change escribe.

apply_change de "update_schema" o "archive" exige que el objeto YA exista en ese entorno; si no, falla con «el objeto no existe aún en ese entorno; crea primero el objeto en ese entorno». Consecuencia: el "create" se aplica en cada entorno por separado (aplicarlo en sandbox no lo crea en producción).

Estados: draft (no existe en el portal), created (existe y coincide), divergent (existe pero difiere -> update_schema). custom_objects_delete_draft elimina el borrador local; no afecta a HubSpot.`;

export function registerCustomObjectTools(
  registry: McpRegistry,
  service: CustomObjectService,
): void {
  if (registry.has('custom_objects_list')) return;
  const feature = 'custom-objects';

  guidanceRegistry.register({
    featureKey: feature,
    title: 'Objetos custom: identificación por entorno y flujo',
    order: 20,
    body: CUSTOM_OBJECTS_GUIDANCE,
  });

  registry.register({
    name: 'custom_objects_list',
    description: 'Lista las definiciones de objetos custom del proyecto con su estado.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: READ_SCOPES,
    handler: (_input, ctx) =>
      Promise.resolve(service.listDefinitions({ projectId: ctx.projectId })),
  });

  registry.register({
    name: 'custom_objects_get',
    description: 'Detalle de una definicion de objeto custom por id interno o nombre.',
    inputSchema: {
      type: 'object',
      properties: { objectId: { type: 'string' }, name: { type: 'string' } },
    },
    featureKey: feature,
    requiredScopes: READ_SCOPES,
    handler: (input, ctx) => {
      const { objectId, name } = (input ?? {}) as { objectId?: string; name?: string };
      const all = service.listDefinitions({ projectId: ctx.projectId });
      const found = objectId
        ? all.find((d) => d.id === objectId)
        : all.find((d) => d.name === name);
      return Promise.resolve(found ?? null);
    },
  });

  registry.register({
    name: 'custom_objects_pending_changes',
    description: 'Lista los cambios de schema pendientes de aplicar en HubSpot.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: READ_SCOPES,
    handler: (_input, ctx) => {
      const changes = service.listDefinitions({ projectId: ctx.projectId }).flatMap((def) =>
        (def.pendingChanges ?? []).map((change) => ({
          object: def.name,
          ...change,
        })),
      );
      return Promise.resolve(changes);
    },
  });

  registry.register({
    name: 'custom_objects_upsert_draft',
    requiresGuidance: true,
    description: 'Crea o actualiza un borrador de objeto custom (no escribe en HubSpot).',
    inputSchema: {
      type: 'object',
      properties: { definition: { type: 'object' } },
      required: ['definition'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { definition } = (input ?? {}) as { definition: ObjectUpsertDraftInput['definition'] };
      return Promise.resolve(service.upsertDraft({ projectId: ctx.projectId, definition }));
    },
  });

  registry.register({
    name: 'custom_objects_apply_change',
    requiresGuidance: true,
    description:
      'Aplica un cambio pendiente (create / update_schema / archive) en el entorno indicado.',
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
    name: 'custom_objects_discard_change',
    requiresGuidance: true,
    description: 'Descarta un cambio de schema pendiente del proyecto.',
    inputSchema: {
      type: 'object',
      properties: { changeId: { type: 'string' } },
      required: ['changeId'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { changeId } = (input ?? {}) as { changeId?: string };
      return Promise.resolve(
        service.discardChange({ projectId: ctx.projectId, changeId: changeId ?? '' }),
      );
    },
  });

  registry.register({
    name: 'custom_objects_sync',
    requiresGuidance: true,
    description:
      'Reconcilia los borradores y objetos contra HubSpot (entorno activo); genera los cambios pendientes (create / update_schema). No escribe en HubSpot.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: READ_SCOPES,
    handler: (_input, ctx) => service.syncHubspot({ projectId: ctx.projectId }),
  });

  registry.register({
    name: 'custom_objects_delete_draft',
    requiresGuidance: true,
    description: 'Elimina un borrador de objeto custom del estado local (no afecta a HubSpot).',
    inputSchema: {
      type: 'object',
      properties: { objectId: { type: 'string' } },
      required: ['objectId'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { objectId } = (input ?? {}) as { objectId?: string };
      return Promise.resolve(
        service.deleteDraft({ projectId: ctx.projectId, objectId: objectId ?? '' }),
      );
    },
  });
}
