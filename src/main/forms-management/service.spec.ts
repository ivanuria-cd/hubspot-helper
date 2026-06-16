import { describe, it, expect, vi } from 'vitest';
import { createFormService } from './service';
import { createMemoryFormsStore } from './store';
import type { FormsApi } from '../connectors/hubspot/forms';
import type { HubSpotForm } from '@shared/types/forms';
import type { PropertyEntry } from '@shared/types/properties';

function form(id: string, names: string[]): HubSpotForm {
  return {
    id,
    name: `Form ${id}`,
    formType: 'hubspot',
    archived: false,
    updatedAt: '',
    objectTypes: ['contacts'],
    fieldNames: names,
    fieldGroups: [
      {
        fields: names.map((name) => ({
          objectTypeId: '0-1',
          name,
          label: name,
          fieldType: 'single_line_text',
          required: false,
          hidden: false,
        })),
      },
    ],
  };
}

const entries: PropertyEntry[] = [
  {
    id: 'e1',
    objectType: 'contacts',
    name: 'Email',
    hubspotProperty: { mode: 'existing', hubspotName: 'email' },
    sources: [{ id: 's1', originId: 'o1', sourceField: 'mail', definition: { kind: 'text' } }],
    hubspotStatus: 'exists',
  },
  {
    id: 'e2',
    objectType: 'contacts',
    name: 'Nombre',
    hubspotProperty: { mode: 'existing', hubspotName: 'firstname' },
    sources: [{ id: 's2', originId: 'o1', sourceField: 'name', definition: { kind: 'text' } }],
    hubspotStatus: 'exists',
  },
];

function makeService(apiOverrides: Partial<FormsApi> = {}, seedForms: HubSpotForm[] = []) {
  const store = createMemoryFormsStore();
  if (seedForms.length) store.set('p1', { forms: seedForms, links: [], changes: [] });
  let counter = 0;
  const api: FormsApi = {
    listForms: vi.fn(() => Promise.resolve([])),
    getForm: vi.fn(() => Promise.resolve(form('x', []))),
    createForm: vi.fn(() => Promise.resolve({ status: 201, data: { id: 'new-form' } })),
    patchForm: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    listLegacyForms: vi.fn(() => Promise.resolve([])),
    ...apiOverrides,
  };
  const service = createFormService({
    store,
    formsApiFor: () => api,
    entriesFor: () => entries,
    newId: () => `id-${++counter}`,
    now: () => '2026-06-16T00:00:00Z',
  });
  return { service, store, api };
}

describe('FormService', () => {
  it('syncHubspot importa formularios nuevos y cuenta actualizados', async () => {
    const { service } = makeService({
      listForms: vi.fn(() => Promise.resolve([form('f1', ['email']), form('f2', [])])),
    });
    const first = await service.syncHubspot({ projectId: 'p1' });
    expect(first).toEqual({ imported: 2, updated: 0 });
    const second = await service.syncHubspot({ projectId: 'p1' });
    expect(second).toEqual({ imported: 0, updated: 2 });
    expect(service.listForms({ projectId: 'p1' })).toHaveLength(2);
  });

  it('upsertLink crea y luego coverage reporta faltantes del origen', () => {
    const { service } = makeService({}, [form('f1', ['email'])]);
    service.upsertLink({
      projectId: 'p1',
      link: { formId: 'f1', originIds: ['o1'], objectType: 'contacts' },
    });
    const reports = service.coverage({ projectId: 'p1', formId: 'f1' });
    expect(reports).toHaveLength(1);
    expect(reports[0]?.missing).toBe(1); // falta firstname
    expect(reports[0]?.present).toBe(1); // email presente
  });

  it('addMissingFields genera un cambio add_fields con el campo que falta', () => {
    const { service } = makeService({}, [form('f1', ['email'])]);
    service.upsertLink({
      projectId: 'p1',
      link: { formId: 'f1', originIds: ['o1'], objectType: 'contacts' },
    });
    const change = service.addMissingFields({ projectId: 'p1', formId: 'f1', originId: 'o1' });
    expect(change.operation).toBe('add_fields');
    expect(change.formId).toBe('f1');
    expect(service.listPendingChanges('p1')).toHaveLength(1);
  });

  it('applyChange create_form crea el form en HubSpot y un FormOriginLink, y marca el entorno', async () => {
    const { service, api } = makeService();
    const change = service.createDefinition({
      projectId: 'p1',
      definition: {
        name: 'Newsletter',
        originIds: ['o1'],
        objectType: 'contacts',
        fields: [
          { hubspotName: 'email', label: 'Email', fieldType: 'email', required: true, hidden: false },
        ],
      },
    });
    const result = await service.applyChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'sandbox',
    });
    expect(api.createForm).toHaveBeenCalled();
    expect(result).toEqual({ success: true, formId: 'new-form' });
    const links = service.listLinks({ projectId: 'p1' });
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ formId: 'new-form', originIds: ['o1'], objectType: 'contacts' });
    const applied = service.listPendingChanges('p1').find((c) => c.id === change.id);
    expect(applied?.appliedToSandbox).toBe(true);
    expect(applied?.appliedToProduction).toBe(false);
  });

  it('applyChange propaga el error de HubSpot sin marcar el cambio', async () => {
    const { service } = makeService({
      createForm: vi.fn(() =>
        Promise.reject({ response: { data: { message: 'Falta el scope forms' } } }),
      ),
    });
    const change = service.createDefinition({
      projectId: 'p1',
      definition: { name: 'X', originIds: [], objectType: 'contacts', fields: [] },
    });
    const result = await service.applyChange({
      projectId: 'p1',
      changeId: change.id,
      environment: 'production',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Falta el scope forms');
    expect(service.listPendingChanges('p1')[0]?.appliedToProduction).toBe(false);
  });

  it('discardChange elimina el cambio pendiente', () => {
    const { service } = makeService();
    const change = service.createDefinition({
      projectId: 'p1',
      definition: { name: 'X', originIds: [], objectType: 'contacts', fields: [] },
    });
    service.discardChange({ projectId: 'p1', changeId: change.id });
    expect(service.listPendingChanges('p1')).toHaveLength(0);
  });
});
