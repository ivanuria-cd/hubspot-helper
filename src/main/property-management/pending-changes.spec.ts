import { describe, it, expect } from 'vitest';
import {
  buildCreateChange,
  diffDefinition,
  cleanOptions,
  isCompleted,
  markApplied,
  type ChangeFactoryDeps,
} from './pending-changes';
import type { HubSpotPropertyDef } from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';

const deps: ChangeFactoryDeps = {
  newId: () => 'c1',
  now: () => '2026-06-11T00:00:00.000Z',
};

const def: HubSpotPropertyDef = {
  hubspotName: 'custom_tier',
  label: 'Tier',
  type: 'enumeration',
  fieldType: 'select',
  groupName: 'custom',
  options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
};

describe('pending-changes', () => {
  it('buildCreateChange genera el payload de creación y referencia la entrada', () => {
    const change = buildCreateChange('e1', 'contacts', def, deps);
    expect(change.entryId).toBe('e1');
    expect(change.operation).toBe('create');
    expect(change.payload).toMatchObject({
      name: 'custom_tier',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
    });
  });

  it('diffDefinition genera update_options al añadir un valor', () => {
    const remote: RemoteProperty = {
      name: 'custom_tier',
      objectType: 'contacts',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: [],
    };
    const changes = diffDefinition('e1', def, remote, deps);
    expect(changes.map((c) => c.operation)).toEqual(['update_options']);
  });

  it('diffDefinition no genera cambios si todo coincide', () => {
    const remote: RemoteProperty = {
      name: 'custom_tier',
      objectType: 'contacts',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    };
    expect(diffDefinition('e1', def, remote, deps)).toEqual([]);
  });

  it('markApplied marca el entorno y isCompleted exige producción', () => {
    const base = buildCreateChange('e1', 'contacts', def, deps);
    const sandbox = markApplied(base, 'sandbox');
    expect(sandbox.appliedToSandbox).toBe(true);
    expect(isCompleted(sandbox)).toBe(false);
    const prod = markApplied(sandbox, 'production');
    expect(isCompleted(prod)).toBe(true);
  });
  it('cleanOptions y payloads descartan opciones vacías', () => {
    const withEmpty: HubSpotPropertyDef = {
      hubspotName: 'hobby',
      label: 'Hobby',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'contactinformation',
      options: [
        { label: 'Pintura', value: 'painting', displayOrder: 0, hidden: false },
        { label: '', value: '', displayOrder: 1, hidden: false },
      ],
    };
    expect(cleanOptions(withEmpty.options)).toHaveLength(1);
    const change = buildCreateChange('e1', 'contacts', withEmpty, deps);
    const payload = change.payload as { options: unknown[] };
    expect(payload.options).toHaveLength(1);
  });

  it('diffDefinition ignora opciones vacías al comparar (no marca divergencia)', () => {
    const withEmpty: HubSpotPropertyDef = {
      ...def,
      options: [
        { label: 'Basic', value: 'basic', displayOrder: 0, hidden: false },
        { label: '', value: '', displayOrder: 1, hidden: false },
      ],
    };
    const remote: RemoteProperty = {
      name: 'custom_tier',
      objectType: 'contacts',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    };
    expect(diffDefinition('e1', withEmpty, remote, deps)).toEqual([]);
  });
});
