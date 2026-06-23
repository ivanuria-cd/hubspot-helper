/** Registro de contribuyentes de sección del `.rvproj` (SPEC-0013 §2.4, §4.2). */

export interface SectionContributor {
  featureKey: string;
  currentSchemaVersion: number;
  /** Estado local → `data` (objeto serializable, sin stringificar). */
  collect(projectId: string): unknown;
  /** Aplica una `data` ya migrada al estado local. */
  apply(projectId: string, data: unknown, fromVersion: number): void;
}

export interface SectionRegistry {
  register(contributor: SectionContributor): void;
  list(): SectionContributor[];
  get(featureKey: string): SectionContributor | undefined;
}

export function createSectionRegistry(): SectionRegistry {
  const contributors = new Map<string, SectionContributor>();
  return {
    register(contributor) {
      contributors.set(contributor.featureKey, contributor);
    },
    list() {
      return [...contributors.values()];
    },
    get(featureKey) {
      return contributors.get(featureKey);
    },
  };
}
