/**
 * Escritura de los documentos companion de Drive por feature (SPEC-0004 §21: par Sheets+estado
 * atómico) y features de refresco (SPEC-0004 §19). Extraído de `index.ts` (SPEC-0002 §23).
 */
import type { GoogleDriveConnector } from './connectors/google-drive';
import type { PropertyService } from './property-management/service';
import type { CustomObjectService } from './custom-objects/service';
import type { FormService } from './forms-management/service';
import type { DriveDocMeta } from '@shared/types/gdrive';
import type { SheetTab } from './connectors/google-drive/sheets-client';
import type { RefreshFeature } from './drive-refresh';
import {
  buildPropertyMapTabs,
  PROPERTY_MAP_FEATURE_KEY,
  SHEETS_SCHEMA_VERSION,
} from './property-management/sheets-model';
import {
  buildPlanningWorkbook,
  PLANNING_MAP_FEATURE_KEY,
  PLANNING_SCHEMA_VERSION,
} from './property-management/planning-model';
import {
  buildDraftEntries,
  ingestPlanning,
  parsePlanningTabs,
  type PlanningResolution,
} from './property-management/planning-import';
import {
  PROPERTY_STATE_FEATURE_KEY,
  serializePropertyState,
} from './property-management/drive-state';
import {
  buildCustomObjectsTabs,
  CUSTOM_OBJECTS_FEATURE_KEY,
  CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION,
} from './custom-objects/sheets-model';
import {
  CUSTOM_OBJECTS_STATE_FEATURE_KEY,
  serializeCustomObjectsState,
} from './custom-objects/drive-state';
import {
  buildFormsTabs,
  FORMS_FEATURE_KEY,
  FORMS_SHEETS_SCHEMA_VERSION,
} from './forms-management/sheets-model';
import { FORMS_STATE_FEATURE_KEY, serializeFormsState } from './forms-management/drive-state';

export interface DriveDocsDeps {
  gdrive: GoogleDriveConnector;
  properties: PropertyService;
  customObjects: CustomObjectService;
  forms: FormService;
}

