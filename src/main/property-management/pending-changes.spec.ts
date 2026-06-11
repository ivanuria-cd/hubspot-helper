import { describe, it, expect } from 'vitest';
import {
  buildCreateChange,
  diffProperty,
  isCompleted,
  markApplied,
  type ChangeFactoryDeps,
} from './pending-changes';
import type { HubSpotProperty } from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';

const deps: ChangeFactoryDeps = {
  newId: () => 'c1',
  now: () => '2026-06-10T00:00:00.000Z',
};

const property: HubSpotProperty = {
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
};

describe('pending-changes', () => {
  it('buildCreateChange genera el payload completo de creación', () => {
    const change = buildCreateChange(property, deps);
    expect(change.operation).toBe('create');
    expect(change.payload).toMatchObject({
      name: 'custom_tier',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
    });
    expect(change.appliedToSandbox).toBe(false);
    expect(change.appliedToProduction).toBe(false);
  });

  it('diffProperty genera update_options al añadir un valor', () => {
    const remote: RemoteProperty = {
      name: 'custom_tier',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: [],
    };
    const changes = diffProperty(
      { ...property, options: [{ label: 'Enterprise', value: 'enterprise', displayOrder: 0, hidden: false }] },
      remote,
      deps,
    );
    expect(changes.map((c) => c.operation)).toEqual(['update_options']);
  });

  it('diffProperty no genera cambios si todo coincide', () => {
    const remote: RemoteProperty = {
      name: 'custom_tier',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    };
    expect(diffProperty(property, remote, deps)).toEqual([]);
  });

  it('markApplied marca el entorno y isCompleted exige producción', () => {
    const base = buildCreateChange(property, deps);
    const sandbox = markApplied(base, 'sandbox');
    expect(sandbox.appliedToSandbox).toBe(true);
    expect(isCompleted(sandbox)).toBe(false);

    const prod = markApplied(sandbox, 'production');
    expect(prod.appliedToProduction).toBe(true);
    expect(isCompleted(prod)).toBe(true);
  });
});
