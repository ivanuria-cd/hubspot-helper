import { describe, it, expect } from 'vitest';
import { PROPERTY_MAP_FEATURE_KEY } from './sheets-writer';
import { SHEETS_SCHEMA_VERSION } from './sheets-model';

// El volcado a Sheets queda diferido (§16); solo verificamos las constantes base.
describe('sheets (diferido §16)', () => {
  it('mantiene la featureKey del mapa y la versión de esquema', () => {
    expect(PROPERTY_MAP_FEATURE_KEY).toBe('property-management');
    expect(SHEETS_SCHEMA_VERSION).toBe(2);
  });
});
