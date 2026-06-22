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
  FormEditPendingChangeInput,
  FormUpdateDefinitionInput,
  HubSpotForm,
} from '@shared/types/forms';
import type { DataOrigin, PropertyEntry } from '@shared/types/properties';
import type { DriveDocMeta } from '@shared/types/gdrive';
import type { SubscriptionType } from '@shared/types/forms';
import type { FormsApi } from '../connectors/hubspot/forms';
import type { SubscriptionsApi } from '../connectors/hubspot/subscriptions';
import type { FormsStore } from './store';
import type { FormsDriveState } from './drive-state';
import { buildCoverageReport, missingItems } from './coverage';
import {
  applyEditsToFormPayload,
  buildAddFieldsChange,
  buildCreateFormChange,
  buildUpdateFormChange,
  consentMissingRequired,
  enforceGroupSize,
  ensureRequiredFormFields,
  formPayloadFieldCount,
  markApplied,
  mergeConsentTemplate,
} from './pending-changes';

export interface FormServiceDeps {
  store: FormsStore;
  formsApiFor: (projectId: string) => FormsApi;
  subscriptionsApiFor: (projectId: string) => SubscriptionsApi;
  entriesFor: (projectId: string) => PropertyEntry[];
  originsFor: (projectId: string) => DataOrigin[];
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
  const isoNow = deps.now;

  function changeFactory() {
    return { newId: deps.newId, now: deps.now };
  }

  function markChanged(projectId: string): void {
    const timestamps = deps.store.getTimestamps(projectId);
    deps.store.setTimestamps(projectId, { ...timestamps, lastChangedAt: isoNow() });
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
    markChanged(input.projectId);
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
    markChanged(input.projectId);
    return link;
  }

