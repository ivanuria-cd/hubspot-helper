/**
 * Carga los tutoriales de `doc/tutoriales/<feature>/<locale>/<slug>.md` en tiempo
 * de build (se empaquetan con el renderer), los agrupa por `feature/slug` y guarda
 * el contenido y el título por idioma. La versión `es` es la canónica (SPEC-0009).
 */
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@shared/i18n/languages';

export interface TutorialEntry {
  id: string;
  feature: string;
  slug: string;
  titles: Partial<Record<SupportedLanguage, string>>;
  content: Partial<Record<SupportedLanguage, string>>;
}

export interface ResolvedTutorial {
  content: string;
  isFallback: boolean;
  shownLanguage: SupportedLanguage;
}

const modules = import.meta.glob('../../../../doc/tutoriales/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function extractTitle(content: string, fallback: string): string {
  const heading = content.split('\n').find((line) => line.startsWith('# '));
  return heading ? heading.slice(2).trim() : fallback;
}

const byId = new Map<string, TutorialEntry>();

for (const [path, content] of Object.entries(modules)) {
  const parts = path.split('/');
  const slug = (parts[parts.length - 1] ?? '').replace(/\.md$/, '');
  const localeSegment = parts[parts.length - 2] ?? '';
  const locale: SupportedLanguage = isSupportedLanguage(localeSegment)
    ? localeSegment
    : DEFAULT_LANGUAGE;
  // Tutorial legacy sin subcarpeta de idioma: feature es el penúltimo segmento.
  const feature = isSupportedLanguage(localeSegment)
    ? (parts[parts.length - 3] ?? 'general')
    : localeSegment || 'general';

  if (import.meta.env?.DEV && !isSupportedLanguage(localeSegment)) {
    console.warn(`[tutorials] ruta sin idioma, tratada como ${DEFAULT_LANGUAGE}: ${path}`);
  }

  const id = `${feature}/${slug}`;
  const entry = byId.get(id) ?? { id, feature, slug, titles: {}, content: {} };
  entry.content[locale] = content;
  entry.titles[locale] = extractTitle(content, slug);
  byId.set(id, entry);
}

export const tutorials: TutorialEntry[] = Array.from(byId.values()).sort((a, b) =>
  a.id.localeCompare(b.id),
);

export function tutorialFeatures(): string[] {
  return Array.from(new Set(tutorials.map((tutorial) => tutorial.feature)));
}

export function resolveContent(
  entry: TutorialEntry,
  lang: SupportedLanguage,
): ResolvedTutorial {
  const direct = entry.content[lang];
  if (direct !== undefined) {
    return { content: direct, isFallback: false, shownLanguage: lang };
  }
  const base = entry.content[DEFAULT_LANGUAGE] ?? '';
  return { content: base, isFallback: true, shownLanguage: DEFAULT_LANGUAGE };
}

export function resolveTitle(entry: TutorialEntry, lang: SupportedLanguage): string {
  return entry.titles[lang] ?? entry.titles[DEFAULT_LANGUAGE] ?? entry.slug;
}

export { SUPPORTED_LANGUAGES };
