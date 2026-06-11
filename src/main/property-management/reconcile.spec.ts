import { describe, it, expect } from 'vitest';
import { reconcile } from './reconcile';
import type { ChangeFactoryDeps } from './pending-changes';
import type { HubSpotProperty } from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';

let counter = 0;
const deps: ChangeFactoryDeps = {
  newId: () => `id-${(counter += 1)}`,
  now: () => '2026-06-10T00:00:00.000Z',
};

function localProp(overrides: Partial<HubSpotProperty> = {}): HubSpotProperty {
  return {
    id: 'p1',
    hubspotName: 'custom_tier',
    label: 'Tier',
    objectType: 'contacts',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'custom',
    isCustom: true,
    options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    hubspotStatus: 'missing',
    ...overrides,
  };
}

function remoteProp(overrides: Partial<RemoteProperty> = {}): RemoteProperty {
  return {
    name: 'custom_tier',
    label: 'Tier',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'custom',
    options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    ...overrides,
  };
}

describe('reconcile', () => {
  it('clasifica como exists cuando la definición coincide', () => {
    const result = reconcile([localProp()], [remoteProp()], deps);
    expect(result.properties[0]?.hubspotStatus).toBe('exists');
    expect(result.properties[0]?.pendingChanges).toEqual([]);
    expect(result.summary).toEqual({ updated: 1, divergent: 0, missing: 0 });
  });

  it('clasifica como missing y genera un cambio create', () => {
    const result = reconcile([localProp()], [], deps);
    expect(result.properties[0]?.hubspotStatus).toBe('missing');
    expect(result.properties[0]?.pendingChanges?.[0]?.operation).toBe('create');
    expect(result.summary.missing).toBe(1);
  });

  it('clasifica como divergent y detecta la diferencia de etiqueta', () => {
    const result = reconcile([localProp({ label: 'Nivel' })], [remoteProp()], deps);
    expect(result.properties[0]?.hubspotStatus).toBe('divergent');
    const ops = result.properties[0]?.pendingChanges?.map((change) => change.operation);
    expect(ops).toContain('update_label');
    expect(result.summary.divergent).toBe(1);
  });

  it('detecta opciones nuevas en una enumeración', () => {
    const local = localProp({
      options: [
        { label: 'Basic', value: 'basic', displayOrder: 0, hidden: false },
        { label: 'Enterprise', value: 'enterprise', displayOrder: 1, hidden: false },
      ],
    });
    const result = reconcile([local], [remoteProp()], deps);
    const change = result.properties[0]?.pendingChanges?.find(
      (c) => c.operation === 'update_options',
    );
    expect(change).toBeTruthy();
    expect(change?.payload).toEqual({ options: local.options });
  });
});
