/**
 * Tools MCP del mapa de campos editable (SPEC-0016 D5 / §4.5). Necesitan acceso a Drive, por eso se
 * registran con un orquestador (`drive`, implementado por drive-docs) ademas del `service` de estado.
 * Se registran DESPUES de crear drive-docs (index.ts). Gate de guia (`requiresGuidance`) en las que
 * mutan estado o Drive. ASCII intencionado.
 */
import type { McpRegistry } from '../mcp/registry';
import { guidanceRegistry } from '../mcp/guidance';
import type { PropertyService } from './service';
import { configsFor } from '@shared/constants/planning-field-types';
import { SCOPES, WRITE_SCOPES } from './mcp-scopes';
import type {
  PlanningApplyResult,
  PlanningImportResult,
  PlanningResolution,
  UserFriendlyFieldTypeKey,
} from '@shared/types/planning';

const PLANNING_GUIDANCE = `El mapa de campos editable (SPEC-0016) es un documento de Drive, editable, que rellena el cliente
para planificar el mapeo de propiedades. Flujo:
- planning_write_map: genera/actualiza el documento (desplegables Custom/Origin/Type/Field name; sin proteccion).
- planning_import_map: LEE el documento rellenado y devuelve un changelog (altas/bajas/cambios + tipos que
  "necesitan accion"). NO crea borradores; sirve para alertar y revisar ANTES de aplicar (SPEC-0016 2.6).
- planning_apply_import: tras revisar el changelog, crea/actualiza borradores. Los tipos user-friendly
  ambiguos (choice, calculation) sin resolver quedan en "blocked" y NO se crean: hay que resolverlos.
- planning_resolve_field_type: resuelve un tipo ambiguo eligiendo un fieldType; devuelve la config de HubSpot
  para pasarla en "resolutions" de planning_apply_import.
- planning_field_types (solo lectura): lista el catalogo user-friendly y marca los ambiguos.
No aplica cambios en HubSpot: solo produce borradores (luego properties_sync + properties_apply_change).`;

/** Operaciones de Drive del mapa editable (subset de drive-docs). */
export interface PlanningDriveOps {
  writePlanningMap(
    projectId: string,
  ): Promise<{ success: boolean; spreadsheetId?: string; error?: string }>;
  importPlanningMap(projectId: string): Promise<PlanningImportResult>;
  applyPlanningImport(
    projectId: string,
    resolutions: PlanningResolution[],
  ): Promise<PlanningApplyResult>;
}

export interface PlanningToolsDeps {
  service: PropertyService;
  drive: PlanningDriveOps;
}

export function registerPlanningTools(registry: McpRegistry, deps: PlanningToolsDeps): void {
  if (registry.has('planning_write_map')) return;
  // featureKey propio: la guia se registra por featureKey y `property-management` ya existe
  // (guidanceRegistry.register lanza ante duplicados). Las tools llevan su propio gate/guia.
  const feature = 'property-planning';

  guidanceRegistry.register({
    featureKey: feature,
    title: 'Mapa de campos editable (planificacion)',
    order: 20,
    body: PLANNING_GUIDANCE,
  });

  registry.register({
    name: 'planning_write_map',
    requiresGuidance: true,
    description:
      'Genera/actualiza en Drive el mapa de campos editable (documento de planificacion, sin proteccion). ' +
      'Requiere cuenta de Google conectada y carpeta seleccionada.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (_input, ctx) => deps.drive.writePlanningMap(ctx.projectId),
  });

  registry.register({
    name: 'planning_import_map',
    description:
      'Lee el mapa editable rellenado y devuelve el changelog (altas/bajas/cambios + needsAction). NO crea ' +
      'borradores: usar para revisar antes de aplicar (SPEC-0016 2.6).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => deps.drive.importPlanningMap(ctx.projectId),
  });

  registry.register({
    name: 'planning_apply_import',
    requiresGuidance: true,
    description:
      'Crea/actualiza borradores desde el mapa editable tras revisar el changelog. «resolutions» resuelve los ' +
      'tipos ambiguos (D6): [{ objectType, entryName, config: { type, fieldType } }]. Los no resueltos quedan ' +
      'en «blocked» y no se crean. No aplica cambios en HubSpot.',
    inputSchema: {
      type: 'object',
      properties: {
        resolutions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['objectType', 'entryName', 'config'],
            properties: {
              objectType: { type: 'string' },
              entryName: { type: 'string' },
              config: {
                type: 'object',
                required: ['type', 'fieldType'],
                properties: { type: { type: 'string' }, fieldType: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { resolutions } = (input ?? {}) as { resolutions?: PlanningResolution[] };
      return deps.drive.applyPlanningImport(ctx.projectId, resolutions ?? []);
    },
  });

  registry.register({
    name: 'planning_resolve_field_type',
    description:
      'Resuelve un tipo user-friendly ambiguo eligiendo un «fieldType» concreto; devuelve la HubSpotFieldConfig ' +
      'para usarla en «resolutions» de planning_apply_import.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string' }, fieldType: { type: 'string' } },
      required: ['key', 'fieldType'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (input) => {
      const { key, fieldType } = (input ?? {}) as { key?: string; fieldType?: string };
      const config = configsFor((key ?? '') as UserFriendlyFieldTypeKey).find(
        (c) => c.fieldType === fieldType,
      );
      return Promise.resolve(
        config ? { resolved: config } : { error: 'No hay configuracion para ese key/fieldType.' },
      );
    },
  });

  registry.register({
    name: 'origins_set_object_fields',
    requiresGuidance: true,
    description:
      'Puebla el catalogo de campos de un objeto de un origen (alimenta los desplegables «Field name» del ' +
      'mapa editable, D2).',
    inputSchema: {
      type: 'object',
      properties: {
        originId: { type: 'string' },
        objectId: { type: 'string' },
        fields: { type: 'array', items: { type: 'string' } },
      },
      required: ['originId', 'objectId', 'fields'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { originId, objectId, fields } = (input ?? {}) as {
        originId?: string;
        objectId?: string;
        fields?: string[];
      };
      return Promise.resolve(
        deps.service.setObjectFields({
          projectId: ctx.projectId,
          originId: originId ?? '',
          objectId: objectId ?? '',
          fields: fields ?? [],
        }),
      );
    },
  });
}
