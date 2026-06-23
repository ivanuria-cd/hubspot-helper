import { describe, it, expect } from 'vitest';
import {
  buildCover,
  buildCoverDocStyleRequests,
  COVER_SECTION_KEYS,
  renderCoverText,
  toDocsInsertRequests,
  type CoverInput,
} from './cover-template';

const input: CoverInput = {
  title: 'Mapa de campos CRM',
  schemaVersion: 2,
  whatIsIt: 'Qué es',
  purpose: 'Para qué',
  howToRead: 'Cómo',
  userCanModify: 'Editable',
  userMustNotModify: 'No editar',
};

describe('cover-template', () => {
  it('genera todas las secciones obligatorias', () => {
    const cover = buildCover(input);
    expect(cover.sections.map((section) => section.key)).toEqual([...COVER_SECTION_KEYS]);
    expect(cover.schemaVersion).toBe(2);
  });

  it('el texto renderizado incluye encabezados, contenidos y schema_version', () => {
    const text = renderCoverText(buildCover(input));
    expect(text).toContain('Mapa de campos CRM');
    expect(text).toContain('schema_version: 2');
    expect(text).toContain('Qué es este archivo');
    expect(text).toContain('Qué NO debes modificar');
    expect(text).toContain('No editar');
  });

  it('toDocsInsertRequests produce un insertText al inicio del documento', () => {
    const requests = toDocsInsertRequests(buildCover(input));
    expect(requests).toHaveLength(1);
    const request = requests[0] as { insertText: { location: { index: number }; text: string } };
    expect(request.insertText.location.index).toBe(1);
    expect(request.insertText.text).toContain('schema_version: 2');
  });

  it('buildCoverDocStyleRequests estila título (H1), secciones (H2) y pie', () => {
    const cover = buildCover(input);
    const reqs = buildCoverDocStyleRequests(cover, 1);

    type Para = { updateParagraphStyle: { range: { startIndex: number; endIndex: number }; paragraphStyle: { namedStyleType: string } } };
    const paras = reqs.filter((r) => 'updateParagraphStyle' in r) as Para[];
    const h1 = paras.filter((p) => p.updateParagraphStyle.paragraphStyle.namedStyleType === 'HEADING_1');
    const h2 = paras.filter((p) => p.updateParagraphStyle.paragraphStyle.namedStyleType === 'HEADING_2');
    expect(h1).toHaveLength(1);
    expect(h1[0].updateParagraphStyle.range.startIndex).toBe(1);
    expect(h2).toHaveLength(COVER_SECTION_KEYS.length);

    const italic = reqs.some(
      (r) =>
        'updateTextStyle' in r &&
        (r as { updateTextStyle: { textStyle: { italic?: boolean } } }).updateTextStyle.textStyle.italic === true,
    );
    expect(italic).toBe(true);

    reqs.forEach((r) => {
      const range = (r as { updateParagraphStyle?: { range: { startIndex: number; endIndex: number } }; updateTextStyle?: { range: { startIndex: number; endIndex: number } } });
      const span = range.updateParagraphStyle?.range ?? range.updateTextStyle?.range;
      expect(span && span.endIndex).toBeGreaterThan(span!.startIndex);
    });
  });
});
