/**
 * Tools MCP de la gestión de propiedades (SPEC-0006 §16). Incluyen lectura y edición.
 * La aplicación de cambios en HubSpot (apply) sigue exigiendo confirmación por entorno.
 */
import type { McpRegistry } from '../mcp/registry';
import { guidanceRegistry } from '../mcp/guidance';
import type { PropertyService } from './service';
import { EntryValidationError } from './entry-validation';
import { isSystemProperty } from './system-properties';
import type { EntryUpsertInput } from '@shared/types/properties';
import type { HubSpotEnvironment } from '@shared/types/hubspot';
import { USER_FRIENDLY_FIELD_TYPES } from '@shared/constants/planningFieldTypes';

const PROPERTY_GUIDANCE = `Una entrada del mapa apunta a una propiedad de HubSpot en uno de dos modos:
- "existing": la propiedad YA existe en HubSpot; la entrada solo la mapea.
- "new": la propiedad se va a CREAR; la entrada lleva su definición completa.

Casuística de bloqueo (importante): una entrada en modo "existing" que apunta a una propiedad
INEXISTENTE en HubSpot aparece con estado "missing"/"falta" pero NO genera ningún cambio pendiente.
No se crea sola. Hay que avisar al usuario y convertirla a "new".

Cómo leer properties_sync: si "blocked" > 0, el array "blockers" lista las entradas que NO se
sincronizarán por sí solas. "Cambios pendientes (0)" junto con "missing" > 0 NO significa que todo
esté en orden. Flujo correcto de remedio: properties_convert_to_new (o properties_convert_missing_to_new)
-> properties_sync -> properties_apply_change (por entorno).

Forma del "entry" en entries_upsert (obligatoria; payloads malformados se rechazan):
- "hubspotProperty" es SIEMPRE un objeto, nunca un string:
  - existente: { "mode": "existing", "hubspotName": "<nombre>" }
  - nueva:     { "mode": "new", "definition": { "hubspotName","label","type","fieldType","groupName"?, ... } }
- "sources" es un array de EntrySource (objetos), nunca strings ni "originIds":
  [ { "originId": "<id>", "sourceField": "<campo>", "definition": { "kind": "text|number|boolean|enum|memo" } } ]

Mapeo de valores origen -> opción de HubSpot (remapeo de erratas; el informe lo llama "valueMap",
pero el campo real es "definition.options"). Vive en "sources[].definition", NO en la propiedad:
- enum: "definition": { "kind": "enum", "options": [ { "sourceValue": "Spain", "hubspotValue": "España" },
  { "sourceValue": "Alumni Curso curso 15", "hubspotValue": "Alumni Curso 15" } ] }
  "sourceValue" es el valor tal como llega del origen; "hubspotValue" es el "value" de la opción ya
  corregida en HubSpot (opcional "sourceLabel"). Si se omite "hubspotValue", no se remapea.
- boolean: "definition": { "kind": "boolean", "boolean": { "truthy": "Sí", "falsy": "No" } } indica qué
  valores de origen se reciben como verdadero/falso.

Disponibilidad en formularios y chatbots: "hubspotProperty.definition.formField" (booleano opcional) controla
si la propiedad puede usarse como campo en formularios de HubSpot Y en bots/chatflows (un único flag; no hay uno
aparte para chatbots). Es tri-estado: si se omite, HubSpot aplica su default; true/false lo fija explícito. Se puede
fijar tanto al crear (mode "new") como al editar una existente (mode "existing", dentro de "definition").

Reglas del nombre interno (hubspotName): minúsculas, números y "_", empezando por letra; máx. 100
  caracteres. No truncar nombres largos a ciegas (genera colisiones); acórtalos en origen.
- Antes de crear una propiedad nueva, llama a hubspot_properties_list para tomar el "fieldType",
  "groupName" y "options" REALES de HubSpot en vez de inferirlos (p. ej. telefono -> fieldType
  "phonenumber"; multiple checkboxes -> "checkbox"). Inferir fieldType desde type produce divergencias.

Flujo completo: origins_upsert -> entries_upsert -> properties_sync -> properties_apply_change.`;

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

  guidanceRegistry.register({
    featureKey: feature,
    title: 'Propiedades: estados y sincronización',
    order: 10,
    body: PROPERTY_GUIDANCE,
  });

  registry.register({
    name: 'objects_list',
    description: 'Lista los objetos de HubSpot disponibles (estandar + custom existentes).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => service.listObjects({ projectId: ctx.projectId }),
  });

  registry.register({
    name: 'hubspot_properties_list',
    description:
      'Devuelve la DEFINICIÓN real de las propiedades de un objeto de HubSpot (HubSpotPropertyDef: type, ' +
      'fieldType, groupName, options y atributos) del entorno activo. Úsala ANTES de crear propiedades para ' +
      'tomar el fieldType/groupName/options reales y no inferirlos (evita divergencias tipo phonenumber/checkbox). ' +
      'Opcional «name» para una sola propiedad.',
    inputSchema: {
      type: 'object',
      properties: { objectType: { type: 'string' }, name: { type: 'string' } },
      required: ['objectType'],
    },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: async (input, ctx) => {
      const { objectType, name } = (input ?? {}) as { objectType?: string; name?: string };
      const defs = await service.listHubSpotProperties({
        projectId: ctx.projectId,
        objectType: objectType ?? '',
      });
      return name ? defs.filter((d) => d.hubspotName === name) : defs;
    },
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
    name: 'planning_field_types',
    description:
      'Catalogo de tipos user-friendly del mapa de campos editable (SPEC-0016 D6) y su resolucion a ' +
      'configuracion(es) de HubSpot. «ambiguous: true» = el tipo mapea a varias configs y «necesita accion» ' +
      '(el usuario debe elegir la config concreta antes de pasar a borrador).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: () =>
      Promise.resolve(
        USER_FRIENDLY_FIELD_TYPES.map((t) => ({
          key: t.key,
          configs: t.configs,
          ambiguous: t.configs.length > 1,
        })),
      ),
  });

  registry.register({
    name: 'properties_pending_changes',
    description:
      'Lista los cambios pendientes de aplicar en HubSpot, junto con los `blockers`: entradas en estado ' +
      '«falta» que NO generan cambio (modo existing apuntando a una propiedad inexistente; ver revops_guidance).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) => {
      const entries = service.listEntries({ projectId: ctx.projectId });
      const changes = entries.flatMap((entry) =>
        (entry.pendingChanges ?? []).map((change) => ({
          entry: entry.name,
          objectType: entry.objectType,
          ...change,
        })),
      );
      const blockers = entries
        .filter((e) => e.hubspotStatus === 'missing' && e.hubspotProperty.mode === 'existing')
        .map((e) => {
          const hubspotName =
            e.hubspotProperty.mode === 'existing' ? e.hubspotProperty.hubspotName : '';
          const system = isSystemProperty(e.objectType, hubspotName);
          return {
            entryId: e.id,
            entry: e.name,
            objectType: e.objectType,
            hubspotName,
            reason: system ? ('system-property' as const) : ('existing-missing-remote' as const),
            remediation: system ? ('relink' as const) : ('convert-to-new' as const),
          };
        });
      return Promise.resolve({ changes, blockers });
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
      return Promise.resolve(
        service.exportJson({ projectId: ctx.projectId, originId: originId ?? '' }),
      );
    },
  });

  registry.register({
    name: 'entries_upsert',
    description:
      'Crea o actualiza una entrada del mapa. «hubspotProperty» es un objeto (mode existing/new), NUNCA un string; ' +
      '«sources» es un array de EntrySource (objetos), nunca strings ni «originIds». Ver revops_guidance.',
    inputSchema: {
      type: 'object',
      required: ['entry'],
      properties: {
        entry: {
          type: 'object',
          required: ['objectType', 'name', 'hubspotProperty', 'sources'],
          properties: {
            id: { type: 'string', description: 'Solo para actualizar una entrada existente.' },
            objectType: { type: 'string' },
            name: { type: 'string', description: 'Etiqueta de la entrada.' },
            hubspotProperty: {
              type: 'object',
              description: 'Discriminado por «mode». Existente o nueva. NUNCA un string.',
              oneOf: [
                {
                  required: ['mode', 'hubspotName'],
                  properties: {
                    mode: { const: 'existing' },
                    hubspotName: { type: 'string' },
                    definition: {
                      type: 'object',
                      properties: {
                        formField: {
                          type: 'boolean',
                          description:
                            'Disponibilidad en formularios y bots/chatflows. Opcional (tri-estado): omitido = default de HubSpot.',
                        },
                      },
                    },
                  },
                },
                {
                  required: ['mode', 'definition'],
                  properties: {
                    mode: { const: 'new' },
                    definition: {
                      type: 'object',
                      required: ['hubspotName', 'label', 'type', 'fieldType'],
                      properties: {
                        hubspotName: { type: 'string' },
                        label: { type: 'string' },
                        type: { type: 'string' },
                        fieldType: { type: 'string' },
                        groupName: { type: 'string' },
                        formField: {
                          type: 'boolean',
                          description:
                            'Disponibilidad en formularios y bots/chatflows. Opcional (tri-estado): omitido = default de HubSpot.',
                        },
                      },
                    },
                  },
                },
              ],
            },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                required: ['originId', 'sourceField', 'definition'],
                properties: {
                  id: { type: 'string' },
                  originId: { type: 'string' },
                  originObjectId: { type: 'string' },
                  sourceField: { type: 'string' },
                  definition: {
                    type: 'object',
                    required: ['kind'],
                    properties: {
                      kind: { type: 'string', enum: ['text', 'number', 'boolean', 'enum', 'memo'] },
                    },
                  },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    requiresGuidance: true,
    handler: (input, ctx) => {
      const { entry } = (input ?? {}) as { entry: EntryUpsertInput['entry'] };
      try {
        return Promise.resolve(service.upsertEntry({ projectId: ctx.projectId, entry }));
      } catch (error) {
        // Error de validación → respuesta estructurada y accionable (SPEC-0006 §39.9), no excepción opaca.
        if (error instanceof EntryValidationError) {
          return Promise.resolve({
            error: { code: error.code, message: error.message, issues: error.issues },
          });
        }
        throw error;
      }
    },
  });

  registry.register({
    name: 'entries_delete',
    description: 'Elimina una entrada del mapa por su ID.',
    inputSchema: {
      type: 'object',
      properties: { entryId: { type: 'string' } },
      required: ['entryId'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    requiresGuidance: true,
    handler: (input, ctx) => {
      const { entryId } = (input ?? {}) as { entryId?: string };
      return Promise.resolve(
        service.deleteEntry({ projectId: ctx.projectId, entryId: entryId ?? '' }),
      );
    },
  });

  // --- Operaciones en batch (SPEC-0006 §42): un fallo por ítem no aborta el lote. ---

  registry.register({
    name: 'entries_upsert_batch',
    description:
      'Crea/actualiza VARIAS entradas en una sola llamada (misma forma de «entry» que entries_upsert). ' +
      'Devuelve { results: [{ index, ok, id?, error? }] }: un fallo por ítem no aborta el lote.',
    inputSchema: {
      type: 'object',
      required: ['entries'],
      properties: { entries: { type: 'array', items: { type: 'object' } } },
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    requiresGuidance: true,
    handler: (input, ctx) => {
      const { entries } = (input ?? {}) as { entries?: unknown[] };
      const results = (entries ?? []).map((entry, index) => {
        try {
          const saved = service.upsertEntry({
            projectId: ctx.projectId,
            entry: entry as EntryUpsertInput['entry'],
          });
          return { index, ok: true, id: saved.id };
        } catch (error) {
          if (error instanceof EntryValidationError)
            return { index, ok: false, error: { code: error.code, issues: error.issues } };
          return {
            index,
            ok: false,
            error: { message: error instanceof Error ? error.message : 'Error' },
          };
        }
      });
      return Promise.resolve({ results });
    },
  });

  registry.register({
    name: 'entries_delete_batch',
    description:
      'Elimina VARIAS entradas por sus IDs. Devuelve { results: [{ id, ok, error? }] }: un fallo por ítem no aborta el lote.',
    inputSchema: {
      type: 'object',
      required: ['entryIds'],
      properties: { entryIds: { type: 'array', items: { type: 'string' } } },
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    requiresGuidance: true,
    handler: (input, ctx) => {
      const { entryIds } = (input ?? {}) as { entryIds?: string[] };
      const results = (entryIds ?? []).map((id) => {
        const r = service.deleteEntry({ projectId: ctx.projectId, entryId: id });
        return { id, ok: r.success, error: r.error };
      });
      return Promise.resolve({ results });
    },
  });

  registry.register({
    name: 'properties_discard_changes_batch',
    requiresGuidance: true,
    description:
      'Descarta VARIOS cambios pendientes por sus IDs. Devuelve { results: [{ changeId, ok, error? }] }: ' +
      'un fallo por ítem no aborta el lote. Útil para limpiar cambios huérfanos en bloque.',
    inputSchema: {
      type: 'object',
      required: ['changeIds'],
      properties: { changeIds: { type: 'array', items: { type: 'string' } } },
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { changeIds } = (input ?? {}) as { changeIds?: string[] };
      const results = (changeIds ?? []).map((changeId) => {
        const r = service.discardChange({ projectId: ctx.projectId, changeId });
        return { changeId, ok: r.success, error: r.error };
      });
      return Promise.resolve({ results });
    },
  });

  registry.register({
    name: 'origins_upsert',
    requiresGuidance: true,
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
    requiresGuidance: true,
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
    requiresGuidance: true,
    description:
      'Crea un grupo de propiedades en un objeto de HubSpot (escritura, entorno activo).',
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
      const { objectType, name, label } = (input ?? {}) as {
        objectType: string;
        name: string;
        label: string;
      };
      return service.createGroup({ projectId: ctx.projectId, objectType, name, label });
    },
  });

  registry.register({
    name: 'properties_sync',
    description:
      'Sincroniza el estado de las entradas contra HubSpot (no escribe en HubSpot). Devuelve ' +
      '{ updated, divergent, missing, blocked, blockers }: revisa `blocked`/`blockers` para detectar ' +
      'entradas «falta» que no se crearán solas (ver revops_guidance).',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    requiresGuidance: true,
    handler: (_input, ctx) => service.syncHubspot({ projectId: ctx.projectId }),
  });

  registry.register({
    name: 'properties_convert_to_new',
    description:
      'Convierte una entrada de modo «existing» (que apunta a una propiedad inexistente) a modo «new» ' +
      'para poder crearla. Solo afecta a entradas en modo existing. La creación real requiere despues ' +
      'properties_sync + properties_apply_change (por entorno).',
    inputSchema: {
      type: 'object',
      properties: { entryId: { type: 'string' } },
      required: ['entryId'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    requiresGuidance: true,
    handler: (input, ctx) => {
      const { entryId } = (input ?? {}) as { entryId?: string };
      return Promise.resolve(
        service.convertEntryToNew({ projectId: ctx.projectId, entryId: entryId ?? '' }),
      );
    },
  });

  registry.register({
    name: 'properties_convert_missing_to_new',
    description:
      'Convierte en bloque todas las entradas en estado «falta» y modo «existing» a modo «new» ' +
      '(opcionalmente filtradas por objeto). La creación real requiere despues properties_sync + ' +
      'properties_apply_change (por entorno).',
    inputSchema: { type: 'object', properties: { objectType: { type: 'string' } } },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    requiresGuidance: true,
    handler: (input, ctx) => {
      const { objectType } = (input ?? {}) as { objectType?: string };
      return Promise.resolve(service.convertMissingToNew({ projectId: ctx.projectId, objectType }));
    },
  });

  registry.register({
    name: 'properties_apply_change',
    requiresGuidance: true,
    description:
      'Aplica un cambio pendiente en HubSpot en el entorno indicado (sandbox o production).',
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
    requiresGuidance: true,
    description: 'Descarta un cambio pendiente del proyecto.',
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
    name: 'properties_request_delete',
    requiresGuidance: true,
    description:
      'Solicita ARCHIVAR (borrado logico, recuperable) la propiedad destino de una entrada en HubSpot. ' +
      'No borra al instante: genera un cambio pendiente `delete` que aparece tras properties_sync y se ejecuta ' +
      'solo al aplicarlo por entorno con properties_apply_change (sandbox/production). Para cancelarlo, descartar el cambio.',
    inputSchema: {
      type: 'object',
      properties: { entryId: { type: 'string' } },
      required: ['entryId'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { entryId } = (input ?? {}) as { entryId?: string };
      return Promise.resolve(
        service.requestDelete({ projectId: ctx.projectId, entryId: entryId ?? '' }),
      );
    },
  });

  registry.register({
    name: 'properties_groups_request_delete',
    requiresGuidance: true,
    description:
      'Solicita BORRAR (archivado PERMANENTE) un grupo de propiedades en HubSpot. DESTRUCTIVO. ' +
      'No borra al instante: genera un cambio pendiente de grupo que se ejecuta solo al aplicarlo por entorno ' +
      'con properties_groups_apply_change (sandbox/production). Al aplicarlo, el grupo debe estar VACÍO o se rechaza. ' +
      'Para cancelarlo, usar properties_groups_discard_change.',
    inputSchema: {
      type: 'object',
      properties: {
        objectType: { type: 'string' },
        groupName: { type: 'string' },
        label: { type: 'string' },
      },
      required: ['objectType', 'groupName'],
    },
    featureKey: feature,
    requiredScopes: WRITE_SCOPES,
    handler: (input, ctx) => {
      const { objectType, groupName, label } = (input ?? {}) as {
        objectType?: string;
        groupName?: string;
        label?: string;
      };
      return Promise.resolve(
        service.requestGroupDelete({
          projectId: ctx.projectId,
          objectType: objectType ?? '',
          groupName: groupName ?? '',
          label,
        }),
      );
    },
  });

  registry.register({
    name: 'properties_group_pending_changes',
    description: 'Lista los borrados de grupo pendientes del proyecto.',
    inputSchema: { type: 'object', properties: {} },
    featureKey: feature,
    requiredScopes: SCOPES,
    handler: (_input, ctx) =>
      Promise.resolve(service.listGroupChanges({ projectId: ctx.projectId })),
  });

  registry.register({
    name: 'properties_groups_apply_change',
    requiresGuidance: true,
    description:
      'Aplica un borrado de grupo pendiente en el entorno indicado (sandbox o production). DESTRUCTIVO. ' +
      'Rechaza si el grupo no está vacío.',
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
      return service.applyGroupChange({ projectId: ctx.projectId, changeId, environment });
    },
  });

  registry.register({
    name: 'properties_groups_discard_change',
    requiresGuidance: true,
    description: 'Descarta un borrado de grupo pendiente del proyecto.',
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
        service.discardGroupChange({ projectId: ctx.projectId, changeId: changeId ?? '' }),
      );
    },
  });
}