  function deleteLink(input: FormLinkDeleteInput): FormsOperationResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      links: state.links.filter((link) => link.id !== input.linkId),
    });
    markChanged(input.projectId);
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

  /** Valida que cada originId exista en los orígenes del proyecto (SPEC-0006, §22). */
  function assertOriginsExist(projectId: string, originIds: string[] | undefined): void {
    if (!originIds || originIds.length === 0) return;
    const known = new Set(deps.originsFor(projectId).map((origin) => origin.id));
    const unknown = originIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new Error(`Origen(es) inexistente(s): ${unknown.join(', ')}`);
    }
  }

  function createDefinition(input: FormCreateDefinitionInput): FormChange {
    assertOriginsExist(input.projectId, input.definition?.originIds);
    const state = deps.store.get(input.projectId);
    const change = buildCreateFormChange(input.definition, changeFactory());
    deps.store.set(input.projectId, { ...state, changes: [...state.changes, change] });
    markChanged(input.projectId);
    return change;
  }

  /** Prepara un cambio `update_form` a partir del formulario actual y las ediciones (§21). */
  function updateDefinition(input: FormUpdateDefinitionInput): FormChange {
    const state = deps.store.get(input.projectId);
    const form = state.forms.find((f) => f.id === input.formId);
    if (!form) throw new Error('Formulario no encontrado');
    const change = buildUpdateFormChange(form, input.edits ?? {}, changeFactory());
    deps.store.set(input.projectId, { ...state, changes: [...state.changes, change] });
    markChanged(input.projectId);
    return change;
  }

  /** Edita el payload (y, en create_form, los orígenes) de un cambio pendiente no aplicado (§23). */
  function updatePendingChange(input: FormEditPendingChangeInput): FormChange {
    const state = deps.store.get(input.projectId);
    const change = state.changes.find((c) => c.id === input.changeId);
    if (!change) throw new Error('Cambio no encontrado');
    if (change.appliedToSandbox || change.appliedToProduction) {
      throw new Error('No se puede editar un cambio ya aplicado; descártalo y recréalo.');
    }
    const isAddFields = change.operation === 'add_fields';
    const base = (change.payload ?? {}) as Record<string, unknown>;
    const newPayload = applyEditsToFormPayload(base, input.edits ?? {}, { isAddFields });

    let createContext = change.createContext;
    if (change.operation === 'create_form' && input.originIds) {
      assertOriginsExist(input.projectId, input.originIds);
      createContext = {
        originIds: input.originIds,
        objectType: change.createContext?.objectType ?? 'contacts',
      };
    }

    const count = formPayloadFieldCount(newPayload);
    const name = String(newPayload.name ?? '');
    const summary =
      change.operation === 'add_fields'
        ? `Añadir ${count} campo(s) al formulario`
        : `${change.operation === 'create_form' ? 'Crear' : 'Editar'} formulario «${name}» (${count} campos)`;

    const updated: FormChange = { ...change, payload: newPayload, createContext, summary };
    deps.store.set(input.projectId, {
      ...state,
      changes: state.changes.map((c) => (c.id === change.id ? updated : c)),
    });
    markChanged(input.projectId);
    return updated;
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
    markChanged(input.projectId);
    return change;
  }

  function listPendingChanges(projectId: string): FormChange[] {
    return deps.store.get(projectId).changes;
  }

  function listSubscriptionTypes(input: FormsListInput): Promise<SubscriptionType[]> {
    return deps.subscriptionsApiFor(input.projectId).listDefinitions();
  }

  /**
   * Para create_form/update_form con consentimiento != none: completa privacyText/checkboxes que
   * falten desde una plantilla del portal y devuelve el payload listo o un error si sigue incompleto (§24).
   */
  async function consentReadyPayload(
    projectId: string,
    payload: Record<string, unknown>,
  ): Promise<{ payload: Record<string, unknown> } | { error: string }> {
    const lco = payload.legalConsentOptions as Record<string, unknown> | undefined;
    if (consentMissingRequired(lco).length === 0) return { payload };
    const template = await deps.formsApiFor(projectId).getConsentTemplate(String(lco?.type ?? ''));
    const merged = mergeConsentTemplate(lco ?? {}, template);
    const missing = consentMissingRequired(merged);
    if (missing.length > 0) {
      return {
        error: `Faltan campos de consentimiento (${missing.join(', ')}). Indícalos en el editor o crea un formulario plantilla con ese consentimiento en HubSpot.`,
      };
    }
    return { payload: { ...payload, legalConsentOptions: merged } };
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
        const ready = await consentReadyPayload(
          input.projectId,
          change.payload as Record<string, unknown>,
        );
        if ('error' in ready) return { success: false, error: ready.error };
        const response = await api.createForm(
          enforceGroupSize(ensureRequiredFormFields(ready.payload, deps.now())),
          input.environment,
        );
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
        let payload = change.payload as Record<string, unknown>;
        if (change.operation === 'update_form') {
          const ready = await consentReadyPayload(input.projectId, payload);
          if ('error' in ready) return { success: false, error: ready.error };
          payload = ready.payload;
        }
        await api.patchForm(
          change.formId,
          enforceGroupSize(ensureRequiredFormFields(payload, deps.now())),
          input.environment,
        );
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
    markChanged(input.projectId);
    return { success: true, formId: resultFormId };
  }

  function discardChange(input: FormDiscardChangeInput): FormsOperationResult {
    const state = deps.store.get(input.projectId);
    deps.store.set(input.projectId, {
      ...state,
      changes: state.changes.filter((c) => c.id !== input.changeId),
    });
    markChanged(input.projectId);
    return { success: true };
  }

  function getDriveMeta(input: { projectId: string }): DriveDocMeta {
    return deps.store.getTimestamps(input.projectId);
  }

  function markDriveWritten(input: { projectId: string }): void {
    const timestamps = deps.store.getTimestamps(input.projectId);
    deps.store.setTimestamps(input.projectId, { ...timestamps, lastWrittenAt: isoNow() });
  }

  function applyDriveState(input: { projectId: string }, state: FormsDriveState): void {
    const current = deps.store.get(input.projectId);
    deps.store.set(input.projectId, { ...current, forms: state.forms, links: state.links });
    const now = isoNow();
    deps.store.setTimestamps(input.projectId, { lastWrittenAt: now, lastChangedAt: now });
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
    updateDefinition,
    updatePendingChange,
    addMissingFields,
    listPendingChanges,
    listSubscriptionTypes,
    applyChange,
    discardChange,
    getDriveMeta,
    markDriveWritten,
    applyDriveState,
  };
}

export type FormService = ReturnType<typeof createFormService>;
