/**
 * Builder del Google Sheets de formularios (SPEC-0008 §8.7). Cuatro hojas: Portada, Formularios,
 * Asociaciones y Cobertura. Es puro (sin dependencias de Drive) para poder testearlo. Las erratas
 * en nombres/claves se reflejan tal cual (no se corrigen) — SPEC-0000.
 */
import type { FormCoverageReport, FormOriginLink, HubSpotForm } from '@shared/types/forms';
import type { DataOrigin } from '@shared/types/properties';

export const FORMS_SHEETS_SCHEMA_VERSION = 1;
export const FORMS_FEATURE_KEY = 'forms-management';

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

export function buildFormsTabs(
  forms: HubSpotForm[],
  links: FormOriginLink[],
  reports: FormCoverageReport[],
  origins: DataOrigin[],
  generatedAt = '',
): SheetTab[] {
  const formName = new Map(forms.map((form) => [form.id, form.name]));
  const originName = new Map(origins.map((origin) => [origin.id, origin.name]));

  const portada: SheetTab = {
    title: '00_Portada',
    rows: [
      ['RevOps Assistant — Formularios HubSpot'],
      ['schema_version', FORMS_SHEETS_SCHEMA_VERSION],
      ['Generado', generatedAt],
      [],
      ['Hoja generada por RevOps Assistant. No edites las zonas de datos: se regeneran en cada volcado.'],
      ['Formularios', forms.length],
      ['Asociaciones', links.length],
    ],
  };

  const formularios: SheetTab = {
    title: '01_Formularios',
    rows: [
      ['ID', 'Nombre', 'Tipo', 'Archivado', 'Objetos', 'Nº campos', 'Actualizado'],
      ...forms.map((form) => [
        form.id,
        form.name,
        form.formType,
        form.archived,
        form.objectTypes.join(', '),
        form.fieldGroups.reduce((total, group) => total + group.fields.length, 0),
        form.updatedAt,
      ]),
    ],
  };

  const asociaciones: SheetTab = {
    title: '02_Asociaciones',
    rows: [
      ['ID', 'Formulario', 'Objeto', 'Orígenes'],
      ...links.map((link) => [
        link.id,
        formName.get(link.formId) ?? link.formId,
        link.objectType,
        link.originIds.map((id) => originName.get(id) ?? id).join(', '),
      ]),
    ],
  };

  const cobertura: SheetTab = {
    title: '03_Cobertura',
    rows: [
      ['Formulario', 'Origen', 'Objeto', 'Esperados', 'Presentes', 'Faltan'],
      ...reports.map((report) => [
        formName.get(report.formId) ?? report.formId,
        originName.get(report.originId) ?? report.originId,
        report.objectType,
        report.expected,
        report.present,
        report.missing,
      ]),
    ],
  };

  return [portada, formularios, asociaciones, cobertura];
}
