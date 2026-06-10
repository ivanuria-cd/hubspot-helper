/**
 * Generador de la portada de contexto que la app añade a la primera sección de cada
 * archivo gestionado (SPEC-0004 §2). El diseño es cerrado por versión de esquema.
 */

export const COVER_SECTION_KEYS = [
  'whatIsIt',
  'purpose',
  'howToRead',
  'userCanModify',
  'userMustNotModify',
] as const;

export type CoverSectionKey = (typeof COVER_SECTION_KEYS)[number];

export const COVER_SECTION_HEADINGS: Record<CoverSectionKey, string> = {
  whatIsIt: 'Qué es este archivo',
  purpose: 'Para qué sirve',
  howToRead: 'Cómo interpretarlo',
  userCanModify: 'Qué puedes modificar',
  userMustNotModify: 'Qué NO debes modificar (gestionado por la app)',
};

export interface CoverInput {
  title: string;
  schemaVersion: number;
  whatIsIt: string;
  purpose: string;
  howToRead: string;
  userCanModify: string;
  userMustNotModify: string;
}

export interface CoverSection {
  key: CoverSectionKey;
  heading: string;
  body: string;
}

export interface CoverContent {
  title: string;
  schemaVersion: number;
  sections: CoverSection[];
}

export function buildCover(input: CoverInput): CoverContent {
  return {
    title: input.title,
    schemaVersion: input.schemaVersion,
    sections: COVER_SECTION_KEYS.map((key) => ({
      key,
      heading: COVER_SECTION_HEADINGS[key],
      body: input[key],
    })),
  };
}

/** Renderiza la portada como texto plano (válido para Docs y como cabecera de Sheets). */
export function renderCoverText(cover: CoverContent): string {
  const header = `${cover.title}\n\nschema_version: ${cover.schemaVersion}\n`;
  const body = cover.sections
    .map((section) => `\n${section.heading}\n${section.body}\n`)
    .join('');
  const footer =
    '\n— Generado por RevOps Assistant (Cloud District). No edites las zonas marcadas como gestionadas por la app. —\n';
  return `${header}${body}${footer}`;
}

/** Requests de la Google Docs API para insertar la portada al inicio del documento. */
export function toDocsInsertRequests(cover: CoverContent): Array<Record<string, unknown>> {
  return [{ insertText: { location: { index: 1 }, text: renderCoverText(cover) } }];
}
