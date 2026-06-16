/**
 * Servicio de gestión de formularios (SPEC-0008). Orquesta el store local (inventario, links y
 * cambios), el conector de formularios de HubSpot y los módulos puros de cobertura y cambios.
 * Nunca aplica cambios en HubSpot sin confirmación explícita del usuario y entorno.
 */
import type {
  FormAddMissingFieldsInput,
  FormApplyChangeInput,
  FormApplyChangeResult,
  FormChange,
  FormCoverageInput,
  FormCoverageReport,
  FormCreateDefinitionInput,
  FormDiscardChangeInput,
  FormGetInput,
  FormLinkDeleteInput,
  FormLinksListInput,
  FormLinkUpsertInput,
  FormOriginLink,
  FormsListInput,
  FormsOperationResult,
  FormsSyncInput,
  FormsSyncResult,
  HubSpotForm,
} from '@shared/types/forms';
import type { PropertyEntry } from '@shared/types/properties';
import type { FormsApi } from '../connectors/hubspot/forms';
import type { FormsStore } from './store';
import { buildCoverageReport, missingItems } from './coverage';
import { buildAddFieldsChange, buildCreateFormChange, markApplied } from './pending-changes';

export interface FormServiceDeps {
  store: FormsStore;
  formsApiFor: (projectId: string) => FormsApi;
  entriesFor: (projectId: string) => PropertyEntry[];
  newId: () => string;
  now: () => string;
}

/** Extrae el mensaje útil del cuerpo de error 4xx de HubSpot. */
function hubspotErrorMessage(error: unknown): string {
  const e = error as {
    response?: { data?: { message?: string; errors?: Array<{ message?: string }> } };
    message?: string;
  };
  const data = e?.response?.data;
  if (data?.message) return data.message;
  const detail = (data?.errors ?? []).map((x) => x.message).filter(Boolean).join('; ');
  if (detail) return detail;
  return e?.message ?? 'Error en HubSpot';
}