export function createDriveDocs(deps: DriveDocsDeps) {
  const { gdrive, properties, customObjects, forms } = deps;

  function managedSpreadsheetId(projectId: string, featureKey: string): string | null {
    const config = gdrive.getStatus(projectId);
    const file = (config?.files ?? []).find((f) => f.featureKey === featureKey);
    return file?.driveId ?? null;
  }

  const isDriveDocStale = (meta: DriveDocMeta, fileId: string | null): boolean =>
    fileId === null ||
    meta.lastWrittenAt === null ||
    (meta.lastChangedAt !== null && meta.lastChangedAt > meta.lastWrittenAt);

  /**
   * SPEC-0002 §32.2: patrón común de escritura Sheets + Doc de estado atómico (SPEC-0004 §21).
   * `buildTabs` y `serializeState` van separados porque en propiedades difieren (§37.6-A).
   */
  async function writeSheetsWithState(config: {
    projectId: string;
    name: string;
    featureKey: string;
    schemaVersion: number;
    buildTabs: () => Promise<SheetTab[]> | SheetTab[];
    stateFeatureKey: string;
    serializeState: () => string;
    markWritten: () => void;
  }) {
    const tabs = await config.buildTabs();
    const result = await gdrive.writeSpreadsheet({
      projectId: config.projectId,
      name: config.name,
      featureKey: config.featureKey,
      schemaVersion: config.schemaVersion,
      tabs,
    });
    if (result.success) {
      const stateWrite = await gdrive.writeFile({
        projectId: config.projectId,
        featureKey: config.stateFeatureKey,
        content: config.serializeState(),
      });
      if (!stateWrite.success) {
        return {
          success: false,
          error: stateWrite.error ?? 'No se pudo escribir el documento de estado en Drive.',
        };
      }
      config.markWritten();
    }
    return result;
  }

  async function writePropertiesSheets(projectId: string) {
    const entries = properties.listEntries({ projectId });
    const origins = properties.listOrigins({ projectId });
    return writeSheetsWithState({
      projectId,
      name: 'Mapa de propiedades CRM',
      featureKey: PROPERTY_MAP_FEATURE_KEY,
      schemaVersion: SHEETS_SCHEMA_VERSION,
      // SPEC-0006 §37.6-A: el Sheets visible representa SOLO Producción (reconciliado bajo demanda);
      // el estado companion conserva las entries del entorno activo para un round-trip fiel.
      buildTabs: async () =>
        buildPropertyMapTabs(
          await properties.productionView({ projectId }),
          origins,
          new Date().toISOString(),
        ),
      stateFeatureKey: PROPERTY_STATE_FEATURE_KEY,
      serializeState: () => serializePropertyState({ entries, origins }),
      markWritten: () => properties.markDriveWritten({ projectId }),
    });
  }

  async function writeCustomObjectsSheets(projectId: string) {
    const objects = customObjects.listDefinitions({ projectId });
    return writeSheetsWithState({
      projectId,
      name: 'Objetos custom',
      featureKey: CUSTOM_OBJECTS_FEATURE_KEY,
      schemaVersion: CUSTOM_OBJECTS_SHEETS_SCHEMA_VERSION,
      buildTabs: () => buildCustomObjectsTabs(objects, new Date().toISOString()),
      stateFeatureKey: CUSTOM_OBJECTS_STATE_FEATURE_KEY,
      serializeState: () => serializeCustomObjectsState({ objects }),
      markWritten: () => customObjects.markDriveWritten({ projectId }),
    });
  }

  async function writeFormsSheets(projectId: string) {
    const formsList = forms.listForms({ projectId });
    const links = forms.listLinks({ projectId });
    return writeSheetsWithState({
      projectId,
      name: 'Formularios HubSpot',
      featureKey: FORMS_FEATURE_KEY,
      schemaVersion: FORMS_SHEETS_SCHEMA_VERSION,
      buildTabs: () =>
        buildFormsTabs(
          formsList,
          links,
          formsList.flatMap((form) => forms.coverage({ projectId, formId: form.id })),
          properties.listOrigins({ projectId }),
          new Date().toISOString(),
        ),
      stateFeatureKey: FORMS_STATE_FEATURE_KEY,
      serializeState: () => serializeFormsState({ forms: formsList, links }),
      markWritten: () => forms.markDriveWritten({ projectId }),
    });
  }

  /**
   * Escribe el mapa de campos editable (SPEC-0016). Documento propio (PLANNING_MAP_FEATURE_KEY),
   * editable y sin proteccion. No escribe el Doc de estado companion (se conserva vía la ruta del
   * export; §2.7). La sustitucion del export legible se aborda en la fase de deprecacion.
   */
  async function writePlanningMap(projectId: string) {
    const entries = properties.listEntries({ projectId });
    const origins = properties.listOrigins({ projectId });
    const workbook = buildPlanningWorkbook({ entries, origins });
    return gdrive.writePlanningWorkbook({
      projectId,
      name: 'Mapa de campos (planificacion)',
      featureKey: PLANNING_MAP_FEATURE_KEY,
      schemaVersion: PLANNING_SCHEMA_VERSION,
      workbook,
    });
  }

  /** Ingest (SPEC-0016 §2.6): lee el mapa editable y devuelve el changelog SIN crear borradores. */
  async function importPlanningMap(projectId: string) {
    const tabs = await gdrive.readPlanningWorkbookTabs(projectId, PLANNING_MAP_FEATURE_KEY);
    const entries = properties.listEntries({ projectId });
    const origins = properties.listOrigins({ projectId });
    return { success: true as const, changelog: ingestPlanning(tabs, { entries, origins }) };
  }

  /**
   * Apply del ingest (SPEC-0016 §2.6): tras confirmar el changelog, crea/actualiza borradores. Los
   * tipos ambiguos sin resolver quedan en `blocked` (no se crean). No aplica cambios en HubSpot.
   */
  async function applyPlanningImport(projectId: string, resolutions: PlanningResolution[]) {
    const tabs = await gdrive.readPlanningWorkbookTabs(projectId, PLANNING_MAP_FEATURE_KEY);
    const entries = properties.listEntries({ projectId });
    const origins = properties.listOrigins({ projectId });
    const parsed = parsePlanningTabs(tabs, origins);
    const { drafts, blocked } = buildDraftEntries(parsed, { entries, origins }, resolutions);
    for (const entry of drafts) {
      properties.upsertEntry({ projectId, entry });
    }
    await writePropertyState(projectId);
    return { success: true as const, applied: drafts.length, blocked };
  }

  /**
   * Escribe SOLO el Doc de estado companion (JSON) de propiedades (SPEC-0016 §2.7): el mapa editable
   * sustituye al export legible, así que el estado se persiste «casi solo» (best-effort, sin acción
   * manual) — lo dispara el refresco al abrir (las mutaciones marcan `lastChangedAt`) y la ingest.
   */
  async function writePropertyState(projectId: string) {
    const entries = properties.listEntries({ projectId });
    const origins = properties.listOrigins({ projectId });
    const result = await gdrive.writeFile({
      projectId,
      featureKey: PROPERTY_STATE_FEATURE_KEY,
      content: serializePropertyState({ entries, origins }),
    });
    if (result.success) properties.markDriveWritten({ projectId });
    return result;
  }

  const buildRefreshFeatures = (projectId: string): RefreshFeature[] => [
    {
      // SPEC-0016 §2.7: el export legible se retira; el refresco auto-persiste el Doc de estado JSON.
      featureKey: PROPERTY_STATE_FEATURE_KEY,
      name: 'Estado del mapa de propiedades',
      hasData: () => properties.listEntries({ projectId }).length > 0,
      isStale: () =>
        isDriveDocStale(
          properties.getDriveMeta({ projectId }),
          managedSpreadsheetId(projectId, PROPERTY_STATE_FEATURE_KEY),
        ),
      write: () => writePropertyState(projectId),
    },
    {
      featureKey: CUSTOM_OBJECTS_FEATURE_KEY,
      name: 'Objetos custom',
      hasData: () => customObjects.listDefinitions({ projectId }).length > 0,
      isStale: () =>
        isDriveDocStale(
          customObjects.getDriveMeta({ projectId }),
          managedSpreadsheetId(projectId, CUSTOM_OBJECTS_FEATURE_KEY),
        ),
      write: () => writeCustomObjectsSheets(projectId),
    },
    {
      featureKey: FORMS_FEATURE_KEY,
      name: 'Formularios HubSpot',
      hasData: () => forms.listForms({ projectId }).length > 0,
      isStale: () =>
        isDriveDocStale(
          forms.getDriveMeta({ projectId }),
          managedSpreadsheetId(projectId, FORMS_FEATURE_KEY),
        ),
      write: () => writeFormsSheets(projectId),
    },
  ];

  return {
    managedSpreadsheetId,
    writePropertiesSheets,
    writePlanningMap,
    importPlanningMap,
    applyPlanningImport,
    writeCustomObjectsSheets,
    writeFormsSheets,
    buildRefreshFeatures,
  };
}

export type DriveDocs = ReturnType<typeof createDriveDocs>;
