/**
 * Acceso a la Marketing Forms API v3 de HubSpot (SPEC-0008).
 * Ref: https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms (cuenta clouddistrict)
 * Path base: `/marketing/v3/forms`. Se apoya en el `request()` genérico del conector (SPEC-0003).
 * La importación legacy (v2, solo lectura) usa `/forms/v2/forms` como fallback opcional.
 */
import type {
  FormField,
  FormFieldGroup,
  HubSpotForm,
  HubSpotFormType,
} from '@shared/types/forms';
import type { HubSpotEnvironment, HubSpotResponse } from '@shared/types/hubspot';
import type { HubSpotRequester } from './properties';

const BASE = '/marketing/v3/forms';
const LEGACY = '/forms/v2/forms';

/**
 * Tabla de equivalencia objectType (SPEC-0006) ↔ objectTypeId (formularios HubSpot).
 * Los objetos custom usan su propio id `2-XXXXXX`, que no figura aquí: para ellos se
 * conserva el objectTypeId verbatim cuando no hay equivalencia estándar.
 */
export const OBJECT_TYPE_TO_ID: Record<string, string> = {
  contacts: '0-1',
  companies: '0-2',
  deals: '0-3',
  tickets: '0-5',
  products: '0-7',
  line_items: '0-8',
  quotes: '0-14',
};

const ID_TO_OBJECT_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(OBJECT_TYPE_TO_ID).map(([objectType, id]) => [id, objectType]),
);

/** objectType → objectTypeId. Si no hay equivalencia (custom), devuelve el valor recibido. */
export function objectTypeToId(objectType: string): string {
  return OBJECT_TYPE_TO_ID[objectType] ?? objectType;
}

/** objectTypeId → objectType. Si no hay equivalencia (custom), devuelve el id recibido. */
export function objectTypeFromId(objectTypeId: string): string {
  return ID_TO_OBJECT_TYPE[objectTypeId] ?? objectTypeId;
}

interface RawField {
  objectTypeId?: string;
  name?: string;
  label?: string;
  fieldType?: string;
  required?: boolean;
  hidden?: boolean;
}

interface RawFieldGroup {
  fields?: RawField[];
  richText?: string;
  richTextType?: string;
}

interface RawForm {
  id?: string;
  name?: string;
  formType?: string;
  archived?: boolean;
  fieldGroups?: RawFieldGroup[];
  updatedAt?: string;
}

function normalizeField(raw: RawField): FormField {
  return {
    objectTypeId: raw.objectTypeId ?? '',
    name: raw.name ?? '',
    label: raw.label ?? '',
    fieldType: raw.fieldType ?? '',
    required: raw.required ?? false,
    hidden: raw.hidden ?? false,
  };
}

function normalizeGroup(raw: RawFieldGroup): FormFieldGroup {
  return {
    fields: (raw.fields ?? []).map(normalizeField),
    richText: raw.richText,
  };
}

/** Normaliza un formulario de HubSpot y estampa los derivados `objectTypes`/`fieldNames`. */
export function toHubSpotForm(raw: RawForm): HubSpotForm {
  const fieldGroups = (raw.fieldGroups ?? []).map(normalizeGroup);
  const fields = fieldGroups.flatMap((group) => group.fields);
  const objectTypes = Array.from(
    new Set(fields.map((field) => objectTypeFromId(field.objectTypeId)).filter(Boolean)),
  );
  const fieldNames = Array.from(new Set(fields.map((field) => field.name).filter(Boolean)));
  return {
    id: raw.id ?? '',
    name: raw.name ?? '',
    formType: (raw.formType as HubSpotFormType) ?? 'hubspot',
    archived: raw.archived ?? false,
    fieldGroups,
    updatedAt: raw.updatedAt ?? '',
    objectTypes,
    fieldNames,
  };
}

export interface ListFormsParams {
  formTypes?: HubSpotFormType[];
  archived?: boolean;
  limit?: number;
}

export interface FormsApiDeps {
  request: HubSpotRequester;
  projectId: string;
}

export function createFormsApi(deps: FormsApiDeps) {
  /** Lista todos los formularios v3 paginando hasta agotar `paging.next.after`. */
  async function listForms(
    params: ListFormsParams = {},
    environment?: HubSpotEnvironment,
  ): Promise<HubSpotForm[]> {
    const forms: HubSpotForm[] = [];
    let after: string | undefined;
    do {
      const response = await deps.request({
        projectId: deps.projectId,
        environment,
        method: 'GET',
        path: BASE,
        params: {
          limit: params.limit ?? 100,
          ...(params.archived !== undefined ? { archived: params.archived } : {}),
          ...(params.formTypes?.length ? { formTypes: params.formTypes.join(',') } : {}),
          ...(after ? { after } : {}),
        },
      });
      const data = response.data as {
        results?: RawForm[];
        paging?: { next?: { after?: string } };
      };
      forms.push(...(data.results ?? []).map(toHubSpotForm));
      after = data.paging?.next?.after;
    } while (after);
    return forms;
  }

  async function getForm(formId: string, environment?: HubSpotEnvironment): Promise<HubSpotForm> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'GET',
      path: `${BASE}/${formId}`,
    });
    return toHubSpotForm(response.data as RawForm);
  }

  function createForm(payload: unknown, environment: HubSpotEnvironment): Promise<HubSpotResponse> {
    return deps.request({
      projectId: deps.projectId,
      environment,
      method: 'POST',
      path: BASE,
      body: payload,
    });
  }

  function patchForm(
    formId: string,
    payload: unknown,
    environment: HubSpotEnvironment,
  ): Promise<HubSpotResponse> {
    return deps.request({
      projectId: deps.projectId,
      environment,
      method: 'PATCH',
      path: `${BASE}/${formId}`,
      body: payload,
    });
  }

  /** Importación legacy v2 (solo lectura): formularios muy antiguos que no aparecen en v3. */
  async function listLegacyForms(environment?: HubSpotEnvironment): Promise<HubSpotForm[]> {
    const response = await deps.request({
      projectId: deps.projectId,
      environment,
      method: 'GET',
      path: LEGACY,
    });
    const data = response.data as RawForm[] | { results?: RawForm[] };
    const raw = Array.isArray(data) ? data : (data.results ?? []);
    return raw.map(toHubSpotForm);
  }

  return { listForms, getForm, createForm, patchForm, listLegacyForms };
}

export type FormsApi = ReturnType<typeof createFormsApi>;
