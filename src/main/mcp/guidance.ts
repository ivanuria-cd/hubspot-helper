/**
 * Registro de secciones de guía de operación del MCP (SPEC-0005 §15.4).
 * El contenido lo aportan los SPECs de característica; aquí solo vive la infraestructura.
 * El cuerpo es texto literal (castellano) porque es documentación para el LLM, no UI (excepción a SPEC-0000 §3).
 */

export interface GuidanceSection {
  featureKey: string;
  title: string;
  order: number;
  body: string;
}

export class GuidanceRegistry {
  private readonly sections = new Map<string, GuidanceSection>();

  register(section: GuidanceSection): void {
    if (this.sections.has(section.featureKey)) {
      throw new Error(`Sección de guía duplicada: ${section.featureKey}`);
    }
    this.sections.set(section.featureKey, section);
  }

  getAll(): GuidanceSection[] {
    return [...this.sections.values()].sort(
      (a, b) => a.order - b.order || a.featureKey.localeCompare(b.featureKey),
    );
  }

  assemble(filter?: { featureKey?: string }): string {
    const sections = filter?.featureKey
      ? this.getAll().filter((s) => s.featureKey === filter.featureKey)
      : this.getAll();
    return sections.map((s) => `## ${s.title}\n\n${s.body.trim()}`).join('\n\n');
  }

  clear(): void {
    this.sections.clear();
  }

  get size(): number {
    return this.sections.size;
  }
}

export const guidanceRegistry = new GuidanceRegistry();
