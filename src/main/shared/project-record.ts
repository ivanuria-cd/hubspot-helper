/**
 * Acceso genérico a un `Record<projectId, T>` guardado bajo una clave de electron-store
 * (SPEC-0002 §23). Elimina el patrón get/set/delete repetido en los stores por proyecto
 * (HubSpot, Drive, propiedades, formularios, objetos custom). El nombre del fichero y la
 * clave no cambian: la persistencia existente sigue siendo compatible.
 */

/** Subconjunto estructural de electron-store que necesita el helper (inyectable en tests). */
export interface RecordBackend {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

export interface ProjectRecord<T> {
  get(projectId: string): T | undefined;
  set(projectId: string, value: T): void;
  delete(projectId: string): void;
}

export function createProjectRecord<T>(backend: RecordBackend, key: string): ProjectRecord<T> {
  const all = (): Record<string, T> => (backend.get(key) as Record<string, T> | undefined) ?? {};
  return {
    get(projectId: string): T | undefined {
      return all()[projectId];
    },
    set(projectId: string, value: T): void {
      const map = all();
      map[projectId] = value;
      backend.set(key, map);
    },
    delete(projectId: string): void {
      const map = all();
      delete map[projectId];
      backend.set(key, map);
    },
  };
}
