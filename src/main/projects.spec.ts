import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Project } from '@shared/types/project';
import {
  createProjectsService,
  PROJECT_NAME_MAX_LENGTH,
  type ProjectsStorage,
} from './projects';

vi.mock('electron-store', () => ({
  default: class {
    private data: Record<string, unknown> = {};
    get(key: string, fallback: unknown) {
      return key in this.data ? this.data[key] : fallback;
    }
    set(key: string, value: unknown) {
      this.data[key] = value;
    }
  },
}));

function memoryStorage(initial: Project[] = []): ProjectsStorage {
  let data = [...initial];
  return {
    get: () => data,
    set: (projects) => {
      data = projects;
    },
  };
}

describe('servicio de proyectos', () => {
  let storage: ProjectsStorage;
  let service: ReturnType<typeof createProjectsService>;

  beforeEach(() => {
    storage = memoryStorage();
    service = createProjectsService(storage);
  });

  it('crea un proyecto con id, fechas y conectores vacios', () => {
    const project = service.create({ name: 'Cliente X' });
    expect(project.id).toMatch(/[0-9a-f-]{36}/);
    expect(project.name).toBe('Cliente X');
    expect(project.connectors).toEqual({});
    expect(project.createdAt).toBe(project.lastOpenedAt);
    expect(service.list()).toHaveLength(1);
  });

  it('recorta el nombre y descarta descripciones vacias', () => {
    const project = service.create({ name: '  Proyecto  ', description: '   ' });
    expect(project.name).toBe('Proyecto');
    expect(project.description).toBeUndefined();
  });

  it('rechaza nombres vacios o que exceden el limite', () => {
    expect(() => service.create({ name: '   ' })).toThrow();
    expect(() => service.create({ name: 'x'.repeat(PROJECT_NAME_MAX_LENGTH + 1) })).toThrow();
  });

  it('actualiza un proyecto existente', () => {
    const created = service.create({ name: 'Inicial' });
    const updated = service.update({ ...created, name: 'Renombrado' });
    expect(updated.name).toBe('Renombrado');
    expect(service.list()[0].name).toBe('Renombrado');
  });

  it('falla al actualizar un proyecto inexistente', () => {
    const ghost: Project = {
      id: 'no-existe',
      name: 'X',
      createdAt: '',
      lastOpenedAt: '',
      connectors: {},
    };
    expect(() => service.update(ghost)).toThrow();
  });

  it('elimina un proyecto por id', () => {
    const a = service.create({ name: 'A' });
    service.create({ name: 'B' });
    service.remove(a.id);
    const remaining = service.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('B');
  });

  it('marca el proyecto activo actualizando lastOpenedAt', () => {
    const created = service.create({ name: 'A' });
    const active = service.setActive(created.id);
    expect(active.id).toBe(created.id);
    expect(new Date(active.lastOpenedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.lastOpenedAt).getTime(),
    );
  });

  it('falla al activar un proyecto inexistente', () => {
    expect(() => service.setActive('no-existe')).toThrow();
  });
});
