/**
 * Constantes de la hoja de metadatos del mapa editable (SPEC-0006 §53.6). Vive aparte del builder
 * (planning-model) para que el importador (planning-import) y la capa de estilo del conector puedan
 * usarlas sin acoplarse al layout. ASCII intencionado (evita el truncado del espejo del sandbox).
 *
 * La hoja `00_Metadatos` mapea el titulo de cada pestana de objeto a su objectType REAL, de modo que
 * el import no lo derive del titulo saneado/truncado/desambiguado. La capa de estilo la protege.
 */
export const PLANNING_META_TITLE = '00_Metadatos';
export const PLANNING_META_HEADER: readonly [string, string] = ['Tab', 'Object type'];
