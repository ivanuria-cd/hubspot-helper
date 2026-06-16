/**
 * Cálculo puro de la cobertura de un formulario frente a un origen (SPEC-0008 §3).
 * Compara los campos presentes en el formulario (por `objectType` + `name`) contra el
 * conjunto de propiedades destino que el origen aporta para el objeto del formulario.
 * Reutiliza las `PropertyEntry` de SPEC-0006 sin modificarlas.
 */
import type { FieldCoverageItem, FormCoverageReport, HubSpotForm } from '@shared/types/forms';
import type { PropertyEntry } from '@shared/types/properties';
import { objectTypeFromId } from '../connectors/hubspot/forms';
import { mapPropertyFieldTypeToForm } from './field-map';

function entryDestName(entry: PropertyEntry): string {
  return entry.hubspotProperty.mode === 'existing'
    ? entry.hubspotProperty.hubspotName
    : entry.hubspotProperty.definition.hubspotName;
}

function entryDefinition(entry: PropertyEntry) {
  return entry.hubspotProperty.definition;
}

/** Propiedades destino que un origen aporta para un objeto, derivadas de las entradas. */
export function expectedProperties(
  entries: PropertyEntry[],
  originId: string,
  objectType: string,
): FieldCoverageItem[] {
  return entries
    .filter(
      (entry) =>
        entry.objectType === objectType &&
        entry.sources.some((source) => source.originId === originId),
    )
    .map((entry) => {
      const hubspotName = entryDestName(entry);
      const def = entryDefinition(entry);
      const { formFieldType } = mapPropertyFieldTypeToForm(def?.fieldType ?? '', {
        propertyName: hubspotName,
      });
      return {
        hubspotName,
        label: def?.label ?? entry.name,
        objectType,
        fieldType: formFieldType,
        status: 'missing' as const,
      };
    });
}

/** Conjunto de nombres de propiedad presentes en el formulario para un objeto. */
export function presentFieldNames(form: HubSpotForm, objectType: string): Set<string> {
  const names = form.fieldGroups
    .flatMap((group) => group.fields)
    .filter((field) => objectTypeFromId(field.objectTypeId) === objectType)
    .map((field) => field.name);
  return new Set(names);
}

export function buildCoverageReport(
  form: HubSpotForm,
  entries: PropertyEntry[],
  originId: string,
  objectType: string,
): FormCoverageReport {
  const present = presentFieldNames(form, objectType);
  const items: FieldCoverageItem[] = expectedProperties(entries, originId, objectType).map(
    (item) => ({ ...item, status: present.has(item.hubspotName) ? 'present' : 'missing' }),
  );
  const presentCount = items.filter((item) => item.status === 'present').length;
  return {
    formId: form.id,
    originId,
    objectType,
    expected: items.length,
    present: presentCount,
    missing: items.length - presentCount,
    items,
  };
}

/** Items que faltan (status `missing`) de un informe de cobertura. */
export function missingItems(report: FormCoverageReport): FieldCoverageItem[] {
  return report.items.filter((item) => item.status === 'missing');
}