export function createFormService(deps: FormServiceDeps) {
  function changeFactory() {
    return { newId: deps.newId, now: deps.now };
  }

  function listForms(input: FormsListInput): HubSpotForm[] {
    return deps.store.get(input.projectId).forms;
  }

  async function syncHubspot(input: FormsSyncInput): Promise<FormsSyncResult> {
    const state = deps.store.get(input.projectId);
    const api = deps.formsApiFor(input.projectId);
    const remote = await api.listForms();
    if (input.includeLegacyV2) {
      try {
        const legacy = await api.listLegacyForms();
        const known = new Set(remote.map((form) => form.id));
        remote.push(...legacy.filter((form) => !known.has(form.id)));
      } catch {
        // La API legacy v2 puede no estar disponible; el sync sigue con v3.
      }
    }
    const existingIds = new Set(state.forms.map((form) => form.id));
    let imported = 0;
    let updated = 0;
    for (const form of remote) {
      if (existingIds.has(form.id)) updated += 1;
      else imported += 1;
    }
    deps.store.set(input.projectId, { ...state, forms: remote });
    return { imported, updated };
  }

  async function getForm(input: FormGetInput): Promise<HubSpotForm> {
    const found = deps.store.get(input.projectId).forms.find((form) => form.id === input.formId);
    if (found) return found;
    return deps.formsApiFor(input.projectId).getForm(input.formId);
  }

  function listLinks(input: FormLinksListInput): FormOriginLink[] {
    return deps.store.get(input.projectId).links;
  }

  function upsertLink(input: FormLinkUpsertInput): FormOriginLink {
    const state = deps.store.get(input.projectId);
    const incoming = input.link;
    const existing = incoming.id ? state.links.find((link) => link.id === incoming.id) : undefined;
    const link: FormOriginLink = {
      id: existing?.id ?? deps.newId(),
      formId: incoming.formId,
      originIds: incoming.originIds,
      objectType: incoming.objectType,
      createdAt: existing?.createdAt ?? deps.now(),
    };
    const links = existing
      ? state.links.map((l) => (l.id === link.id ? link : l))
      : [...state.links, link];
    deps.store.set(input.projectId, { ...state, links });
    return link;
  }

  function deleteLink(input: FormLinkDeleteInput): FormsOperationResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      links: state.links.filter((link) => link.id !== input.linkId),
    });
    return { success: true };
  }

  /** Informe de cobertura por origen asociado al formulario (uno o el filtrado por originId). */
  function coverage(input: FormCoverageInput): FormCoverageReport[] {
    const state = deps.store.get(input.projectId);
    const form = state.forms.find((f) => f.id === input.formId);
    if (!form) return [];
    const entries = deps.entriesFor(input.projectId);
    const links = state.links.filter((link) => link.formId === input.formId);
    const reports: FormCoverageReport[] = [];
    for (const link of links) {
      for (const originId of link.originIds) {
        if (input.originId && originId !== input.originId) continue;
        reports.push(buildCoverageReport(form, entries, originId, link.objectType));
      }
    }
    return reports;
  }

  function createDefinition(input: FormCreateDefinitionInput): FormChange {
    const state = deps.store.get(input.projectId);
    const change = buildCreateFormChange(input.definition, changeFactory());
    deps.store.set(input.projectId, { ...state, changes: [...state.changes, change] });
    return change;
  }

  function addMissingFields(input: FormAddMissingFieldsInput): FormChange {
    const state = deps.store.get(input.projectId);
    const form = state.forms.find((f) => f.id === input.formId);
    if (!form) throw new Error('Formulario no encontrado');
    const link = state.links.find(
      (l) => l.formId === input.formId && l.originIds.includes(input.originId),
    );
    if (!link) throw new Error('El formulario no está asociado a ese origen');
    const entries = deps.entriesFor(input.projectId);
    const report = buildCoverageReport(form, entries, input.originId, link.objectType);
    const change = buildAddFieldsChange(
      form,
      link.objectType,
      missingItems(report),
      changeFactory(),
    );
    deps.store.set(input.projectId, { ...state, changes: [...state.changes, change] });
    return change;
  }

  function listPendingChanges(projectId: string): FormChange[] {
    return deps.store.get(projectId).changes;
  }

  async function applyChange(input: FormApplyChangeInput): Promise<FormApplyChangeResult> {
    const state = deps.store.get(input.projectId);
    const change = state.changes.find((c) => c.id === input.changeId);
    if (!change) return { success: false, error: 'Cambio no encontrado' };

    const api = deps.formsApiFor(input.projectId);
    let resultFormId = change.formId;
    let newLink: FormOriginLink | undefined;

    try {
      if (change.operation === 'create_form') {
        const response = await api.createForm(change.payload, input.environment);
        const data = response.data as { id?: string };
        resultFormId = data.id ?? resultFormId;
        if (resultFormId && change.createContext) {
          newLink = {
            id: deps.newId(),
            formId: resultFormId,
            originIds: change.createContext.originIds,
            objectType: change.createContext.objectType,
            createdAt: deps.now(),
          };
        }
      } else {
        if (!change.formId) return { success: false, error: 'El cambio no referencia un formulario' };
        await api.patchForm(change.formId, change.payload, input.environment);
      }
    } catch (error) {
      return { success: false, error: hubspotErrorMessage(error) };
    }

    const applied = markApplied({ ...change, formId: resultFormId }, input.environment);
    const fresh = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...fresh,
      changes: fresh.changes.map((c) => (c.id === change.id ? applied : c)),
      links: newLink ? [...fresh.links, newLink] : fresh.links,
    });
    return { success: true, formId: resultFormId };
  }

  function discardChange(input: FormDiscardChangeInput): FormsOperationResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      changes: state.changes.filter((c) => c.id !== input.changeId),
    });
    return { success: true };
  }

  return {
    listForms,
    syncHubspot,
    getForm,
    listLinks,
    upsertLink,
    deleteLink,
    coverage,
    createDefinition,
    addMissingFields,
    listPendingChanges,
    applyChange,
    discardChange,
  };
}

export type FormService = ReturnType<typeof createFormService>;
