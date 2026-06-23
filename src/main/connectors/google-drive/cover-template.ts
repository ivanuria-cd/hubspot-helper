/**
 * Generador de la portada de contexto que la app añade a la primera sección de cada
 * archivo gestionado (SPEC-0004 §2). El diseño es cerrado por versión de esquema.
 *
 * SPEC-0012: además del texto plano (`renderCoverText`, usado para el cuerpo y como fallback),
 * `buildCoverDocStyleRequests` produce los `requests` de la Docs API que estilan la portada con
 * estilos nativos (Heading 1/2, marca, pie). El estilado no altera el texto exportado, por lo que el
 * round-trip de carga (SPEC-0004 §15.5) no cambia.
 */
import { CD, FONT_PRIMARY } from './brand';

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

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

function paragraphStyle(start: number, end: number, namedStyleType: string): Record<string, unknown> {
  return {
    updateParagraphStyle: {
      range: { startIndex: start, endIndex: end },
      paragraphStyle: { namedStyleType },
      fields: 'namedStyleType',
    },
  };
}

function textStyle(start: number, end: number, style: Record<string, unknown>, fields: string): Record<string, unknown> {
  return { updateTextStyle: { range: { startIndex: start, endIndex: end }, textStyle: style, fields } };
}

/**
 * Estilos nativos de la portada del Doc (SPEC-0012). `baseIndex` es el índice del Doc donde empieza
 * el texto de la portada (1 al inicio del documento). Las posiciones se derivan del mismo layout
 * determinista de `renderCoverText`.
 */
export function buildCoverDocStyleRequests(cover: CoverContent, baseIndex = 1): Array<Record<string, unknown>> {
  const requests: Array<Record<string, unknown>> = [];
  const font = { weightedFontFamily: { fontFamily: FONT_PRIMARY } };

  // header = `${title}\n\nschema_version: N\n`
  const titleStart = baseIndex;
  const titleEnd = titleStart + cover.title.length + 1;
  requests.push(paragraphStyle(titleStart, titleEnd, 'HEADING_1'));
  requests.push(
    textStyle(
      titleStart,
      titleStart + cover.title.length,
      { bold: true, foregroundColor: { color: { rgbColor: rgb(CD.navy) } }, ...font },
      'bold,foregroundColor,weightedFontFamily',
    ),
  );

  const schemaText = `schema_version: ${cover.schemaVersion}`;
  const schemaStart = titleStart + cover.title.length + 2;
  requests.push(textStyle(schemaStart, schemaStart + schemaText.length, { bold: true, ...font }, 'bold,weightedFontFamily'));

  // body sections: cada una `\n${heading}\n${body}\n`
  let cursor = schemaStart + schemaText.length + 1;
  for (const section of cover.sections) {
    const headingStart = cursor + 1;
    const headingEnd = headingStart + section.heading.length + 1;
    requests.push(paragraphStyle(headingStart, headingEnd, 'HEADING_2'));
    requests.push(
      textStyle(
        headingStart,
        headingStart + section.heading.length,
        { bold: true, foregroundColor: { color: { rgbColor: rgb(CD.navy) } }, ...font },
        'bold,foregroundColor,weightedFontFamily',
      ),
    );
    cursor += 1 + section.heading.length + 1 + section.body.length + 1;
  }

  // footer = `\n— … —\n`
  const footerText =
    '— Generado por RevOps Assistant (Cloud District). No edites las zonas marcadas como gestionadas por la app. —';
  const footerStart = cursor + 1;
  requests.push(
    textStyle(
      footerStart,
      footerStart + footerText.length,
      { italic: true, foregroundColor: { color: { rgbColor: rgb(CD.tertiary) } }, ...font },
      'italic,foregroundColor,weightedFontFamily',
    ),
  );

  return requests;
}
