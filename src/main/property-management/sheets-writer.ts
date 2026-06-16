/**
 * Compatibilidad: la clave de característica vive ahora en `sheets-model.ts` (SPEC-0006 §18).
 * Se re-exporta para no romper imports históricos.
 */
export { PROPERTY_MAP_FEATURE_KEY } from './sheets-model';
