/**
 * Carga los tutoriales de `doc/tutoriales/<feature>/*.md` en tiempo de build
 * (se empaquetan con el renderer) y los agrupa por característica.
 */
export interface TutorialEntry {
  id: string;
  feature: string;
  slug: string;
  title: string;
  content: string;
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

export const tutorials: TutorialEntry[] = Object.entries(modules)
  .map(([path, content]) => {
    const parts = path.split('/');
    const slug = (parts[parts.length - 1] ?? '').replace(/\.md$/, '');
    const feature = parts[parts.length - 2] ?? 'general';
    return { id: `${feature}/${slug}`, feature, slug, title: extractTitle(content, slug), content };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export function tutorialFeatures(): string[] {
  return Array.from(new Set(tutorials.map((tutorial) => tutorial.feature)));
}
