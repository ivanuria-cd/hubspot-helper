/**
 * Tools MCP de la gestión de formularios (SPEC-0008 §6). Las de escritura solo PREPARAN
 * cambios pendientes; la aplicación en HubSpot exige confirmación en la UI (forms:apply-change
 * no se expone como tool).
 */
import type { McpRegistry } from '../mcp/registry';
import type { FormService } from './service';
import type { NewFormDefinition } from '@shared/types/forms';

const SCOPES = ['forms'];

export function registerFormTools(registry: McpRegistry, service: FormService): void {
  if (registry.has('forms_list')) return;
  const feature = 'forms-management';

  registry.register({
    name: 'forms_list',
    description: 'Lista los formularios del proyecto (tipo, objeto, nº de campos).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => Promise.resolve(service.listForms({ projectId: ctx.projectId })),
  });

  registry.register({
    name: 'forms_get',
    description: 'Detalle de un formulario por id (campos y orígenes asociados).',
    inputSchema: {
      type: 'object',
      properties: { formId: { type: 'string' } },
      required: ['formId'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { formId } = (input ?? {}) as { formId?: string };
      return service.getForm({ projectId: ctx.projectId, formId: formId ?? '' });
    },
  });

  registry.register({
    name: 'forms_sync',
    description: 'Importa/actualiza los formularios desde HubSpot (legacy y nueva herramienta).',
    inputSchema: { type: 'object', properties: { includeLegacyV2: { type: 'boolean' } } },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { includeLegacyV2 } = (input ?? {}) as { includeLegacyV2?: boolean };
      return service.syncHubspot({ projectId: ctx.projectId, includeLegacyV2 });
    },
  });

  registry.register({
    name: 'forms_coverage',
    description: 'Informe de cobertura de un formulario frente a su(s) origen(es).',
    inputSchema: {
      type: 'object',
      properties: { formId: { type: 'string' }, originId: { type: 'string' } },
      required: ['formId'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { formId, originId } = (input ?? {}) as { formId?: string; originId?: string };
      return Promise.resolve(
        service.coverage({ projectId: ctx.projectId, formId: formId ?? '', originId }),
      );
    },
  });

  registry.register({
    name: 'forms_link_origin',
    description: 'Asocia un formulario a uno o varios orígenes (estado local).',
    inputSchema: {
      type: 'object',
      properties: {
        formId: { type: 'string' },
        originIds: { type: 'array', items: { type: 'string' } },
        objectType: { type: 'string' },
      },
      required: ['formId', 'originIds', 'objectType'],
    },
    featureKey: feature,
    handler: (input, ctx) => {
      const { formId, originIds, objectType } = (input ?? {}) as {
        formId: string;
        originIds: string[];
        objectType: string;
      };
      return Promise.resolve(
        service.upsertLink({ projectId: ctx.projectId, link: { formId, originIds, objectType } }),
      );
    },
  });

  registry.register({
    name: 'forms_create_definition',
    description: 'Prepara un cambio pendiente para crear un formulario (solo campos).',
    inputSchema: {
      type: 'object',
      properties: { definition: { type: 'object' } },
      required: ['definition'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { definition } = (input ?? {}) as { definition: NewFormDefinition };
      return Promise.resolve(service.createDefinition({ projectId: ctx.projectId, definition }));
    },
  });

  registry.register({
    name: 'forms_add_missing_fields',
    description: 'Prepara un cambio pendiente que añade los campos que faltan de un origen.',
    inputSchema: {
      type: 'object',
      properties: { formId: { type: 'string' }, originId: { type: 'string' } },
      required: ['formId', 'originId'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { formId, originId } = (input ?? {}) as { formId: string; originId: string };
      return Promise.resolve(
        service.addMissingFields({ projectId: ctx.projectId, formId, originId }),
      );
    },
  });

  registry.register({
    name: 'forms_pending_changes',
    description: 'Lista los cambios pendientes de aplicar en HubSpot.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    handler: (_input, ctx) => Promise.resolve(service.listPendingChanges(ctx.projectId)),
  });

  registry.register({
    name: 'forms_discard_change',
    description: 'Descarta un cambio pendiente de formulario del proyecto.',
    inputSchema: {
      type: 'object',
      properties: { changeId: { type: 'string' } },
      required: ['changeId'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input, ctx) => {
      const { changeId } = (input ?? {}) as { changeId?: string };
      return Promise.resolve(
        service.discardChange({ projectId: ctx.projectId, changeId: changeId ?? '' }),
      );
    },
  });
}
