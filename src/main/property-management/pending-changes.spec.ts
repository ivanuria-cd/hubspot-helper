import { describe, it, expect } from 'vitest';
import {
  buildCreateChange,
  diffDefinition,
  cleanOptions,
  isCompleted,
  markApplied,
  preserveIdentity,
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

  it('§36: cleanOptions normaliza hidden a false cuando falta', () => {
    const opts = cleanOptions([{ label: 'España', value: 'España', displayOrder: 0 } as never]);
    expect(opts[0]?.hidden).toBe(false);
  });

  it('§36: no marca update_options cuando la def carece de hidden y el remoto trae hidden:false', () => {
    const localNoHidden: HubSpotPropertyDef = {
      hubspotName: 'pais_nacimiento',
      label: 'País de Nacimiento',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'contactinformation',
      options: [
        { label: 'España', value: 'España', displayOrder: 0 } as never,
        { label: 'Francia', value: 'Francia', displayOrder: 1 } as never,
      ],
    };
    const remote: RemoteProperty = {
      name: 'pais_nacimiento',
      objectType: 'contacts',
      label: 'País de Nacimiento',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'contactinformation',
      options: [
        { label: 'España', value: 'España', displayOrder: 0, hidden: false },
        { label: 'Francia', value: 'Francia', displayOrder: 1, hidden: false },
      ],
    };
    expect(diffDefinition('e1', localNoHidden, remote, deps)).toEqual([]);
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

  it('createBody incluye los atributos definidos (moneda, único)', () => {
    const money: HubSpotPropertyDef = {
      hubspotName: 'deal_amount',
      label: 'Importe',
      type: 'number',
      fieldType: 'number',
      groupName: 'dealinformation',
      numberDisplayHint: 'currency',
      showCurrencySymbol: true,
      hasUniqueValue: true,
    };
    const change = buildCreateChange('e1', 'deals', money, deps);
    expect(change.payload).toMatchObject({
      numberDisplayHint: 'currency',
      showCurrencySymbol: true,
      hasUniqueValue: true,
    });
  });

  it('diffDefinition emite update_attributes solo ante atributo fijado que difiere', () => {
    const local: HubSpotPropertyDef = {
      hubspotName: 'deal_amount',
      label: 'Importe',
      type: 'number',
      fieldType: 'number',
      groupName: 'dealinformation',
      numberDisplayHint: 'currency',
    };
    const remote: RemoteProperty = {
      name: 'deal_amount',
      objectType: 'deals',
      label: 'Importe',
      type: 'number',
      fieldType: 'number',
      groupName: 'dealinformation',
      numberDisplayHint: 'unformatted',
    };
    const changes = diffDefinition('e1', local, remote, deps);
    expect(changes.map((c) => c.operation)).toEqual(['update_attributes']);
    expect(changes[0].payload).toEqual({ numberDisplayHint: 'currency' });
  });

  it('diffDefinition no marca divergencia cuando el atributo local es undefined', () => {
    const local: HubSpotPropertyDef = {
      hubspotName: 'deal_amount',
      label: 'Importe',
      type: 'number',
      fieldType: 'number',
      groupName: 'dealinformation',
    };
    const remote: RemoteProperty = {
      name: 'deal_amount',
      objectType: 'deals',
      label: 'Importe',
      type: 'number',
      fieldType: 'number',
      groupName: 'dealinformation',
      numberDisplayHint: 'unformatted',
    };
    expect(diffDefinition('e1', local, remote, deps)).toEqual([]);
  });

  it('H4: createBody inyecta opciones true/false para bool sin opciones', () => {
    const boolDef: HubSpotPropertyDef = {
      hubspotName: 'gym_towel_service',
      label: 'Servicio de toalla',
      type: 'bool',
      fieldType: 'booleancheckbox',
      groupName: 'contactinformation',
    };
    const change = buildCreateChange('e1', 'contacts', boolDef, deps);
    const payload = change.payload as { options: Array<{ value: string }> };
    expect(payload.options.map((o) => o.value)).toEqual(['true', 'false']);
  });

  it('§46: createBody incluye formField cuando está fijado (true/false)', () => {
    const on = buildCreateChange('e1', 'contacts', { ...def, formField: true }, deps);
    expect(on.payload).toMatchObject({ formField: true });
    const off = buildCreateChange('e1', 'contacts', { ...def, formField: false }, deps);
    expect(off.payload).toMatchObject({ formField: false });
  });

  it('§46: createBody omite formField cuando es undefined (default de HubSpot)', () => {
    const change = buildCreateChange('e1', 'contacts', def, deps);
    expect(change.payload).not.toHaveProperty('formField');
  });

  it('§46: diffDefinition marca update_attributes al cambiar formField y no diverge si coincide', () => {
    const local: HubSpotPropertyDef = { ...def, options: undefined, formField: true };
    const remoteBase: RemoteProperty = {
      name: 'custom_tier',
      objectType: 'contacts',
      label: 'Tier',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'custom',
      options: undefined,
    };
    const diff = diffDefinition('e1', local, { ...remoteBase, formField: false }, deps);
    expect(diff.map((c) => c.operation)).toEqual(['update_attributes']);
    expect(diff[0].payload).toEqual({ formField: true });
    expect(diffDefinition('e1', local, { ...remoteBase, formField: true }, deps)).toEqual([]);
  });

  it('H5: diffDefinition ignora calculationFormula (HubSpot la normaliza)', () => {
    const local: HubSpotPropertyDef = {
      hubspotName: 'gym_total_due',
      label: 'Total a pagar',
      type: 'number',
      fieldType: 'calculation_equation',
      groupName: 'contactinformation',
      calculationFormula: 'gym_monthly_fee * 12',
    };
    const remote: RemoteProperty = {
      name: 'gym_total_due',
      objectType: 'contacts',
      label: 'Total a pagar',
      type: 'number',
      fieldType: 'calculation_equation',
      groupName: 'contactinformation',
      calculationFormula: 'gym_monthly_fee*12.0',
    };
    expect(diffDefinition('e1', local, remote, deps)).toEqual([]);
  });

  it('§54.1: preserveIdentity conserva id/createdAt/flags del previo por operación', () => {
    const prevDeps: ChangeFactoryDeps = {
      newId: () => 'prev-id',
      now: () => '2026-06-01T00:00:00.000Z',
    };
    const freshDeps: ChangeFactoryDeps = {
      newId: () => 'fresh-id',
      now: () => '2026-07-08T00:00:00.000Z',
    };
    const prev = markApplied(buildCreateChange('e1', 'contacts', def, prevDeps), 'sandbox');
    const fresh = buildCreateChange('e1', 'contacts', { ...def, label: 'Tier v2' }, freshDeps);
    const [merged] = preserveIdentity([fresh], [prev]);
    expect(merged.id).toBe('prev-id');
    expect(merged.createdAt).toBe('2026-06-01T00:00:00.000Z');
    expect(merged.appliedToSandbox).toBe(true);
    expect(merged.payload).toMatchObject({ label: 'Tier v2' });
  });

  it('§54.1: preserveIdentity conserva el id nuevo si no hay previo de esa operación', () => {
    const freshDeps: ChangeFactoryDeps = {
      newId: () => 'fresh-id',
      now: () => '2026-07-08T00:00:00.000Z',
    };
    const [merged] = preserveIdentity([buildCreateChange('e1', 'contacts', def, freshDeps)], []);
    expect(merged.id).toBe('fresh-id');
    expect(merged.appliedToSandbox).toBe(false);
  });
});
