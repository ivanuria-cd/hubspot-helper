import { describe, it, expect } from 'vitest';
import { reconcileEntries } from './reconcile';
import type { ChangeFactoryDeps } from './pending-changes';
import type { HubSpotPropertyDef, PropertyEntry } from '@shared/types/properties';
import type { RemoteProperty } from '../connectors/hubspot/properties';

let counter = 0;
const deps: ChangeFactoryDeps = {
  newId: () => `id-${(counter += 1)}`,
  now: () => '2026-06-11T00:00:00.000Z',
};

function remote(over: Partial<RemoteProperty> = {}): RemoteProperty {
  return {
    name: 'custom_tier',
    objectType: 'contacts',
    label: 'Tier',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'custom',
    options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    ...over,
  };
}

function existingEntry(over: Partial<PropertyEntry> = {}): PropertyEntry {
  return {
    id: 'e1',
    objectType: 'contacts',
    name: 'Tier',
    hubspotProperty: { mode: 'existing', hubspotName: 'custom_tier' },
    sources: [],
    hubspotStatus: 'missing',
    ...over,
  };
}

function newEntry(definition: HubSpotPropertyDef, over: Partial<PropertyEntry> = {}): PropertyEntry {
  return {
    id: 'e2',
    objectType: 'contacts',
    name: 'Nueva',
    hubspotProperty: { mode: 'new', definition },
    sources: [],
    hubspotStatus: 'missing',
    ...over,
  };
}

const newDef: HubSpotPropertyDef = {
  hubspotName: 'new_prop',
  label: 'Nueva',
  type: 'string',
  fieldType: 'text',
  groupName: 'custom',
};

describe('reconcileEntries', () => {
  it('entrada existente con remoto presente -> exists', () => {
    const result = reconcileEntries([existingEntry()], [remote()], deps);
    expect(result.entries[0]?.hubspotStatus).toBe('exists');
    expect(result.summary).toEqual({ updated: 1, divergent: 0, missing: 0, blocked: 0 });
  });

  it('entrada existente sin remoto -> missing (sin cambio create) + blocker', () => {
    const result = reconcileEntries([existingEntry()], [], deps);
    expect(result.entries[0]?.hubspotStatus).toBe('missing');
    expect(result.entries[0]?.pendingChanges).toEqual([]);
    expect(result.summary.blocked).toBe(1);
    expect(result.blockers[0]?.reason).toBe('existing-missing-remote');
    expect(result.blockers[0]?.remediation).toBe('convert-to-new');
    expect(result.blockers[0]?.hubspotName).toBe('custom_tier');
  });

  it('entrada nueva sin remoto no genera blocker', () => {
    const result = reconcileEntries([newEntry(newDef)], [], deps);
    expect(result.summary.blocked).toBe(0);
    expect(result.blockers).toEqual([]);
  });

  it('entrada nueva sin remoto -> missing + cambio create', () => {
    const result = reconcileEntries([newEntry(newDef)], [], deps);
    expect(result.entries[0]?.hubspotStatus).toBe('missing');
    expect(result.entries[0]?.pendingChanges?.[0]?.operation).toBe('create');
  });

  it('entrada nueva con remoto que coincide -> exists', () => {
    const def: HubSpotPropertyDef = {
      hubspotName: 'custom_tier',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    };
    const result = reconcileEntries([newEntry(def, { id: 'e3' })], [remote()], deps);
    expect(result.entries[0]?.hubspotStatus).toBe('exists');
  });

  it('entrada nueva con remoto que difiere -> divergent', () => {
    const def: HubSpotPropertyDef = {
      hubspotName: 'custom_tier',
      label: 'Nivel',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
    };
    const result = reconcileEntries([newEntry(def, { id: 'e4' })], [remote()], deps);
    expect(result.entries[0]?.hubspotStatus).toBe('divergent');
    const ops = result.entries[0]?.pendingChanges?.map((c) => c.operation);
    expect(ops).toContain('update_label');
  });

  it('no cruza objetos: misma propiedad en contacts y companies', () => {
    const contacts = existingEntry({
      id: 'c',
      objectType: 'contacts',
      hubspotProperty: { mode: 'existing', hubspotName: 'annualrevenue' },
    });
    const companies = existingEntry({
      id: 'co',
      objectType: 'companies',
      hubspotProperty: { mode: 'existing', hubspotName: 'annualrevenue' },
    });
    const remotes: RemoteProperty[] = [
      remote({ name: 'annualrevenue', objectType: 'contacts', type: 'string', fieldType: 'text', options: [] }),
      remote({ name: 'annualrevenue', objectType: 'companies', type: 'number', fieldType: 'number', options: [] }),
    ];
    const result = reconcileEntries([contacts, companies], remotes, deps);
    expect(result.entries.every((e) => e.hubspotStatus === 'exists')).toBe(true);
    expect(result.summary).toEqual({ updated: 2, divergent: 0, missing: 0, blocked: 0 });
  });
  it('propiedad de sistema sin remoto -> blocker system-property/relink (no convert-to-new)', () => {
    const owner = existingEntry({
      id: 'sys',
      name: 'Propietario',
      hubspotProperty: { mode: 'existing', hubspotName: 'hubspot_owner_id' },
    });
    const result = reconcileEntries([owner], [], deps);
    expect(result.summary.blocked).toBe(1);
    expect(result.blockers[0]?.reason).toBe('system-property');
    expect(result.blockers[0]?.remediation).toBe('relink');
  });

  it('entrada existente editada (definition difiere) -> divergent + update', () => {
    const edited = existingEntry({
      id: 'ee',
      hubspotProperty: {
        mode: 'existing',
        hubspotName: 'custom_tier',
        definition: {
          hubspotName: 'custom_tier',
          label: 'Nivel',
          type: 'enumeration',
          fieldType: 'select',
          groupName: 'custom',
          options: [{ label: 'Basic', value: 'basic', displayOrder: 0, hidden: false }],
        },
      },
    });
    const result = reconcileEntries([edited], [remote()], deps);
    expect(result.entries[0]?.hubspotStatus).toBe('divergent');
    expect(result.entries[0]?.pendingChanges?.map((c) => c.operation)).toContain('update_label');
  });
});
