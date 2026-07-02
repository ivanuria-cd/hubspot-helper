import { describe, it, expect, vi } from 'vitest';
import {
  clearConsentTemplateCache,
  createFormsApi,
  objectTypeFromId,
  objectTypeToId,
  toHubSpotForm,
} from './forms';
import type { HubSpotRequest, HubSpotResponse } from '@shared/types/hubspot';

describe('Marketing Forms API v3', () => {
  it('toHubSpotForm estampa objectTypes y fieldNames derivados', () => {
    const form = toHubSpotForm({
      id: 'f1',
      name: 'Newsletter',
      formType: 'hubspot',
      fieldGroups: [
        {
          fields: [
            { objectTypeId: '0-1', name: 'email', label: 'Email', fieldType: 'email', required: true },
            { objectTypeId: '0-1', name: 'firstname', label: 'Nombre', fieldType: 'single_line_text' },
          ],
        },
      ],
      updatedAt: '2026-06-16T00:00:00Z',
    });

    expect(form.objectTypes).toEqual(['contacts']);
    expect(form.fieldNames).toEqual(['email', 'firstname']);
    expect(form.fieldGroups[0]?.fields[0]?.hidden).toBe(false);
    expect(form.archived).toBe(false);
  });

  it('la tabla objectType ↔ objectTypeId es bidireccional y preserva custom verbatim', () => {
    expect(objectTypeToId('contacts')).toBe('0-1');
    expect(objectTypeFromId('0-3')).toBe('deals');
    expect(objectTypeToId('2-12345')).toBe('2-12345');
    expect(objectTypeFromId('2-12345')).toBe('2-12345');
  });

  it('listForms pagina hasta agotar paging.next.after', async () => {
    const pages: HubSpotResponse[] = [
      {
        status: 200,
        data: {
          results: [{ id: 'f1', name: 'A', formType: 'hubspot', fieldGroups: [] }],
          paging: { next: { after: 'CURSOR2' } },
        },
      },
      {
        status: 200,
        data: { results: [{ id: 'f2', name: 'B', formType: 'captured', fieldGroups: [] }] },
      },
    ];
    let call = 0;
    const request = vi.fn((_req: HubSpotRequest) => Promise.resolve(pages[call++]!));
    const api = createFormsApi({ request, projectId: 'p1' });

    const forms = await api.listForms();

    expect(request).toHaveBeenCalledTimes(2);
    expect(forms.map((f) => f.id)).toEqual(['f1', 'f2']);
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      path: '/marketing/v3/forms',
      params: expect.objectContaining({ after: 'CURSOR2' }),
    });
  });

  it('createForm hace POST con el payload y entorno', async () => {
    const calls: HubSpotRequest[] = [];
    const request = vi.fn((req: HubSpotRequest) => {
      calls.push(req);
      return Promise.resolve({ status: 201, data: { id: 'new' } });
    });
    const api = createFormsApi({ request, projectId: 'p1' });

    await api.createForm({ name: 'X', formType: 'hubspot' }, 'sandbox');

    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/marketing/v3/forms',
      environment: 'sandbox',
      body: { name: 'X', formType: 'hubspot' },
    });
  });

  it('patchForm hace PATCH al formulario concreto', async () => {
    const request = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
    const api = createFormsApi({ request, projectId: 'p1' });

    await api.patchForm('f1', { fieldGroups: [] }, 'production');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: '/marketing/v3/forms/f1',
        environment: 'production',
      }),
    );
  });

  it('§30: getConsentTemplate cachea por proyecto/tipo con TTL y expira', async () => {
    clearConsentTemplateCache();
    const lco = { type: 'legitimate_interest', privacyText: 'texto' };
    const request = vi.fn(() =>
      Promise.resolve({
        status: 200,
        data: { results: [{ id: 'f1', name: 'A', formType: 'hubspot', fieldGroups: [], legalConsentOptions: lco }] },
      }),
    );
    let nowMs = 0;
    const api = createFormsApi({ request, projectId: 'p-cache', now: () => nowMs });

    expect(await api.getConsentTemplate('legitimate_interest')).toEqual(lco);
    expect(await api.getConsentTemplate('legitimate_interest')).toEqual(lco);
    expect(request).toHaveBeenCalledTimes(1);

    nowMs = 5 * 60_000 + 1;
    await api.getConsentTemplate('legitimate_interest');
    expect(request).toHaveBeenCalledTimes(2);
    clearConsentTemplateCache();
  });
});
