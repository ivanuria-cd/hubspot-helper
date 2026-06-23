import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import type { NewProjectInput, Project } from '@shared/types/project';

export const PROJECT_NAME_MAX_LENGTH = 80;

/** Almacenamiento mínimo de proyectos, inyectable para poder testear el servicio sin disco. */
export interface ProjectsStorage {
  get(): Project[];
  set(projects: Project[]): void;
}

interface ProjectsSchema {
  projects: Project[];
}

class ElectronProjectsStorage implements ProjectsStorage {
  private readonly store = new Store<ProjectsSchema>({
    name: 'projects',
    defaults: { projects: [] },
  });

  get(): Project[] {
    return this.store.get('projects', []);
  }

  set(projects: Project[]): void {
    this.store.set('projects', projects);
  }
}

function normalizeName(name: unknown): string {
  if (typeof name !== 'string') throw new Error('El nombre del proyecto es obligatorio');
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error('El nombre del proyecto es obligatorio');
  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    throw new Error(`El nombre no puede superar ${PROJECT_NAME_MAX_LENGTH} caracteres`);
  }
  return trimmed;
}

/** Servicio de proyectos: CRUD puro sobre un `ProjectsStorage` inyectable. */
export function createProjectsService(storage: ProjectsStorage) {
  return {
    list(): Project[] {
      return storage.get();
    },

    create(input: NewProjectInput): Project {
      const now = new Date().toISOString();
      const project: Project = {
        id: randomUUID(),
        name: normalizeName(input?.name),
        description: input?.description?.trim() || undefined,
        createdAt: now,
        lastOpenedAt: now,
        connectors: {},
      };
      storage.set([...storage.get(), project]);
      return project;
    },

    update(updated: Project): Project {
      const projects = storage.get();
      const index = projects.findIndex((p) => p.id === updated.id);
      if (index === -1) throw new Error(`Proyecto no encontrado: ${updated.id}`);
      const merged: Project = { ...updated, name: normalizeName(updated.name) };
      const next = [...projects];
      next[index] = merged;
      storage.set(next);
      return merged;
    },

    remove(id: string): void {
      storage.set(storage.get().filter((p) => p.id !== id));
    },

    /** Inserta o reemplaza un proyecto completo conservando su `id` (import .rvproj, SPEC-0013). */
    upsert(project: Project): Project {
      const merged: Project = { ...project, name: normalizeName(project.name) };
      const projects = storage.get();
      const index = projects.findIndex((p) => p.id === merged.id);
      const next = [...projects];
      if (index === -1) next.push(merged);
      else next[index] = merged;
      storage.set(next);
      return merged;
    },

    setActive(id: string): Project {
      const projects = storage.get();
      const index = projects.findIndex((p) => p.id === id);
      if (index === -1) throw new Error(`Proyecto no encontrado: ${id}`);
      const touched: Project = { ...projects[index], lastOpenedAt: new Date().toISOString() };
      const next = [...projects];
      next[index] = touched;
      storage.set(next);
      return touched;
    },
  };
}

export type ProjectsService = ReturnType<typeof createProjectsService>;

export function createElectronProjectsService(): ProjectsService {
  return createProjectsService(new ElectronProjectsStorage());
}
