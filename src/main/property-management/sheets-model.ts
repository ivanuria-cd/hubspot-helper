/**
 * Construcción del modelo del Google Sheets de gestión de propiedades (SPEC-0006 §4).
 * Diseño cerrado por versión de esquema (schema_version: 1): cuatro hojas, columnas fijas.
 * Módulo puro y testeable; el writer real lo vuelca con la Sheets API.
 */
import type {
  DataOrigin,
  HubSpotProperty,
  PropertyOriginMapping,
  TransformationRule,
} from '@shared/types/properties';

export const SHEETS_SCHEMA_VERSION = 1;

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

export interface SheetsModel {
  schemaVersion: number;
  tabs: SheetTab[];
}

export interface SheetsModelInput {
  projectName: string;
  origins: DataOrigin[];
  properties: HubSpotProperty[];
  mappings: PropertyOriginMapping[];
  generatedAt: string;
}

const ORIGIN_TYPE_LABEL: Record<DataOrigin['type'], string> = {
  integration: 'Integración',
  migration: 'Migración',
  user: 'Usuario',
  workflow: 'Workflow',
};

const STATUS_LABEL: Record<HubSpotProperty['hubspotStatus'], string> = {
  exists: 'exists',
  divergent: 'divergent',
  missing: 'missing',
};

function buildCoverTab(input: SheetsModelInput): SheetTab {
  return {
    title: '00_Portada',
    rows: [
      ['Mapa de Propiedades — Cloud District'],
      [`Proyecto: ${input.projectName}`],
      [`schema_version: ${SHEETS_SCHEMA_VERSION}`],
      [`Generado por RevOps Assistant: ${input.generatedAt}`],
      [],
      ['Qué es este archivo'],
      [
        'Fuente de verdad compartida del mapa de propiedades de HubSpot del proyecto: orígenes de datos, propiedades y sus mapeos con reglas de transformación.',
      ],
      [],
      ['Cómo usarlo'],
      [
        'La app lee este archivo al abrirse y escribe en él ante cualquier cambio. Edita solo las columnas marcadas como editables; el resto las gestiona la app.',
      ],
      [],
      ['Columnas editables vs. gestionadas'],
      ['01_Origenes', 'Editable: Nombre, Tipo, Descripción. Gestionado: ID, Fecha de creación.'],
      [
        '02_Propiedades',
        'Editable: Etiqueta, Descripción. Gestionado: el resto (sincronizado con HubSpot).',
      ],
      ['03_Mapeo_Origenes', 'Editable: Campo origen, Transformaciones, Notas. Gestionado: el resto.'],
      [],
      [
        '— Generado por RevOps Assistant (Cloud District). No edites las zonas gestionadas: la app las regenera en cada sincronización. —',
      ],
    ],
  };
}

function buildOriginsTab(origins: DataOrigin[]): SheetTab {
  const header = ['ID', 'Nombre', 'Tipo', 'Descripción', 'Fecha de creación'];
  const rows = origins.map((origin) => [
    origin.id,
    origin.name,
    ORIGIN_TYPE_LABEL[origin.type],
    origin.description ?? '',
    origin.createdAt,
  ]);
  return { title: '01_Origenes', rows: [header, ...rows] };
}

function renderOptions(property: HubSpotProperty): string {
  if (!property.options?.length) return '';
  return property.options.map((option) => `${option.label} (${option.value})`).join('; ');
}

function renderPendingChanges(property: HubSpotProperty): string {
  if (!property.pendingChanges?.length) return '';
  return property.pendingChanges.map((change) => change.summary).join(' · ');
}

function buildPropertiesTab(
  properties: HubSpotProperty[],
  origins: DataOrigin[],
  mappings: PropertyOriginMapping[],
): SheetTab {
  const header = [
    'ID',
    'Nombre HubSpot',
    'Etiqueta',
    'Objeto',
    'Tipo',
    'Personalizada',
    'Grupo',
    'Opciones',
    'Descripción',
    'Estado HubSpot',
    'Cambios pendientes',
    'Orígenes',
  ];
  const originName = new Map(origins.map((origin) => [origin.id, origin.name]));
  const rows = properties.map((property) => {
    const propOrigins = mappings
      .filter((mapping) => mapping.propertyId === property.id)
      .map((mapping) => originName.get(mapping.originId) ?? mapping.originId)
      .join(', ');
    return [
      property.id,
      property.hubspotName,
      property.label,
      property.objectType,
      property.type,
      property.isCustom ? 'Sí' : 'No',
      property.groupName,
      renderOptions(property),
      property.description ?? '',
      STATUS_LABEL[property.hubspotStatus],
      renderPendingChanges(property),
      propOrigins,
    ];
  });
  return { title: '02_Propiedades', rows: [header, ...rows] };
}

function renderTransformations(rules: TransformationRule[]): string {
  if (!rules.length) return '';
  return JSON.stringify(rules.map((rule) => ({ [rule.sourceValue]: rule.targetValue })));
}

function buildMappingTab(
  mappings: PropertyOriginMapping[],
  properties: HubSpotProperty[],
  origins: DataOrigin[],
): SheetTab {
  const header = ['ID', 'Propiedad (nombre HubSpot)', 'Origen', 'Campo origen', 'Transformaciones', 'Notas'];
  const propName = new Map(properties.map((property) => [property.id, property.hubspotName]));
  const originName = new Map(origins.map((origin) => [origin.id, origin.name]));
  const rows = mappings.map((mapping) => [
    mapping.id,
    propName.get(mapping.propertyId) ?? mapping.propertyId,
    originName.get(mapping.originId) ?? mapping.originId,
    mapping.sourceField,
    renderTransformations(mapping.transformations),
    mapping.notes ?? '',
  ]);
  return { title: '03_Mapeo_Origenes', rows: [header, ...rows] };
}

export function buildSheetsModel(input: SheetsModelInput): SheetsModel {
  return {
    schemaVersion: SHEETS_SCHEMA_VERSION,
    tabs: [
      buildCoverTab(input),
      buildOriginsTab(input.origins),
      buildPropertiesTab(input.properties, input.origins, input.mappings),
      buildMappingTab(input.mappings, input.properties, input.origins),
    ],
  };
}
