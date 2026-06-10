import { describe, it, expect } from 'vitest';
import {
  buildCover,
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
});
